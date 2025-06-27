import { getDynamoClient } from "../config/Dynamodb.js";
import { FlightEventModel } from "../model/FlightEventModel.js";
import DynamoDbOp from "../services/DynamodbOperations.js";
import blockchainService from "../utils/FlightBlockchainService.js";
import customLogger from "../utils/Logger.js";
import { startFlightStatusMonitoring } from "./CronJobController.js";

const flightEvent = new DynamoDbOp("FlightEvents", ["flightNumber", "departureDate"]);
/* ========================= CREATE TABLE START ========================*/


export const createFlightEventTable = async () => {
  const dynamoClient = getDynamoClient();
   try {
      await dynamoClient.createTable(FlightEventModel).promise();
      console.log("[DYNAMODB] FlightEvents table created successfully.");
      return {
        success: true,
        message: "Table created successfully.",
        tableName: FlightEventModel.TableName
      };
    } catch (error) {
      if (error.code === "ResourceInUseException") {
        console.log("[DYNAMODB] Table already exists:", FlightEventModel.TableName);
        return {
          success: true,
          message: "Table already exists.",
          tableName: FlightEventModel.TableName
        };
      }
  
      console.error("[DYNAMODB] Error creating table:", {
        table: FlightEventModel.TableName,
        error: error.message
      });
  
      return {
        success: false,
        message: "Failed to create table.",
        error: error.message
      };
    }
}; 

/* ========================= CREATE TABLE END ========================*/

/* ========================= CLEAR TABLE DATA START ========================*/

export const clearFlightEventTableData = async () => {
  const tableName = "FlightEvents";

  try {
    // Use the wrapper method to get all items
    const items = await flightEvent.findMany();

    if (!items || items.length === 0) {
      console.log(`[DYNAMODB] Table ${tableName} is already empty.`);
      return {
        success: true,
        message: "Table is already empty.",
        tableName: tableName
      };
    }

    // Delete all items one by one using the wrapper's deleteItem method
    for (const item of items) {
      await flightEvent.deleteItem(item);
    }

    console.log(`[DYNAMODB] Deleted ${items.length} item(s) from ${tableName}.`);
    return {
      success: true,
      message: `Deleted ${items.length} item(s) from ${tableName}.`,
      tableName: tableName
    };
  } catch (error) {
    console.error(`[DYNAMODB] Error clearing table data from ${tableName}:`, error.message);
    return {
      success: false,
      message: "Failed to clear table data.",
      error: error.message
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

startFlightStatusMonitoring();
