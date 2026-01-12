import scheduleJob from "node-schedule";
import DynamoDbOp from "../services/DynamodbOperations.js";
import { extractKeyFlightInfo, getBlockchainData } from "../helper/helper.js";
import blockchainService from "../utils/FlightBlockchainService.js";
import customLogger from "../utils/Logger.js";
import { fetchFlightData } from "./UnitedApiController.js";
import { updateFlightEvent } from "../model/FlightEventModel.js";

// Initialize DynamoDB operations
const FLIGHT_EVENTS_TABLE = process.env.FLIGHT_EVENTS_TABLE || "FlightEvents";
const flightEventDb = new DynamoDbOp(FLIGHT_EVENTS_TABLE, "flightNumber");

// Define valid flight status transitions
const validTransitions = {
  NDPT: ["OUT", "OFF", "ON", "IN", "CNCL"], // Not Departed -> Departed Gate, Cancelled
  OUT: ["OFF", "ON", "IN ", "RTBL"], // Departed Gate -> In Flight, Returned to
  OFF: ["ON", "IN", "DVRT"], // In Flight -> Landed, Diverted
  ON: ["IN", "RTFL"], // Landed -> Arrived at Gate, Returned to Airport
  IN: ["ON", "NDPT"], // Arrived at Gate is final state
  CNCL: ["OUT", "OFF", "ON", "IN"], // Cancelled is final state
  RTBL: ["OUT", "CNCL"], // Returned to Gate -> Departed Gate, Cancelled
  RTFL: ["OUT"], // Returned to Airport -> Departed Gate
  DVRT: ["ON"], // Diverted -> Landed
};


export const startFlightStatusMonitoring = () => {
  const job = scheduleJob?.scheduleJob("*/1 * * * *", async () => {
    try {
      customLogger.info("Starting flight status monitoring job...");

      // Get all flights from DB
      const allFlightsInDB = await flightEventDb.findMany({});

      const flightsToStore = [];

      for (const flight of allFlightsInDB) {
        const preparedFlight = await processFlightStatusUpdate(flight);
        console.log("preparedFlight", preparedFlight)
        if (preparedFlight) {
          flightsToStore.push(preparedFlight);
        }
      }

      // Store multiple flights in blockchain in a single batch
      if (flightsToStore?.length > 0) {
        try {
          // Map data to what the contract expects
          const blockchainInputs = flightsToStore.map(f => ({
            flightDetails: f.flightDetailsArray,
            compressedFlightInformation: f.compressedFlightData
          }));

          const batchResult = await blockchainService.storeMultipleFlightDetails(
            blockchainInputs
          );

          customLogger.info(
            `Successfully stored ${flightsToStore?.length} flights in blockchain. Transaction Hash: ${batchResult.transactionHash}`
          );

          // Update DB after successful blockchain insertion
          for (const flight of flightsToStore) {
            await updateFlightEvent(
              flight?.flightNumber,
              flight?.carrierCode,
              flight?.departureDate,
              flight?.departureAirport,
              flight?.arrivalAirport,
              flight?.currentStatus,
              batchResult?.transactionHash,
              flight?.flightDataFromAPI
            );
            customLogger.info(
              `Flight event updated for ${flight.flightNumber} with status ${flight?.currentStatus}`
            );
          }
        } catch (error) {
          customLogger.error(
            "Error storing multiple flights in blockchain:",
            error
          );
        }
      }

      customLogger.info("Flight status monitoring job completed successfully");
    } catch (error) {
      customLogger.error(
        `Error in flight status monitoring job: ${error}`
      );
    }
  });

  customLogger.info(
    "Flight status monitoring job scheduled (every 1 minute)"
  );
  return job;
};

// Main function to process flight status update
const processFlightStatusUpdate = async (flight) => {
  try {
    customLogger.info(
      `Processing flight status update for ${flight?.flightNumber} on ${flight?.departureDate}`
    );

    const todayDateString = new Date().toISOString().split("T")[0];

    // Fetch flight data from United API
    const flightDataResponse = await fetchFlightData(
      Number(flight.flightNumber),
      {
        departureDate: todayDateString,
        departure: flight?.departureAirport,
        arrival: flight?.arrivalAirport,
        carrier: flight?.carrierCode
      }
    );

    if (!flightDataResponse.success) {
      customLogger.warn(
        `Failed to fetch flight data for ${flight.flightNumber}: ${flightDataResponse.errorMessage}`
      );
      return;
    }

    const extractedData = extractKeyFlightInfo(flightDataResponse);
    const currentStatus = extractedData.status.legStatus;

    const flightDBDetails = await flightEventDb.findById(flight.flightNumber);
    const prevStatus = flightDBDetails?.flightStatus?.trim() || null;
    const prevDepartureDate = flightDBDetails?.departureDate || null;

    customLogger.info(
      `Current flight status for ${flight.flightNumber}: Previous Status ${prevStatus} ---->  Current Status ${currentStatus}`
    );

    // const isNewDepartureDate =
    //   !prevDepartureDate || prevDepartureDate !== flight.departureDate;

    // const hasValidTransition = await checkFlightTransition(
    //   prevStatus,
    //   currentStatus,
    //   flight.flightNumber
    // );

    // if (!isNewDepartureDate && !hasValidTransition) {
    //   return;
    // }

    // customLogger.info(
    //   `Update allowed for ${flight.flightNumber} – New Date: ${isNewDepartureDate}, Status Changed: ${hasValidTransition}`
    // );

    // Prepare data for blockchain
    const blockchainData = await getBlockchainData(flightDataResponse);

    if (!blockchainData.success) {
      customLogger.error(
        `Failed to prepare flight data for blockchain for ${flight.flightNumber}: ${blockchainData.error}`
      );
      return;
    }

    // Return data for batch storage
    return {
      flightNumber: flight.flightNumber,
      carrierCode: flight.carrierCode,
      departureDate: flight.departureDate,
      departureAirport: flight.departureAirport,
      arrivalAirport: flight.arrivalAirport,
      currentStatus: currentStatus,
      flightDetailsArray: blockchainData.flightDetailsArray,
      compressedFlightData: blockchainData.compressedFlightData,
      flightDataFromAPI: flightDataResponse.flightData
    };
  } catch (error) {
    customLogger.error(
      `Error processing flight status update for ${flight.flightNumber}:`,
      error
    );
  }
};

// Helper function to check if flight has valid status transition
const checkFlightTransition = async (
  prevStatus,
  currentStatus,
  flightNumber
) => {
  try {
    // Handle missing current status (e.g., new entry)
    if (!currentStatus) {
      customLogger.info(
        `New flight event for ${flightNumber}, current status is missing. Assuming valid transition.`
      );
      return true;
    }

    // Trim whitespace from status strings
    const prev = prevStatus?.trim();
    const current = currentStatus?.trim();

    // Check if status has actually changed
    if (prev === current) {
      customLogger.info(
        `No status change for ${flightNumber}. Current status remains: ${current}`
      );
      return false;
    }

    // Look up valid next statuses from the previous status
    const validNextStatuses = validTransitions[prev] || [];

    if (!validNextStatuses.includes(current)) {
      customLogger.warn(
        `Invalid status transition for ${flightNumber}: ${prev} -> ${current}`
      );
      return false;
    }

    customLogger.info(
      `Valid status transition for ${flightNumber}: ${prev} -> ${current}`
    );
    return true;
  } catch (error) {
    customLogger.error(
      `Error checking flight transition for ${flightNumber}:`,
      error
    );
    return false;
  }
};
