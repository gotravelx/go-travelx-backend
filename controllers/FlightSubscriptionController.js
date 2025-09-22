import { getDynamoClient } from "../config/Dynamodb.js";
import { extractKeyFlightInfo, getBlockchainData } from "../helper/helper.js";
import {
  getFlightEventByNumber,
  insertFlightEvent,
} from "../model/FlightEventModel.js";
import {
  FlightSubscriptionModel,
  insertFlightSubscription,
  isFlightSubscribed,
  subscribeDb,
} from "../model/FlightSubscriptionModel.js";

import blockchainService from "../utils/FlightBlockchainService.js";
import customLogger from "../utils/Logger.js";
import { fetchFlightData } from "./UnitedApiController.js";

import { flightDb } from "../model/FlightEventModel.js";
import { getCompressedFlightData } from "../helper/compress-decompress.js";

const encryptionKey = process.env.ENCRYPTION_KEY;
const walletAddress = process.env.WALLET_ADDRESS;

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
    const items = await subscribeDb.findMany();

    if (!items || items.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Table is already empty.",
      });
    }

    // Delete all items one by one using the new deleteItem method
    for (const item of items) {
      await subscribeDb.deleteItem(item); // Or use deleteOne with extracted key
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
      departureDate,
      departureAirport,
      arrivalAirport,
      carrierCode,
    } = req.body;

    // Validate required parameters
    if (
      !flightNumber ||
      !departureDate ||
      !departureAirport ||
      !arrivalAirport ||
      !carrierCode
    ) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters",
        required: [
          "flightNumber",
          "departureDate",
          "departureAirport",
          "arrivalAirport",
          "carrierCode",
        ],
      });
    }

    customLogger.info(
      `[SUBSCRIPTION] Starting subscription process for flight ${flightNumber}`
    );

     const existingFlightEvent = await getFlightEventByNumber(
        flightNumber,
      );

      console.log("Existing Flight:", existingFlightEvent);

    // Step 1: Check if user is already subscribed (Database first)
    const existingSubscription = await subscribeDb.findOne({
      walletAddress,
      flightNumber,
    });

    if (existingSubscription && existingSubscription.isSubscriptionActive) {
      customLogger.info(
        `[SUBSCRIPTION] User already subscribed to flight ${flightNumber} (Database)`
      );
      return res.status(200).json({
        success: true,
        flightNumber,
        isSubscribed: true,
        message: "Already subscribed to this flight",
        subscriptionSource: "database",
        subscriptionDate: existingSubscription.subscriptionDate,
      });
    }

    // Step 2: Check blockchain subscription status
    let isAlreadySubscribedBlockchain = false;
    try {
      isAlreadySubscribedBlockchain =
        await blockchainService.isUserSubscribed(
          walletAddress,
          flightNumber,
          carrierCode,
          arrivalAirport,
          departureAirport
        );

      if (isAlreadySubscribedBlockchain) {
        customLogger.info(
          `[SUBSCRIPTION] User already subscribed to flight ${flightNumber} (Blockchain)`
        );

        return res.status(200).json({
          success: true,
          flightNumber,
          isSubscribed: true,
          message: "Already subscribed to this flight (Blockchain)",
          subscriptionSource: "blockchain",
        });
      }
    } catch (blockchainError) {
      customLogger.warn(
        `[SUBSCRIPTION] Error checking blockchain subscription: ${blockchainError.message}`
      );
      // Continue with the subscription process even if check fails
    }

    // Step 3: Fetch flight data from external API
    customLogger.info(
      `[SUBSCRIPTION] Fetching flight data for ${flightNumber}`
    );
    const flightDataResponse = await fetchFlightData(flightNumber, {
      departureDate,
      departure: departureAirport,
      arrival:arrivalAirport
    });

  

    if (!flightDataResponse?.success) {
      customLogger.error(
        `[SUBSCRIPTION] Failed to fetch flight data: ${flightDataResponse.errorMessage}`
      );
      return res.status(404).json({
        success: false,
        error: "Flight data not found",
        message: flightDataResponse.errorMessage,
      });
    }

    const flightData = flightDataResponse.flightData;
    customLogger.info(
      `[SUBSCRIPTION] Successfully fetched flight data for ${flightNumber}`
    );

    // Step 4: Extract key flight information
    const flightDetails = extractKeyFlightInfo({ flightData });
    const flightStatus = flightDetails.status.legStatus || "unknown";

    // Step 5: Handle flight event and ensure flight exists in blockchain FIRST
    let flightEventResult = null;
    let blockchainFlightHash = null;
   

    try {
      // Check if flight  already exists
      const existingFlightEvent = await getFlightEventByNumber(
        flightNumber,
      );

      console.log("Existing Flight:", existingFlightEvent);
      

      if (!existingFlightEvent) {
        customLogger.info(
          `[SUBSCRIPTION] Flight  not found, creating new one for ${flightNumber}`
        );

        // Check if flight exists in blockchain
        const isFlightExistInBlockchain =
          await blockchainService.isFlightExist(flightNumber,carrierCode);

        if (!isFlightExistInBlockchain) {
          // Prepare and insert flight data to blockchain
          customLogger.info(
            `[SUBSCRIPTION] Flight not in blockchain, inserting flight data for ${flightNumber}`
          );


         
          const blockchainInsert = await blockchainService.storeFlightInBlockchain(flightData);

          blockchainFlightHash = blockchainInsert.transactionHash;
          customLogger.info(
            `[SUBSCRIPTION] Flight data inserted to blockchain. Hash: ${blockchainFlightHash}`
          );

                  // Insert flight event to database
        flightEventResult = await insertFlightEvent(
          flightNumber,
          carrierCode,
          departureDate,
          departureAirport,
          arrivalAirport,
          flightStatus,
          blockchainFlightHash,
          flightData
        );
        } else {
          customLogger.info(
            `[SUBSCRIPTION] Flight already exists in blockchain for ${flightNumber}`
          );
        }



        customLogger.info(
          `[SUBSCRIPTION] Flight event inserted to database for ${flightNumber}`
        );
      } else {
        customLogger.info(
          `[SUBSCRIPTION] Flight event already exists for ${flightNumber}`
        );
        blockchainFlightHash = existingFlightEvent.blockchainHashKey;

        // Double-check that flight exists in blockchain even if we have a database record
        const isFlightExistInBlockchain =
          await blockchainService.isFlightExist(flightNumber,carrierCode);

        if (!isFlightExistInBlockchain) {
          customLogger.warn(
            `[SUBSCRIPTION] Flight event exists in DB but not in blockchain for ${flightNumber}. Inserting to blockchain.`
          );


          const blockchainInsert = await blockchainService.storeFlightInBlockchain(
            flightData
          );

          blockchainFlightHash = blockchainInsert.transactionHash;
          customLogger.info(
            `[SUBSCRIPTION] Flight data inserted to blockchain. Hash: ${blockchainFlightHash}`
          );
        }
      }
    } catch (flightEventError) {
      customLogger.error(
        `[SUBSCRIPTION] Error handling flight event: ${flightEventError.message}`
      );
      // This is critical - if we can't ensure flight exists in blockchain, we can't proceed
      return res.status(500).json({
        success: false,
        error: "Failed to prepare flight data for blockchain",
        details: flightEventError.message,
      });
    }

    // Step 6: NOW Subscribe to blockchain (after ensuring flight exists)
    customLogger.info(
      `[SUBSCRIPTION] Subscribing to blockchain for flight ${flightNumber}`
    );
    let blockchainSubscription;
    try {
      blockchainSubscription = await blockchainService.addSubscription(
        flightNumber,carrierCode,departureAirport,arrivalAirport
      );

      customLogger.info(
        `[SUBSCRIPTION] Successfully subscribed to blockchain. TxHash: ${blockchainSubscription.transactionHash}`
      );
    } catch (subscriptionError) {
      const errorMessage =
        subscriptionError?.error?.message || subscriptionError?.message || "";

      customLogger.error(
        `[SUBSCRIPTION] Blockchain subscription error: ${errorMessage}`
      );

      // Handle specific error cases
      if (
        errorMessage.includes("UNPREDICTABLE_GAS_LIMIT") &&
        errorMessage.includes("you are already Subscribed")
      ) {
        customLogger.info(
          `[SUBSCRIPTION] User already subscribed to flight ${flightNumber} (Blockchain Error)`
        );
        return res.status(200).json({
          success: true,
          flightNumber,
          isSubscribed: true,
          message: "User already subscribed to this flight",
          subscriptionSource: "blockchain_error",
        });
      }

      // Handle the "Flight is not Exist here" error specifically
      if (
        errorMessage.includes("UNPREDICTABLE_GAS_LIMIT") &&
        errorMessage.includes("Flight is not Exist here")
      ) {
        customLogger.error(
          `[SUBSCRIPTION] Flight ${flightNumber} does not exist in blockchain despite our checks`
        );
        return res.status(500).json({
          success: false,
          error: "Flight does not exist in blockchain",
          details: "Flight data insertion may have failed. Please try again.",
        });
      }

      // Return error for other blockchain failures
      return res.status(500).json({
        success: false,
        error: "Blockchain subscription failed",
        details: errorMessage,
      });
    }

    // Step 7: Save subscription to database
    try {
      await insertFlightSubscription({
        walletAddress,
        flightNumber,
        carrierCode,
        departureAirport,
        arrivalAirport,
        blockchainTxHash: blockchainSubscription.transactionHash,
        isSubscriptionActive: true,
        subscriptionDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      customLogger.info(
        `[SUBSCRIPTION] Subscription saved to database successfully for ${flightNumber}`
      );
    } catch (dbError) {
      customLogger.error(
        `[SUBSCRIPTION] Error saving subscription to database: ${dbError.message}`
      );
      // Even if DB save fails, blockchain subscription succeeded
      return res.status(200).json({
        success: true,
        flightNumber,
        blockchainTxHash: blockchainSubscription.transactionHash,
        isSubscribed: true,
        message:
          "Successfully subscribed to flight (blockchain), but database save failed",
        warning: "Database synchronization failed",
        subscriptionSaved: false,
      });
    }

    // Step 8: Return success response
    return res.status(200).json({
      success: true,
      flightNumber,
      blockchainTxHash: blockchainSubscription.transactionHash,
      flightEventHash: blockchainFlightHash,
      isSubscribed: true,
      message: "Successfully subscribed to flight",
      subscriptionSaved: true,
      flightDetails: {
        departureAirport,
        arrivalAirport,
        departureDate,
        carrierCode,
        status: flightStatus,
      },
    });
  } catch (error) {
    customLogger.error(
      `[SUBSCRIPTION] Unexpected error in subscription process: ${error}`
    );

    console.log(`[SUBSCRIPTION]`, error);

    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message,
    });
  }
};

/* ====================== Add Flight Subscription Api =============================== */

/* ====================== Add Flight Subscription Api =============================== */

/* ====================== Get Subscribed Flight's Start =========================*/

export const getSubscribedFlights = async (req, res) => {
  try {

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        message: "walletAddress is required",
      });
    }

    // Step 1: Fetch active subscriptions for wallet
    const activeSubscriptions = await subscribeDb.findMany({
      walletAddress,
      isSubscriptionActive: true,
    });

    if (!activeSubscriptions || activeSubscriptions.length === 0) {
      return res.status(200).json({
        success: true,
        walletAddress,
        subscriptionCount: 0,
        subscriptions: [],
        message: "No active subscribed flights found",
      });
    }

    // Step 2: Process each subscription
    const subscriptionsData = await Promise.all(
      activeSubscriptions.map(async (subscription) => {
        try {
          // Try exact match in FlightEvents table
          let flightEvent = await flightDb.findOne({
            flightNumber: subscription.flightNumber,
          });

          if (!flightEvent) {
            // Fallback to findMany
            const eventList = await flightDb.findMany({
              flightNumber: subscription.flightNumber,
            });

            if (eventList && eventList.length > 0) {
              flightEvent = eventList[0];
            }
          }

          // If no flightData available, skip
          if (!flightEvent || !flightEvent.flightData) return null;

          const flightInfo = extractKeyFlightInfo({
            flightData: flightEvent.flightData,
          });

          return {
            flightNumber: subscription.flightNumber,
            blockchainTxHash: subscription.blockchainTxHash || null,
            subscriptionDate: subscription.subscriptionDate,
            ...flightInfo,
            blockchainHashKey: flightEvent.blockchainHashKey || null,
          };
        } catch (err) {
          console.error(`Error processing ${subscription.flightNumber}`, err);
          return null;
        }
      })
    );

    // Filter out failed records
    const filteredData = subscriptionsData.filter((item) => item !== null);

    return res.status(200).json({
      success: true,
      walletAddress,
      subscriptionCount: filteredData.length,
      subscriptions: filteredData,
      message: "Subscribed flights retrieved successfully",
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

/* ====================== Get Subscribed Flight's End =========================*/

/* ============  Unsubscribe flight via wallet address and flight Number */


export const unsubscribeFlight = async (req, res) => {
  try {
    const { flightNumbers, departureAirports } = req.body;

    // Validate required parameters
    if (!flightNumbers || !departureAirports) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters",
        required: ["flightNumbers", "departureAirports"],
      });
    }

    // Validate arrays
    if (!Array.isArray(flightNumbers) || !Array.isArray(departureAirports)) {
      return res.status(400).json({
        success: false,
        error: "Parameters must be arrays",
        required: ["flightNumbers", "departureAirports"],
      });
    }

    // Validate array lengths match
    if (flightNumbers.length !== departureAirports.length) {
      return res.status(400).json({
        success: false,
        error: "Array lengths must match",
        details: {
          flightNumbersLength: flightNumbers.length,
          departureAirportsLength: departureAirports.length,
        },
      });
    }

    // Validate arrays are not empty
    if (flightNumbers.length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one flight must be provided for unsubscription",
      });
    }

    customLogger.info(
      `[UNSUBSCRIBE] Starting unsubscription process for ${flightNumbers.length} flights`
    );

    // Step 1: Check existing subscriptions in database
    const existingSubscriptions = [];
    const notFoundSubscriptions = [];

    for (let i = 0; i < flightNumbers.length; i++) {
      const flightNumber = flightNumbers[i];

      try {
        const subscription = await subscribeDb.findOne({
          walletAddress,
          flightNumber,
        });

        if (subscription && subscription.isSubscriptionActive) {
          existingSubscriptions.push({
            flightNumber,
            departureAirport: departureAirports[i],
            subscription,
          });
        } else {
          notFoundSubscriptions.push({
            flightNumber,
            departureAirport: departureAirports[i],
            reason: subscription
              ? "subscription inactive"
              : "subscription not found",
          });
        }
      } catch (error) {
        customLogger.warn(
          `[UNSUBSCRIBE] Error checking subscription for flight ${flightNumber}: ${error.message}`
        );
        notFoundSubscriptions.push({
          flightNumber,
          departureAirport: departureAirports[i],
          reason: "database error",
        });
      }
    }

    // If no active subscriptions found
    if (existingSubscriptions.length === 0) {
      customLogger.info(
        `[UNSUBSCRIBE] No active subscriptions found for provided flights`
      );
      return res.status(200).json({
        success: true,
        message: "No active subscriptions found for the provided flights",
        unsubscribedCount: 0,
        notFoundSubscriptions,
        details: {
          totalRequested: flightNumbers.length,
          activeSubscriptions: 0,
        },
      });
    }

    // Step 2: Remove subscriptions from blockchain
    let blockchainUnsubscription = null;
    const subscriptionsToRemove = existingSubscriptions.map((sub) => ({
      flightNumber: sub.flightNumber,
      carrierCode: sub.subscription.carrierCode, // Get carrier code from existing subscription
      departureAirport: sub.departureAirport,
    }));

    try {
      customLogger.info(
        `[UNSUBSCRIBE] Removing ${existingSubscriptions.length} subscriptions from blockchain`
      );

      blockchainUnsubscription =
        await blockchainService.removeFlightSubscriptions(
          subscriptionsToRemove.map((s) => s.flightNumber),
          subscriptionsToRemove.map((s) => s.carrierCode),
          subscriptionsToRemove.map((s) => s.departureAirport)
        );

      customLogger.info(
        `[UNSUBSCRIBE] Successfully removed subscriptions from blockchain. TxHash: ${blockchainUnsubscription.transactionHash}`
      );
    } catch (blockchainError) {
      const errorMessage =
        blockchainError?.error?.message || blockchainError?.message || "";

      customLogger.error(
        `[UNSUBSCRIBE] Blockchain unsubscription error: ${errorMessage}`
      );

      // Handle specific blockchain errors
      if (errorMessage.includes("UNPREDICTABLE_GAS_LIMIT")) {
        if (errorMessage.includes("not subscribed")) {
          customLogger.warn(
            `[UNSUBSCRIBE] Some flights not subscribed on blockchain, proceeding with database cleanup`
          );
          // Continue to database cleanup even if blockchain says not subscribed
        } else {
          return res.status(500).json({
            success: false,
            error: "Blockchain unsubscription failed",
            details: errorMessage,
          });
        }
      } else {
        return res.status(500).json({
          success: false,
          error: "Blockchain unsubscription failed",
          details: errorMessage,
        });
      }
    }

    // Step 3: Update database subscriptions using DynamoDB operations
    const dbUpdateResults = [];
    const dbUpdateErrors = [];

    for (const subscription of existingSubscriptions) {
      try {
        // Prepare update data - EXCLUDE key attributes (walletAddress, flightNumber)
        const updateData = {
          isSubscriptionActive: false, // Set to false when unsubscribing
          unsubscriptionDate: new Date().toISOString(),
          blockchainUnsubscriptionTxHash:
            blockchainUnsubscription?.transactionHash || null,
          updatedAt: new Date().toISOString(),
        };

        // Use DynamoDB updateOne operation
        await subscribeDb.updateOne(
          { 
            walletAddress, 
            flightNumber: subscription.flightNumber 
          }, 
          updateData
        );

        dbUpdateResults.push({
          flightNumber: subscription.flightNumber,
          status: "updated",
        });

        customLogger.info(
          `[UNSUBSCRIBE] Updated database subscription for flight ${subscription.flightNumber} - isSubscriptionActive set to false`
        );
      } catch (dbError) {
        customLogger.error(
          `[UNSUBSCRIBE] Error updating database subscription for flight ${subscription.flightNumber}: ${dbError.message}`
        );

        dbUpdateErrors.push({
          flightNumber: subscription.flightNumber,
          error: dbError.message,
        });
      }
    }

    // Step 4: Prepare response
    const successfulUnsubscriptions = dbUpdateResults.length;
    const hasErrors = dbUpdateErrors.length > 0;

    if (successfulUnsubscriptions === 0) {
      return res.status(500).json({
        success: false,
        error: "Failed to update any subscriptions in database",
        details: {
          blockchainTxHash: blockchainUnsubscription?.transactionHash,
          dbUpdateErrors,
        },
      });
    }

    // Step 5: Return success response
    const response = {
      success: true,
      message: `Successfully unsubscribed from ${successfulUnsubscriptions} flight(s)`,
      unsubscribedCount: successfulUnsubscriptions,
      blockchainTxHash: blockchainUnsubscription?.transactionHash,
      blockNumber: blockchainUnsubscription?.blockNumber,
      details: {
        totalRequested: flightNumbers.length,
        activeSubscriptions: existingSubscriptions.length,
        successfulUnsubscriptions,
        dbUpdateResults,
        subscriptionStatus: "All subscriptions marked as inactive (isSubscriptionActive: false)",
      },
    };

    // Add warnings if there were any issues
    if (notFoundSubscriptions.length > 0) {
      response.warnings = {
        notFoundSubscriptions,
      };
    }

    if (hasErrors) {
      response.warnings = {
        ...response.warnings,
        dbUpdateErrors,
      };
    }

    customLogger.info(
      `[UNSUBSCRIBE] Unsubscription process completed successfully for ${successfulUnsubscriptions} flights - all marked as inactive`
    );

    return res.status(200).json(response);
  } catch (error) {
    customLogger.error(
      `[UNSUBSCRIBE] Unexpected error in unsubscription process: ${error.message}`
    );
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message,
    });
  }
};