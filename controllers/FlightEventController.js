import { getDynamoClient } from "../config/Dynamodb.js";
import { extractKeyFlightInfo } from "../helper/helper.js";
import { flightDb, FlightEventModel } from "../model/FlightEventModel.js";
import { subscribeDb } from "../model/FlightSubscriptionModel.js";
import blockchainService from "../utils/FlightBlockchainService.js";
import customLogger from "../utils/Logger.js";
import { startFlightStatusMonitoring } from "./CronJobController.js";
import { decryptString } from "./EncryptController.js";

const walletAddress = process.env.WALLET_ADDRESS;

/* ========================= CREATE TABLE START ========================*/

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

    const encryptionKey = process.env.ENCRYPTION_KEY;

    const decryptedFlightDetails = flightDetails.map(flight => {
      const decryptedFlight = {
        flightNumber: flight.flightNumber,
        scheduledDepartureDate: flight.scheduledDepartureDate,
        carrierCode: flight.carrierCode,
        arrivalCity: decryptString(flight.arrivalCity, encryptionKey),
        departureCity: decryptString(flight.departureCity, encryptionKey),
        arrivalAirport: flight.arrivalAirport,
        departureAirport: flight.departureAirport,
        operatingAirlineCode: decryptString(flight.operatingAirlineCode, encryptionKey),
        arrivalGate: decryptString(flight.arrivalGate, encryptionKey),
        departureGate: decryptString(flight.departureGate, encryptionKey),
        flightStatus: decryptString(flight.flightStatus, encryptionKey),
        equipmentModel: decryptString(flight.equipmentModel, encryptionKey),
        utcTimes: {
          actualArrival: decryptString(flight.utcTimes?.actualArrival, encryptionKey),
          actualDeparture: decryptString(flight.utcTimes?.actualDeparture, encryptionKey),
          estimatedArrival: decryptString(flight.utcTimes?.estimatedArrival, encryptionKey),
          estimatedDeparture: decryptString(flight.utcTimes?.estimatedDeparture, encryptionKey),
          scheduledArrival: decryptString(flight.utcTimes?.scheduledArrival, encryptionKey),
          scheduledDeparture: decryptString(flight.utcTimes?.scheduledDeparture, encryptionKey),
          arrivalDelayMinutes: decryptString(flight.utcTimes?.arrivalDelayMinutes, encryptionKey),
          departureDelayMinutes: decryptString(flight.utcTimes?.departureDelayMinutes, encryptionKey),
          bagClaim: decryptString(flight.utcTimes?.bagClaim, encryptionKey),
        },
        status: {
          statusCode: decryptString(flight.status?.statusCode, encryptionKey),
          statusDescription: decryptString(flight.status?.statusDescription, encryptionKey),
          arrivalState: decryptString(flight.status?.arrivalState, encryptionKey),
          departureState: decryptString(flight.status?.departureState, encryptionKey),
          outUtc: decryptString(flight.status?.outUtc, encryptionKey),
          offUtc: decryptString(flight.status?.offUtc, encryptionKey),
          onUtc: decryptString(flight.status?.onUtc, encryptionKey),
          inUtc: decryptString(flight.status?.inUtc, encryptionKey),
        },
        marketedFlightSegments: flight.marketedFlightSegments, // Keep as is or decrypt if needed
        currentStatus: decryptString(flight.currentStatus, encryptionKey)
      };

      return decryptedFlight;
    });


    res.json({
      flightNumber,
      fromDate,
      toDate,
      carrierCode,
      flightDetails: decryptedFlightDetails,
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
            console.warn(`No valid flight data for flight: ${subscription.flightNumber}`);
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

    const validFlightDetails = subscriptionsData.filter((flight) => flight !== null);

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
 