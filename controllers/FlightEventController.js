import { getDynamoClient } from "../config/Dynamodb.js";
import { extractKeyFlightInfo } from "../helper/helper.js";
import { FlightEventModel } from "../model/FlightEventModel.js";
import { subscribeDb } from "../model/FlightSubscriptionModel.js";
import blockchainService from "../utils/FlightBlockchainService.js";
import customLogger from "../utils/Logger.js";
import { startFlightStatusMonitoring } from "./CronJobController.js";

const walletAddress = process.env.WALLET_ADDRESS;

/* ========================= CREATE TABLE START ========================*/

let monitoringJobs = null;

export const createFlightEventTable = async () => {
  const dynamoClient = getDynamoClient();
  try {
    await dynamoClient.createTable(FlightEventModel).promise();
    console.log("[DYNAMODB] FlightEvents table created successfully.");
    return {
      success: true,
      message: "Table created successfully.",
      tableName: FlightEventModel.TableName,
    };
  } catch (error) {
    if (error.code === "ResourceInUseException") {
      console.log(
        "[DYNAMODB] Table already exists:",
        FlightEventModel.TableName
      );
      return {
        success: true,
        message: "Table already exists.",
        tableName: FlightEventModel.TableName,
      };
    }

    console.error("[DYNAMODB] Error creating table:", {
      table: FlightEventModel.TableName,
      error: error.message,
    });

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
  const tableName = "FlightEvents";

  try {
    // Use the wrapper method to get all items
    const items = await flightDb.findMany();

    if (!items || items.length === 0) {
      console.log(`[DYNAMODB] Table ${tableName} is already empty.`);
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

    console.log(
      `[DYNAMODB] Deleted ${items.length} item(s) from ${tableName}.`
    );
    return {
      success: true,
      message: `Deleted ${items.length} item(s) from ${tableName}.`,
      tableName: tableName,
    };
  } catch (error) {
    console.error(
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
    const { fromDate, toDate, carrierCode } = req.query;

    if (!flightNumber || !fromDate || !toDate || !carrierCode) {
      return res.status(400).json({
        error:
          "Missing required parameters. Need flightNumber, fromDate, toDate, and carrierCode",
      });
    }

    const flightDetails = await blockchainService.getFlightDetailsByDateRange(
      flightNumber,
      fromDate,
      toDate,
      carrierCode
    );

    res.json({
      flightNumber,
      fromDate,
      toDate,
      carrierCode,
      flightDetails,
    });
  } catch (error) {
    customLogger.error("Error fetching flight details:", error);
    res.status(500).json({
      error: "Failed to fetch flight details",
      message: error.message,
    });
  }
};

/* ========================= CLEAR TABLE DATA END ========================*/

export const getAllFlightDetails = async (req, res) => {
  try {
    // For composite key table, we need to scan by walletAddress
    const subscribedFlights = await subscribeDb.findMany({
      walletAddress,
    });

    if (!subscribedFlights || subscribedFlights.length === 0) {
      return res.status(200).json({
        success: true,
        walletAddress,
        subscriptionCount: 0,
        subscriptions: [],
        message: "No subscribed flights found for this wallet",
      });
    }

    console.log(`Found ${subscribedFlights.length} subscribed flights`);

    // Process each subscription to get flight details
    const subscriptionsData = await Promise.all(
      subscribedFlights.map(async (subscription) => {
        let flightEventData = null;

        try {
          console.log(
            `No flight event found for: ${subscription.flightNumber}`
          );

          // Try alternative search methods if direct lookup fails
          const flightEventRecords = await flightDb.findMany({
            flightNumber: subscription.flightNumber,
          });

          if (flightEventRecords && flightEventRecords.length > 0) {
            console.log(
              `Found flight event via findMany for: ${subscription.flightNumber}`
            );
            flightEventData = extractKeyFlightInfo(
              flightEventRecords[0]?.flightData
            );
          }
        } catch (error) {
          console.error(
            `Error fetching flight events for ${subscription.flightNumber}:`,
            error
          );
        }

        return flightEventData;
      })
    );

    return res.status(200).json({
      success: true,
      message: "Subscribed flights retrieved successfully",
      flights: subscriptionsData,
    });
  } catch (error) {
    customLogger.error("Error fetching subscribed flights:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch subscribed flights",
      message: error.message,
    });
  }
};

startFlightStatusMonitoring();