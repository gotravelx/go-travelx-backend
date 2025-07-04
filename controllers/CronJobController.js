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
const dailyFlightSummaryDb = new DynamoDbOp("DailyFlightSummary", "summaryId");

const encryptionKey = process.env.ENCRYPTION_KEY || "default-key";

// Store last processed date
let lastProcessedDate = null;

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
  DVRT: ["ON"], // Diverted -> Landed
};

/**
 * Initialize the comprehensive flight monitoring service
 */
export const startComprehensiveFlightMonitoring = () => {
  // Initialize with current date
  lastProcessedDate = getCurrentDate();
  
  // Start real-time status monitoring (every 5 minutes)
  const statusMonitoringJob = startRealTimeStatusMonitoring();
  
  // Start date change monitoring (every hour)
  const dateChangeJob = startDateChangeMonitoring();
  
  customLogger.info("Comprehensive flight monitoring service started");
  return { statusMonitoringJob, dateChangeJob };
};

/**
 * Real-time flight status monitoring - runs every 5 minutes
 */
const startRealTimeStatusMonitoring = () => {
  const job = scheduleJob.scheduleJob("*/1 * * * *", async () => {
    try {
      customLogger.info("Starting real-time flight status monitoring...");
      
      const activeSubscriptions = await getActiveFlightSubscriptions();
      
      if (!activeSubscriptions || activeSubscriptions.length === 0) {
        customLogger.info("No active flight subscriptions found for monitoring");
        return;
      }
      
      customLogger.info(`Found ${activeSubscriptions.length} active subscriptions to monitor`);
      
      const uniqueFlights = getUniqueFlights(activeSubscriptions);
      
      for (const flight of uniqueFlights) {
        await processFlightStatusUpdate(flight);
      }
      
      customLogger.info("Real-time flight status monitoring completed");
    } catch (error) {
      customLogger.error("Error in real-time flight status monitoring:", error);
    }
  });
  
  customLogger.info("Real-time flight status monitoring scheduled (every 5 minutes)");
  return job;
};

/**
 * Date change monitoring - runs every hour
 */
const startDateChangeMonitoring = () => {
  const job = scheduleJob.scheduleJob("0 * * * *", async () => {
    try {
      customLogger.info("Starting date change monitoring...");
      
      const currentDate = getCurrentDate();
      
      if (hasDateChanged(currentDate)) {
        customLogger.info(`Date changed from ${lastProcessedDate} to ${currentDate}`);
        
        // Process end-of-day summary for previous date
        await processEndOfDaySummary(lastProcessedDate);
        
        // Update the last processed date
        lastProcessedDate = currentDate;
        
        customLogger.info("Date change processing completed");
      }
      
    } catch (error) {
      customLogger.error("Error in date change monitoring:", error);
    }
  });
  
  customLogger.info("Date change monitoring scheduled (every hour)");
  return job;
};

/**
 * Process flight status update for real-time monitoring
 */
const processFlightStatusUpdate = async (flight) => {
  try {
    customLogger.info(`Processing flight status update for ${flight.flightNumber} on ${flight.departureDate}`);
    
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
      customLogger.warn(`Failed to fetch flight data for ${flight.flightNumber}: ${flightDataResponse.errorMessage}`);
      return;
    }
    
    const extractedData = extractKeyFlightInfo(flightDataResponse);
    const currentFlightEvent = extractedData.status.legStatus;
    
    // Get blockchain data
    const blockchainData = await getBlockchainData(flightDataResponse, encryptionKey);
    
    if (!blockchainData.success && blockchainData.error) {
      customLogger.error(`Error preparing blockchain data for ${flight.flightNumber}: ${blockchainData.error}`);
      return;
    }
    
    // Extract current flight status
    let currentStatus = extractCurrentFlightStatus(blockchainData);
    currentStatus = decryptString(currentStatus, encryptionKey);
    
    customLogger.info(`Current flight status for ${flight.flightNumber}: ${currentStatus}`);
    
    // Check if there's a valid status transition
    const hasValidTransition = await checkFlightTransition(
      currentFlightEvent,
      currentStatus,
      flight.flightNumber
    );
    
    if (!hasValidTransition) {
      customLogger.info(`No valid status transition detected for ${flight.flightNumber}`);
      return;
    }
    
    customLogger.info(`Valid status transition detected for ${flight.flightNumber}, proceeding with blockchain update`);
    
    // Prepare flight data for blockchain
    const preparedData = prepareFlightDataForBlockchain(blockchainData, encryptionKey);
    
    // Insert data into blockchain
    const blockchainResult = await blockchainService.insertFlightDetails(preparedData);
    
    if (!blockchainResult.success) {
      customLogger.error(`Failed to insert flight data into blockchain for ${flight.flightNumber}: ${blockchainResult.error}`);
      return;
    }
    
    customLogger.info(`Successfully inserted flight data into blockchain for ${flight.flightNumber}. Hash: ${blockchainResult.transactionHash}`);
    
    // Update flight event in database
    await updateFlightEventInDB(flight, currentStatus, blockchainResult.transactionHash, blockchainData);
    
    // Store status change event for daily summary
    await storeStatusChangeEvent(flight, currentStatus, blockchainResult.transactionHash, blockchainData);
    
    customLogger.info(`Successfully processed flight status update for ${flight.flightNumber}`);
    
  } catch (error) {
    customLogger.error(`Error processing flight status update for ${flight.flightNumber}:`, error);
  }
};

/**
 * Process end-of-day summary when date changes
 */
const processEndOfDaySummary = async (previousDate) => {
  try {
    customLogger.info(`Processing end-of-day summary for ${previousDate}`);
    
    // Get all flights that were active on the previous date
    const activeFlights = await getFlightsForDate(previousDate);
    
    if (!activeFlights || activeFlights.length === 0) {
      customLogger.info(`No flights found for ${previousDate}`);
      return;
    }
    
    customLogger.info(`Found ${activeFlights.length} flights to summarize for ${previousDate}`);
    
    // Process each flight's daily summary
    for (const flight of activeFlights) {
      await createDailyFlightSummary(flight, previousDate);
    }
    
    customLogger.info(`End-of-day summary completed for ${previousDate}`);
    
  } catch (error) {
    customLogger.error(`Error processing end-of-day summary for ${previousDate}:`, error);
  }
};

/**
 * Create daily flight summary with all events
 */
const createDailyFlightSummary = async (flight, date) => {
  try {
    customLogger.info(`Creating daily summary for flight ${flight.flightNumber} on ${date}`);
    
    // Get all status change events for this flight on this date
    const statusChangeEvents = await getStatusChangeEventsForFlightAndDate(flight.flightNumber, date);
    
    // Get final flight data
    const finalFlightData = await getFinalFlightData(flight.flightNumber, date);
    
    // Prepare complete flight summary
    const flightSummary = {
      flightNumber: flight.flightNumber,
      carrierCode: flight.carrierCode,
      departureDate: date,
      departureAirport: flight.departureAirport,
      arrivalAirport: flight.arrivalAirport,
      allStatusChanges: statusChangeEvents,
      finalStatus: finalFlightData?.flightStatus || "UNKNOWN",
      totalEvents: statusChangeEvents.length,
      firstEvent: statusChangeEvents[0] || null,
      lastEvent: statusChangeEvents[statusChangeEvents.length - 1] || null,
      summaryCreatedAt: new Date().toISOString(),
    };
    
    // Prepare summary data for blockchain
    const summaryBlockchainData = await prepareFlightSummaryForBlockchain(flightSummary);
    
    // Insert daily summary into blockchain
    const blockchainResult = await blockchainService.insertFlightDetails(summaryBlockchainData);
    
    if (!blockchainResult.success) {
      customLogger.error(`Failed to insert daily summary into blockchain for ${flight.flightNumber}: ${blockchainResult.error}`);
      return;
    }
    
    customLogger.info(`Successfully inserted daily summary into blockchain for ${flight.flightNumber}. Hash: ${blockchainResult.transactionHash}`);
    
    // Store daily summary in database
    const summaryId = `${flight.flightNumber}-${date}`;
    const summaryRecord = {
      summaryId,
      ...flightSummary,
      blockchainHashKey: blockchainResult.transactionHash,
      summaryType: "DAILY_COMPLETE",
    };
    
    await dailyFlightSummaryDb.create(summaryRecord);
    
    customLogger.info(`Daily summary created successfully for flight ${flight.flightNumber} on ${date}`);
    
  } catch (error) {
    customLogger.error(`Error creating daily summary for flight ${flight.flightNumber} on ${date}:`, error);
  }
};

/**
 * Store individual status change events for daily summary compilation
 */
const storeStatusChangeEvent = async (flight, status, blockchainHash, blockchainData) => {
  try {
    const eventId = `${flight.flightNumber}-${flight.departureDate}-${Date.now()}`;
    
    const statusChangeEvent = {
      eventId,
      flightNumber: flight.flightNumber,
      departureDate: flight.departureDate,
      carrierCode: flight.carrierCode,
      departureAirport: flight.departureAirport,
      arrivalAirport: flight.arrivalAirport,
      flightStatus: status,
      blockchainHashKey: blockchainHash,
      flightData: blockchainData.extractedFlightData || {},
      eventTimestamp: new Date().toISOString(),
      eventType: "STATUS_CHANGE",
    };
    
    // Store in a separate table for status change events
    const statusChangeDb = new DynamoDbOp("FlightStatusChangeEvents", "eventId");
    await statusChangeDb.create(statusChangeEvent);
    
    customLogger.info(`Status change event stored for ${flight.flightNumber}: ${status}`);
    
  } catch (error) {
    customLogger.error(`Error storing status change event for ${flight.flightNumber}:`, error);
  }
};

/**
 * Get all status change events for a flight and date
 */
const getStatusChangeEventsForFlightAndDate = async (flightNumber, date) => {
  try {
    const statusChangeDb = new DynamoDbOp("FlightStatusChangeEvents", "eventId");
    const events = await statusChangeDb.findMany({});
    
    return events.filter(event => 
      event.flightNumber === flightNumber && 
      event.departureDate === date
    ).sort((a, b) => new Date(a.eventTimestamp) - new Date(b.eventTimestamp));
    
  } catch (error) {
    customLogger.error(`Error getting status change events for ${flightNumber} on ${date}:`, error);
    return [];
  }
};

/**
 * Prepare flight summary for blockchain insertion
 */
const prepareFlightSummaryForBlockchain = async (flightSummary) => {
  try {
    // Create a comprehensive summary structure for blockchain
    const summaryData = {
      flightNumber: flightSummary.flightNumber,
      departureDate: flightSummary.departureDate,
      summaryType: "DAILY_COMPLETE",
      totalEvents: flightSummary.totalEvents,
      allStatusChanges: flightSummary.allStatusChanges.map(event => ({
        status: event.flightStatus,
        timestamp: event.eventTimestamp,
        blockchainHash: event.blockchainHashKey,
      })),
      finalStatus: flightSummary.finalStatus,
      flightRoute: {
        departure: flightSummary.departureAirport,
        arrival: flightSummary.arrivalAirport,
      },
      summaryCreatedAt: flightSummary.summaryCreatedAt,
    };
    
    // Encrypt summary data
    const encryptedSummary = JSON.stringify(summaryData);
    
    return {
      extractedFlightData: summaryData,
      blockchainStatusData: [flightSummary.finalStatus],
      encryptedData: encryptedSummary,
    };
    
  } catch (error) {
    customLogger.error("Error preparing flight summary for blockchain:", error);
    throw error;
  }
};

// Helper functions (reused from original code)
const getCurrentDate = () => {
  return new Date().toISOString().split('T')[0];
};

const hasDateChanged = (currentDate) => {
  return lastProcessedDate !== currentDate;
};

const getActiveFlightSubscriptions = async () => {
  try {
    const subscriptions = await flightSubscriptionDb.findMany({});
    return subscriptions.filter(subscription => subscription.isSubscriptionActive);
  } catch (error) {
    customLogger.error("Error fetching active flight subscriptions:", error);
    return [];
  }
};

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

const extractCurrentFlightStatus = (blockchainData) => {
  if (blockchainData.extractedFlightData?.currentFlightStatus) {
    return blockchainData.extractedFlightData.currentFlightStatus;
  }
  
  if (blockchainData.blockchainStatusData?.length > 0) {
    return blockchainData.blockchainStatusData[0];
  }
  
  return "NDPT";
};

const checkFlightTransition = async (currentFlightEvent, newStatus, flightNumber) => {
  try {
    if (!currentFlightEvent) {
      customLogger.info(`New flight event for ${flightNumber}, status: ${newStatus}`);
      return true;
    }
    
    const currentStatus = currentFlightEvent.flightStatus || "NDPT";
    
    if (currentStatus === newStatus) {
      customLogger.info(`No status change for ${flightNumber}, current status: ${currentStatus}`);
      return false;
    }
    
    const validNextStatuses = validTransitions[currentStatus] || [];
    
    if (!validNextStatuses.includes(newStatus)) {
      customLogger.warn(`Invalid status transition for ${flightNumber}: ${currentStatus} -> ${newStatus}`);
      return false;
    }
    
    customLogger.info(`Valid status transition for ${flightNumber}: ${currentStatus} -> ${newStatus}`);
    return true;
  } catch (error) {
    customLogger.error(`Error checking flight transition for ${flightNumber}:`, error);
    return false;
  }
};

const updateFlightEventInDB = async (flight, currentStatus, blockchainHash, blockchainData) => {
  try {
    const extractedData = blockchainData.extractedFlightData || {};
    
    const updateData = {
      carrierCode: flight.carrierCode || extractedData.carrierCode,
      departureDate: flight.departureDate,
      departureAirport: flight.departureAirport || extractedData.departureAirport,
      arrivalAirport: flight.arrivalAirport || extractedData.arrivalAirport,
      flightStatus: currentStatus,
      blockchainHashKey: blockchainHash,
      flightData: extractedData,
      updatedAt: new Date().toISOString(),
    };
    
    const existingEvent = await flightEventDb.findOne({ flightNumber: flight.flightNumber });
    
    if (existingEvent) {
      await flightEventDb.updateById(flight.flightNumber, updateData);
    } else {
      updateData.createdAt = new Date().toISOString();
      await flightEventDb.create(updateData);
    }
    
    customLogger.info(`Flight event updated in DB for ${flight.flightNumber} with status ${currentStatus}`);
  } catch (error) {
    customLogger.error(`Error updating flight event in DB for ${flight.flightNumber}:`, error);
    throw error;
  }
};

const getFlightsForDate = async (date) => {
  try {
    const allFlights = await flightEventDb.findMany({});
    return allFlights.filter(flight => flight.departureDate === date);
  } catch (error) {
    customLogger.error(`Error getting flights for date ${date}:`, error);
    return [];
  }
};

const getFinalFlightData = async (flightNumber, date) => {
  try {
    const flight = await flightEventDb.findOne({ flightNumber });
    return flight && flight.departureDate === date ? flight : null;
  } catch (error) {
    customLogger.error(`Error getting final flight data for ${flightNumber} on ${date}:`, error);
    return null;
  }
};

/**
 * Manual trigger functions
 */
export const manuallyTriggerEndOfDaySummary = async (date) => {
  try {
    customLogger.info(`Manually triggering end-of-day summary for ${date}`);
    await processEndOfDaySummary(date);
    customLogger.info(`Manual end-of-day summary completed for ${date}`);
  } catch (error) {
    customLogger.error(`Error in manual end-of-day summary for ${date}:`, error);
    throw error;
  }
};

export const getDailyFlightSummary = async (flightNumber, date) => {
  try {
    const summaryId = `${flightNumber}-${date}`;
    const summary = await dailyFlightSummaryDb.findOne({ summaryId });
    return summary;
  } catch (error) {
    customLogger.error(`Error getting daily flight summary for ${flightNumber} on ${date}:`, error);
    return null;
  }
};

startComprehensiveFlightMonitoring();