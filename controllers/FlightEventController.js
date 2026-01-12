
import { getDynamoClient } from "../config/Dynamodb.js";
import { extractKeyFlightInfo } from "../helper/helper.js";
import { flightDb, FlightEventModel } from "../model/FlightEventModel.js";
import { subscribeDb } from "../model/FlightSubscriptionModel.js";
import blockchainService from "../utils/FlightBlockchainService.js";
import logger from "../utils/Logger.js";
import { startFlightStatusMonitoring } from "./CronJobController.js";
const walletAddress = process.env.WALLET_ADDRESS;

/* ========================= CREATE TABLE START ========================*/

export const createFlightEventTable = async () => {
  const dynamoClient = getDynamoClient();
  try {
    await dynamoClient.createTable(FlightEventModel).promise();
    return {
      success: true,
      message: "Table created successfully.",
      tableName: FlightEventModel.TableName,
    };
  } catch (error) {
    if (error.code === "ResourceInUseException") {
      return {
        success: true,
        message: "Table already exists.",
        tableName: FlightEventModel.TableName,
      };
    }
    return {
      success: false,
      message: "Failed to create table.",
      error: error.message,
    };
  }
};

/* ========================= CREATE TABLE END ========================*/

/* ========================= CLEAR TABLE DATA START ========================*/

export const clearFlightEventTableData = async () => {
  const tableName = process.env.FLIGHT_EVENTS_TABLE || "FlightEvents";

  try {
    // Use the wrapper method to get all items
    const items = await flightDb.findMany();

    if (!items || items.length === 0) {
      logger.info(`Info: [DYNAMODB] Table ${tableName} is already empty.`);
      return {
        success: true,
        message: "Table is already empty.",
        tableName: tableName,
      };
    }

    // Delete all items one by one using the wrapper's deleteItem method
    for (const item of items) {
      await flightDb.deleteItem(item);
    }

    logger.info(
      `INFO: [DYNAMODB] Deleted ${items.length} item(s) from ${tableName}.`
    );
    return {
      success: true,
      message: `Deleted ${items.length} item(s) from ${tableName}.`,
      tableName: tableName,
    };
  } catch (error) {
    logger.error(
      `[DYNAMODB] Error clearing table data from ${tableName}:`,
      error.message
    );
    return {
      success: false,
      message: "Failed to clear table data.",
      error: error.message,
    };
  }
};

/* ========================= CLEAR TABLE DATA END ========================*/

/* ========================= CLEAR TABLE DATA START ========================*/

export const getHistoricalData = async (req, res) => {
  try {
    const { flightNumber } = req.params;
    const { fromDate, toDate, carrierCode, departureAirport, arrivalAirport } =
      req.query;

    if (!flightNumber || !fromDate || !toDate || !carrierCode) {
      return res.status(400).json({
        error:
          "Missing required parameters. Need flightNumber, fromDate, toDate, and carrierCode",
      });
    }


    // Add a timeout to the blockchain service call
    const TIMEOUT_MS = 25000; // 25 seconds
    const flightDetails = await Promise.race([
      blockchainService.getFlightHistory(
        flightNumber,
        fromDate,
        toDate,
        carrierCode,
        arrivalAirport,
        departureAirport
      ),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Request timed out after 25 seconds")),
          TIMEOUT_MS
        )
      ),
    ]);

    res.json({
      flightNumber,
      fromDate,
      toDate,
      carrierCode,
      flightDetails: flightDetails,
    });
  } catch (error) {
    logger.error("Error fetching flight details:", error);
    const statusCode = error.message.includes("timed out") ? 408 : 500;
    res.status(statusCode).json({
      error: "Failed to fetch flight details",
      message: error.message,
    });
  }
};

/* ========================= CLEAR TABLE DATA END ========================*/

export const getAllFlightDetails = async (req, res) => {
  try {
    // Fetch only active subscriptions
    const subscribedFlights = await subscribeDb.findMany({
      walletAddress,
      isSubscriptionActive: true,
    });

    if (!subscribedFlights || subscribedFlights.length === 0) {
      return res.status(200).json({
        success: true,
        walletAddress,
        flightCount: 0,
        flights: [],
        message: "No active subscribed flights found for this wallet",
      });
    }

    const subscriptionsData = await Promise.all(
      subscribedFlights.map(async (subscription) => {
        try {
          // Try to find exact match
          let flightEvent = await flightDb.findOne({
            flightNumber: subscription.flightNumber,
          });

          // If not found, fallback to findMany
          if (!flightEvent) {
            const flightEventRecords = await flightDb.findMany({
              flightNumber: subscription.flightNumber,
            });

            if (flightEventRecords && flightEventRecords.length > 0) {
              flightEvent = flightEventRecords[0];
            }
          }

          if (!flightEvent || !flightEvent.flightData) {
            console.warn(
              `No valid flight data for flight: ${subscription.flightNumber}`
            );
            return null;
          }

          const flightEventData = extractKeyFlightInfo({
            flightData: flightEvent.flightData,
          });

          return {
            ...flightEventData,
            blockchainHashKey: flightEvent.blockchainHashKey || null,
          };
        } catch (error) {
          console.error(
            `Error processing flight ${subscription.flightNumber}:`,
            error
          );
          return null;
        }
      })
    );

    const validFlightDetails = subscriptionsData.filter(
      (flight) => flight !== null
    );

    return res.status(200).json({
      success: true,
      message: "Active subscribed flight details retrieved successfully",
      walletAddress,
      flightCount: validFlightDetails.length,
      flights: validFlightDetails,
    });
  } catch (error) {
    console.error("Error fetching subscribed flights:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch subscribed flights",
      message: error.message,
    });
  }
};

startFlightStatusMonitoring();
