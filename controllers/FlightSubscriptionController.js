import e from "express";
import { getDynamoClient } from "../config/Dynamodb.js";
import { extractKeyFlightInfo, getBlockchainData } from "../helper/helper.js";
import {   getFlightEventByNumber } from "../model/FlightEventModel.js";
import { FlightSubscriptionModel } from "../model/FlightSubscriptionModel.js";
import DynamoDbOp from "../services/DynamodbOperations.js";
import blockchainService from "../utils/FlightBlockchainService.js";
import customLogger from "../utils/Logger.js";
import { fetchFlightData } from "./UnitedApiController.js";

const encryptionKey = process.env.ENCRYPTION_KEY;
const walletAddress = process.env.WALLET_ADDRESS;

const flightEvent = new DynamoDbOp("FlightEvents", "flightNumber");
const flightSubscription = new DynamoDbOp("FlightSubscriptions", ["walletAddress", "flightNumber"]);

/* ====================== Create Flight Subscription Api =============================== */

export const createFlightSubscriptionTable = async (req, res) => {
  const dynamoClient = getDynamoClient();
  try {
    await dynamoClient.createTable(FlightSubscriptionModel).promise();
    console.log("[DYNAMODB] FlightSubscriptions table created successfully.");

    return res.status(201).json({
      success: true,
      message: "Table created successfully.",
      tableName: FlightSubscriptionModel.TableName,
    });
  } catch (error) {
    if (error.code === "ResourceInUseException") {
      console.log(
        "[DYNAMODB] Table already exists:",
        FlightSubscriptionModel.TableName
      );

      return res.status(200).json({
        success: true,
        message: "Table already exists.",
        tableName: FlightSubscriptionModel.TableName,
      });
    }

    console.error("[DYNAMODB] Error creating table:", {
      table: FlightSubscriptionModel.TableName,
      error: error.message,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to create table.",
      error: error.message,
    });
  }
};

/* ====================== Create Flight Subscription Api =============================== */

/* ====================== Clear Flight Subscription Api =============================== */

export const clearFlightSubscriptionTableData = async (req, res) => {
  const tableName = "FlightSubscriptions";

  try {
    const items = await flightSubscription.findMany();

    if (!items || items.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Table is already empty.",
      });
    }

    // Delete all items one by one using the new deleteItem method
    for (const item of items) {
      await flightSubscription.deleteItem(item); // Or use deleteOne with extracted key
    }

    return res.status(200).json({
      success: true,
      message: `Deleted ${items.length} item(s) from table ${tableName}.`,
    });
  } catch (error) {
    console.error(`[DYNAMODB] Error clearing table data:`, error);

    return res.status(500).json({
      success: false,
      message: "Failed to clear table data.",
      error: error.message,
    });
  }
};

/* ====================== Clear Flight Subscription Api =============================== */

/* ====================== Add Flight Subscription Api =============================== */

export const addFlightSubscription = async (req, res) => {
  try {
    const {
      flightNumber,
      scheduledDepartureDate,
      departureAirport,
      carrierCode,
    } = req.body;

    if (
      !flightNumber || !scheduledDepartureDate || !departureAirport || 
      !carrierCode 
    ) {
      return res.status(400).json({
        error: "Missing required parameters",
      });
    }

    // Step 1: Fetch external flight data
    const flightData = await fetchFlightData(
      flightNumber,
      scheduledDepartureDate,
      departureAirport
    );

    if (!flightData) {
      return res.status(404).json({
        error: "Flight data not found",
      });
    }

    // Extract arrival airport from flight data
    const arrivalAirport = flightData?.flightLegs?.[0]?.OperationalFlightSegments?.ArrivalAirport?.IATACode || flightData?.flightLegs?.[1]?.ArrivalAirport?.IATACode;

    // Step 2: Check DynamoDB for existing flight
    const existingFlight = await getFlightEventByNumber(
      flightNumber,
      scheduledDepartureDate
    );

    let blockchainHashKey;

    if (!existingFlight) {
      // Step 3: Check if flight exists in blockchain
      const isFlightExist = await blockchainService.checkFlightExistence(flightNumber);

      if (!isFlightExist) {
        // Step 4: Insert flight to blockchain
        const preparedData = await getBlockchainData(flightData, encryptionKey);

        console.log("preparedData:", preparedData);
        
        const blockchainInsert = await blockchainService.insertFlightDetails(
          preparedData.blockchainFlightData,
          preparedData.blockchainUtcTimes,
          preparedData.blockchainStatusData,
          preparedData.marketingAirlineCodes,
          preparedData.marketingFlightNumbers
        );

        blockchainHashKey = blockchainInsert.transactionHash;
      } 

      // Step 5: Save flight to DynamoDB
      await flightEvent.create({
        flightNumber,
        departureDate: scheduledDepartureDate,
        departureAirport:departureAirport,
        arrivalAirport: arrivalAirport,
        carrierCode,
        blockchainHashKey,
        flightData,
        createdAt: new Date().toISOString()
      });
    } else {
      blockchainHashKey = existingFlight.blockchainHashKey;
    }

    // Step 6: Check subscription in DynamoDB first
    const existingSubscription = await flightSubscription.findOne({
      walletAddress,
      flightNumber
    });

    if (existingSubscription && existingSubscription.isSubscriptionActive) {
      return res.status(200).json({
        ...flightData,
        isSubscribed: true,
        message: "Already subscribed to this flight (Database)",
        subscriptionSource: "database"
      });
    }

    // Step 7: Check subscription in blockchain
    const isSubscribed = await blockchainService.checkFlightSubscription(
      walletAddress,
      flightNumber,
      carrierCode,
      departureAirport
    );

    if (isSubscribed) {
      // If subscribed in blockchain but not in DB, save to DB
      if (!existingSubscription) {
        try {
          await flightSubscription.create({
            walletAddress,
            flightNumber,
            departureAirport,
            arrivalAirport : arrivalAirport,
            blockchainTxHash: "existing_subscription",
            isSubscriptionActive: true,
            subscriptionDate: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          console.log("[DYNAMODB] Existing blockchain subscription saved to DB");
        } catch (dbError) {
          console.error("[DYNAMODB] Error saving existing subscription:", dbError);
        }
      }

      return res.status(200).json({
        ...flightData,
        isSubscribed: true,
        message: "Already subscribed to this flight (Blockchain)",
        subscriptionSource: "blockchain"
      });
    }

    // Step 8: Subscribe to blockchain
    let blockchainSubscription;
    try {
      blockchainSubscription = await blockchainService.addFlightSubscription(
        flightNumber,
        carrierCode,
        departureAirport
      );
    } catch (subscriptionError) {
      const errorMessage = subscriptionError?.error?.message || subscriptionError?.message || "";
      
      customLogger.error(`[BLOCKCHAIN] Subscription error: ${errorMessage}`);

      // Match common predictable gas limit error (already subscribed)
      if (
        errorMessage.includes("UNPREDICTABLE_GAS_LIMIT") &&
        errorMessage.includes("you are already Subscribed")
      ) {
        // Save to DB even if blockchain says already subscribed
        if (!existingSubscription) {
          try {
            await flightSubscription.create({
              walletAddress,
              flightNumber,
              departureAirport,
              arrivalAirport,
              blockchainTxHash: "already_subscribed_blockchain",
              isSubscriptionActive: true,
              subscriptionDate: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
            console.log("[DYNAMODB] Blockchain existing subscription saved to DB");
          } catch (dbError) {
            console.error("[DYNAMODB] Error saving subscription after blockchain error:", dbError);
          }
        }

        return res.status(200).json({
          flightNumber,
          isSubscribed: true,
          message: "User already subscribed to this flight",
        });
      }

      // Fallback for unexpected errors
      return res.status(500).json({
        error: "Blockchain subscription failed",
        details: errorMessage,
      });
    }

    // Step 9: Save successful subscription to DynamoDB
    try {
      await flightSubscription.create({
        walletAddress,
        flightNumber,
        departureAirport,
        arrivalAirport,
        blockchainTxHash: blockchainSubscription.transactionHash,
        isSubscriptionActive: true,
        subscriptionDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      console.log("[DYNAMODB] New flight subscription saved successfully:", {
        walletAddress,
        flightNumber,
        txHash: blockchainSubscription.transactionHash
      });

    } catch (dbError) {
      console.error("[DYNAMODB] Error saving new subscription:", dbError);
      customLogger.error(`[DYNAMODB] Failed to save subscription: ${dbError.message}`);
      
      // Log error but don't fail the request since blockchain subscription succeeded
    }

    return res.status(200).json({
      flightNumber,
      blockchainTxHash: blockchainSubscription.transactionHash,
      isSubscribed: true,
      message: "Successfully subscribed to flight",
      subscriptionSaved: true
    });

  } catch (error) {
    console.error("[API] Subscription error", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};

/* ====================== Add Flight Subscription Api =============================== */

/* ====================== Get Subscribed Flight's Start =========================*/

export const getSubscribedFlights = async (req, res) => {
  try {
    
    if (!walletAddress) {
      return res.status(400).json({
        error: "Missing required parameter: walletAddress",
      });
    }

    console.log("Fetching subscriptions for wallet:", walletAddress);

    // Fetch subscriptions from DynamoDB - this returns an ARRAY
    const subscriptions = await flightSubscription.findMany({
      walletAddress: String(walletAddress),
    });

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(404).json({
        error: "No subscriptions found for this wallet address",
      });
    }

    console.log("Found subscriptions:", subscriptions);

    // Get flight data for each subscribed flight
    const flightDataPromises = subscriptions.map(async (subscription) => {
      try {
        // Get flight events for this flight number
        const flightEvents = await flightEvent.findMany({
          flightNumber: subscription.flightNumber,
        });

        // Transform flight data using your helper function
        const transformedFlightEvents = flightEvents.map(event => {
          try {
            if (event.flightData) {
              console.log(event.flightData);
              
              const extractedInfo = extractKeyFlightInfo(event.flightData);
              return {
                ...event,
                flightInfo: extractedInfo,
                // Remove the original flightData to reduce response size
                flightData: undefined
              };
            }
            return event;
          } catch (transformError) {
            return {
              ...event,
              flightInfo: null,
              transformError: transformError.message,
              // Keep original data if transformation fails
              flightData: event.flightData
            };
          }
        });

        return {
          subscription: subscription,
          flightEvents: transformedFlightEvents || []
        };
      } catch (error) {
        console.error(`Error fetching flight events for ${subscription.flightNumber}:`, error);
        return {
          subscription: subscription,
          flightEvents: [],
          error: error.message
        };
      }
    });

    // Wait for all flight data to be fetched
    const flightResults = await Promise.all(flightDataPromises);

    // Format the response
    const formattedResults = flightResults.map(result => ({
      walletAddress: result.subscription.walletAddress,
      flightNumber: result.subscription.flightNumber,
      subscriptionDate: result.subscription.createdAt,
      flightEvents: result.flightEvents,
      hasError: !!result.error,
      error: result.error
    }));

    return res.status(200).json({
      success: true,
      walletAddress: walletAddress,
      subscriptionCount: subscriptions.length,
      subscriptions: formattedResults,
      message: "Subscribed flight data retrieved successfully",
    });

  } catch (error) {
    console.error("[API] Error fetching subscribed flights:", error);
    return res.status(500).json({
      success: false,
      errorMessage: "Internal server error",
      errorDetails: { description: error.message },
    });
  }
};


/* ====================== Get Subscribed Flight's End =========================*/