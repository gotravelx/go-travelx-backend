import scheduleJob from "node-schedule";
import DynamoDbOp from "../services/DynamodbOperations.js";
import { extractKeyFlightInfo, getBlockchainData } from "../helper/helper.js";
import blockchainService from "../utils/FlightBlockchainService.js";
import customLogger from "../utils/Logger.js";
import { fetchFlightData } from "./UnitedApiController.js";
import { updateFlightEvent } from "../model/FlightEventModel.js";

// Initialize DynamoDB operations
const flightEventDb = new DynamoDbOp("FlightEvents", "flightNumber");

// Define valid flight status transitions
const validTransitions = {
  NDPT: ["OUT", "OFF", "ON", "IN", "CNCL"], // Not Departed -> Departed Gate, Cancelled
  OUT: ["OFF", "ON", "IN ", "RTBL"], // Departed Gate -> In Flight, Returned to
  OFF: ["ON", "IN", "DVRT"], // In Flight -> Landed, Diverted
  ON: ["IN", "RTFL"], // Landed -> Arrived at Gate, Returned to Airport
  IN: ["ON","NDPT"], // Arrived at Gate is final state
  CNCL: ["OUT", "OFF", "ON", "IN"], // Cancelled is final state
  RTBL: ["OUT", "CNCL"], // Returned to Gate -> Departed Gate, Cancelled
  RTFL: ["OUT"], // Returned to Airport -> Departed Gate
  DVRT: ["ON"], // Diverted -> Landed
};


export const startFlightStatusMonitoring = () => {
  // Run every 5 minutes
  const job = scheduleJob.scheduleJob("*/5 * * * *", async () => {
    try {
      customLogger.info("Starting flight status monitoring job...");
      // Process each unique flight (group by flightNumber + departureDate)
      const allFlightsInDB = await flightEventDb.findMany({});

      for (const flight of allFlightsInDB) {
        await processFlightStatusUpdate(flight);
      }

      customLogger.info("Flight status monitoring job completed successfully");
    } catch (error) {
      customLogger.error("Error in flight status monitoring job:", error);
    }
  });

  customLogger.info("Flight status monitoring job scheduled (every 5 minutes)");
  return job;
};

// Main function to process flight status update
const processFlightStatusUpdate = async (flight) => {
  try {
    customLogger.info(
      `Processing flight status update for ${flight.flightNumber} on ${flight.departureDate}`
    );

    const todayDateString = new Date().toISOString().split("T")[0];

    // Fetch flight data from United API
    const flightDataResponse = await fetchFlightData(
      Number(flight.flightNumber),
      {
        departureDate: todayDateString,
        departure: flight.departureAirport,
        arrival: flight.arrivalAirport,
      }
    );

    if (!flightDataResponse.success) {
      customLogger.warn(
        `Failed to fetch flight data for ${flight.flightNumber}: ${flightDataResponse.errorMessage}`
      );
      return;
    }

    const extractedData = extractKeyFlightInfo(flightDataResponse);
    customLogger.info(
      `Successfully fetched flight data for ${flight.flightNumber} `
    );

    // Get current flight event from database
    const currentStatus = extractedData.status.legStatus;

    customLogger.info(
      `Successfully fetched flight data for ${JSON.stringify(currentStatus)}`
    );
    // Get blockchain data (this extracts and structures the flight data)

  
    const flightNumber = flight.flightNumber;
    // Extract current flight status from blockchain data

    const flightDBDetails = await flightEventDb.findById(flightNumber);
    const prevStatus = flightDBDetails?.flightStatus?.trim() || null;
    const prevDepartureDate = flightDBDetails?.departureDate || null;

    customLogger.info(
      `Current flight status for ${flight.flightNumber}: Previous Status ${prevStatus} ---->  Current Status ${currentStatus}`
    );

    // Check for new departure date
    const isNewDepartureDate =
      !prevDepartureDate || prevDepartureDate !== flight.departureDate;

    // Check if there's a valid status transition
    const hasValidTransition = await checkFlightTransition(
      prevStatus,
      currentStatus,
      flightNumber
    );

    if (!isNewDepartureDate && !hasValidTransition) {
      customLogger.info(
        `No valid status transition and not a new departure date for ${flight.flightNumber}`
      );
      return;
    }

    customLogger.info(
      `Update allowed for ${flight.flightNumber} – New Date: ${isNewDepartureDate}, Status Changed: ${hasValidTransition} In Blockchain`
    );
    // Insert data into blockchain
    const blockchainResult = await blockchainService.storeFlightInBlockchain(flightDataResponse);
    

    if (!blockchainResult.success) {
      customLogger.error(
        `Failed to insert flight data into blockchain for ${flight.flightNumber}: ${blockchainResult.error}`
      );
      return;
    }

    customLogger.info(
      `Successfully inserted flight data into blockchain for ${flight.flightNumber}. Hash: ${blockchainResult.transactionHash}`
    );

    // Update flight event in database
    await updateFlightEvent(
      flight.flightNumber, // flightNumber
      flight.carrierCode, // carrierCode
      flight.departureDate, // departureDate
      flight.departureAirport, // departureAirport
      flight.arrivalAirport, // arrivalAirport
      currentStatus, // flightStatus (current status from API)
      blockchainResult.transactionHash,
      flightDataResponse.flightData
    );
    customLogger.info(
      `Flight event updated for ${flight.flightNumber} with status ${currentStatus}`
    );
  } catch (error) {
    customLogger.error(
      `Error processing flight status update for ${flight.flightNumber}:`,
      JSON.stringify(error, null, 2)
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
