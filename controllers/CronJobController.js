import scheduleJob from "node-schedule";
import DynamoDbOp from "../services/DynamodbOperations.js";
import { extractKeyFlightInfo, getBlockchainData } from "../helper/helper.js";
import {
  decryptFlightData,
  decryptString,
  prepareFlightDataForBlockchain,
} from "./EncryptController.js";
import blockchainService from "../utils/FlightBlockchainService.js";
import customLogger from "../utils/Logger.js";
import { fetchFlightData } from "./UnitedApiController.js";

// Initialize DynamoDB operations
const flightEventDb = new DynamoDbOp("FlightEvents", "flightNumber");
const flightSubscriptionDb = new DynamoDbOp("FlightSubscriptions", [
  "walletAddress",
  "flightNumber",
]);

const encryptionKey = process.env.ENCRYPTION_KEY || "default-key";

// Define valid flight status transitions
const validTransitions = {
  NDPT: ["OUT", "CNCL"], // Not Departed -> Departed Gate, Cancelled
  OUT: ["OFF", "RTBL"], // Departed Gate -> In Flight, Returned to Gate
  OFF: ["ON", "DVRT"], // In Flight -> Landed, Diverted
  ON: ["IN", "RTFL"], // Landed -> Arrived at Gate, Returned to Airport
  IN: [], // Arrived at Gate is final state
  CNCL: [], // Cancelled is final state
  RTBL: ["OUT", "CNCL"], // Returned to Gate -> Departed Gate, Cancelled
  RTFL: ["OUT"], // Returned to Airport -> Departed Gate
  DVRT: ["ON"] // Diverted -> Landed
};

export const startFlightStatusMonitoring = () => {
  // Run every 5 minutes
  const job = scheduleJob.scheduleJob("*/1 * * * *", async () => {
    try {
      customLogger.info("Starting flight status monitoring job...");

      // Get all active flight subscriptions that need monitoring
      const activeSubscriptions = await getActiveFlightSubscriptions();

      if (!activeSubscriptions || activeSubscriptions.length === 0) {
        customLogger.info(
          "No active flight subscriptions found for monitoring"
        );
        return;
      }

      customLogger.info(
        `Found ${activeSubscriptions.length} active flight subscriptions to monitor`
      );

      // Process each unique flight (group by flightNumber + departureDate)
      const uniqueFlights = getUniqueFlights(activeSubscriptions);

      for (const flight of uniqueFlights) {
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


export const startDayFlightMonitoring = () => {
  // Run every 5 minutes
  const job = scheduleJob.scheduleJob("*/1 * * * *", async () => {
    try {
      customLogger.info("Starting flight status monitoring job...");

      // Get all active flight subscriptions that need monitoring
      const activeSubscriptions = await getActiveFlightSubscriptions();

      if (!activeSubscriptions || activeSubscriptions.length === 0) {
        customLogger.info(
          "No active flight subscriptions found for monitoring"
        );
        return;
      }

      customLogger.info(
        `Found ${activeSubscriptions.length} active flight subscriptions to monitor`
      );

      // Process each unique flight (group by flightNumber + departureDate)
      const uniqueFlights = getUniqueFlights(activeSubscriptions);

      for (const flight of uniqueFlights) {
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


// Helper function to get active flight subscriptions
const getActiveFlightSubscriptions = async () => {
  try {
    // Get all subscriptions
    const subscriptions = await flightSubscriptionDb.findMany({});

    // Filter for active subscriptions
    const activeSubscriptions = subscriptions.filter((subscription) => {
      // Check if subscription is active
      if (!subscription.isSubscriptionActive) {
        return false;
      }

      // Check if departure date is today or in the future
      const departureDate = new Date(subscription.departureDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return departureDate >= today;
    });

    return activeSubscriptions;
  } catch (error) {
    customLogger.error("Error fetching active flight subscriptions:", error);
    return [];
  }
};

// Helper function to get unique flights from subscriptions
const getUniqueFlights = (subscriptions) => {
  const flightMap = new Map();

  subscriptions.forEach((subscription) => {
    const key = `${subscription.flightNumber}-${subscription.departureDate}`;
    if (!flightMap.has(key)) {
      flightMap.set(key, {
        flightNumber: subscription.flightNumber,
        departureDate: subscription.departureDate,
        carrierCode: subscription.carrierCode,
        departureAirport: subscription.departureAirport,
        arrivalAirport: subscription.arrivalAirport,
        subscribers: [subscription.walletAddress],
      });
    } else {
      flightMap.get(key).subscribers.push(subscription.walletAddress);
    }
  });

  return Array.from(flightMap.values());
};

// Main function to process flight status update
const processFlightStatusUpdate = async (flight) => {
  try {
    customLogger.info(
      `Processing flight status update for ${flight.flightNumber} on ${flight.departureDate}`
    );

    // Fetch flight data from United API
    const flightDataResponse = await fetchFlightData(
      Number(flight.flightNumber),
      {
        departureDate: flight.departureDate,
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

    const extractedData  =  extractKeyFlightInfo(flightDataResponse);
    customLogger.info(
      `Successfully fetched flight data for ${flight.flightNumber} `
    );
    // get updated flight status from united api



    // Get current flight event from database
    const currentFlightEvent = extractedData.status.legStatus;

    customLogger.info(
      `Successfully fetched flight data for ${JSON.stringify(
        currentFlightEvent
      )}`
    );
    // Get blockchain data (this extracts and structures the flight data)

    const blockchainData = await getBlockchainData(
      flightDataResponse,
      encryptionKey
    );

    if (!blockchainData.success && blockchainData.error) {
      customLogger.error(
        `Error preparing blockchain data for ${flight.flightNumber}: ${blockchainData.error}`
      );
      return;
    }

    // Extract current flight status from blockchain data
    let currentStatus = extractCurrentFlightStatus(blockchainData);

    currentStatus = decryptString(currentStatus, encryptionKey);
    customLogger.info(
      `Current flight status for ${flight.flightNumber}: ${currentStatus}`
    );

    // Check if there's a valid status transition
    const hasValidTransition = await checkFlightTransition(
      currentFlightEvent,
      currentStatus,
      flight.flightNumber
    );

    if (!hasValidTransition) {
      customLogger.info(
        `No valid status transition detected for ${flight.flightNumber}`
      );
      return;
    }

    customLogger.info(
      `Valid status transition detected for ${flight.flightNumber}, proceeding with blockchain update`
    );

    // Prepare flight data for blockchain
    const preparedData = prepareFlightDataForBlockchain(
      blockchainData,
      encryptionKey
    );

    // Insert data into blockchain
    const blockchainResult = await blockchainService.insertFlightDetails(
      preparedData
    );

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
      flight,
      currentStatus,
      blockchainResult.transactionHash,
      blockchainData
    );

    customLogger.info(
      `Successfully updated flight event for ${flight.flightNumber}`
    );
  } catch (error) {
    customLogger.error(
      `Error processing flight status update for ${flight.flightNumber}:`,
      error
    );
  }
};

// Helper function to extract current flight status from blockchain data
const extractCurrentFlightStatus = (blockchainData) => {
  // The blockchain data should contain the current flight status
  if (
    blockchainData.extractedFlightData &&
    blockchainData.extractedFlightData.currentFlightStatus
  ) {
    return blockchainData.extractedFlightData.currentFlightStatus;
  }

  // Fallback - look for status in the prepared data
  if (
    blockchainData.blockchainStatusData &&
    blockchainData.blockchainStatusData.length > 0
  ) {
    return blockchainData.blockchainStatusData[0];
  }

  return "NDPT"; // Default to not departed
};

// Helper function to check if flight has valid status transition
const checkFlightTransition = async (
  currentFlightEvent,
  newStatus,
  flightNumber
) => {
  try {
    // If no current flight event exists, any status is valid (new flight)
    if (!currentFlightEvent) {
      customLogger.info(
        `New flight event for ${flightNumber}, status: ${newStatus}`
      );
      return true;
    }

    const currentStatus = currentFlightEvent.flightStatus || "NDPT";

    // Check if status has actually changed
    if (currentStatus === newStatus) {
      customLogger.info(
        `No status change for ${flightNumber}, current status: ${currentStatus}`
      );
      return false;
    }

    const validNextStatuses = validTransitions[currentStatus] || [];

    if (!validNextStatuses.includes(newStatus)) {
      customLogger.warn(
        `Invalid status transition for ${flightNumber}: ${currentStatus} -> ${newStatus}`
      );
      return false;
    }

    customLogger.info(
      `Valid status transition for ${flightNumber}: ${currentStatus} -> ${newStatus}`
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

// FIXED: Helper function to update flight event in database
const updateFlightEvent = async (
  flight,
  currentStatus,
  blockchainHash,
  blockchainData
) => {
  try {
    // Extract flight data from blockchain data
    const extractedData = blockchainData.extractedFlightData || {};

    const updateData = {
      flightNumber: flight.flightNumber,
      carrierCode: flight.carrierCode || extractedData.carrierCode,
      departureDate: flight.departureDate,
      departureAirport:
        flight.departureAirport || extractedData.departureAirport,
      arrivalAirport: flight.arrivalAirport || extractedData.arrivalAirport,
      flightStatus: currentStatus,
      blockchainHashKey: blockchainHash,
      flightData: blockchainData, // Store the complete blockchain data
    };

    // Check if flight event exists
    const existingEvent = await flightEventDb.findOne({
      flightNumber: flight.flightNumber,
    });

    if (existingEvent) {
      // Update existing event
      updateData.updatedAt = new Date().toISOString();
      await flightEventDb.updateById(flight.flightNumber, updateData);
      customLogger.info(
        `Flight event updated successfully for ${flight.flightNumber} with status ${currentStatus}`
      );
    } else {
      // Create new event
      updateData.createdAt = new Date().toISOString();
      await flightEventDb.create(updateData);
      customLogger.info(
        `Flight event created successfully for ${flight.flightNumber} with status ${currentStatus}`
      );
    }
  } catch (error) {
    customLogger.error(
      `Error updating flight event for ${flight.flightNumber}:`,
      error
    );
    throw error;
  }
};