import schedule from "node-schedule";
import FlightData from "../model/flight.js";
import dotenv from "dotenv";
import { fetchFlightStatusData } from "./api.js";
import blockchainService from "../utils/flightBlockchainService.js";
import FlightSubscription from "../model/flight-subscription.js";
dotenv.config();

export const saveFlightDataToMongoDB = async (
  flightData,
  blockchainFlightData,
  blockchainUtcTimes,
  blockchainStatusData,
  tasnectionhash
) => {
  try {
    // Destructure blockchain data arrays
    const [
      flightNumber,
      scheduledDepartureDate,
      carrierCode,
      arrivalCity,
      departureCity,
      arrivalAirport,
      departureAirport,
      operatingAirline,
      arrivalGate,
      departureGate,
      flightStatus,
      equipmentModel,
    ] = blockchainFlightData;

    const [
      actualArrivalUTC,
      actualDepartureUTC,
      estimatedArrivalUTC,
      estimatedDepartureUTC,
      scheduledArrivalUTCDateTime,
      scheduledDepartureUTCDateTime,
      arrivalDelayMinutes,
      departureDelayMinutes,
      baggageClaim,
    ] = blockchainUtcTimes;

    const [
      statusCode,
      flightStatusDescription,
      arrivalStatus,
      departureStatus,
      outTimeUTC,
      offTimeUTC,
      onTimeUTC,
      inTimeUTC,
    ] = blockchainStatusData;

    // Get marketing segments from original flight data
    const marketingSegments = flightData.marketedFlightSegment || [];

    // Status mapping to ensure schema compatibility
    const statusMap = {
      IN: "in",
      OUT: "out",
      OFF: "off",
      ON: "on",
      NDPT: "ndpt",
    };

    // Create new FlightData document
    const newFlightData = new FlightData({
      flightNumber: flightNumber,
      scheduledDepartureDate,
      carrierCode,
      operatingAirline,
      estimatedArrivalUTC,
      estimatedDepartureUTC,
      actualDepartureUTC,
      actualArrivalUTC,
      scheduledArrivalUTCDateTime,
      scheduledDepartureUTCDateTime,
      outTimeUTC,
      offTimeUTC,
      onTimeUTC,
      inTimeUTC,
      arrivalCity,
      departureCity,
      arrivalStatus: arrivalStatus || flightStatus,
      departureStatus: departureStatus || flightStatus,
      arrivalAirport,
      departureAirport,
      departureGate,
      arrivalGate,
      equipmentModel,
      statusCode,
      flightStatusDescription,
      currentFlightStatus: statusMap[flightData.statusCode] || "ndpt", // Fixed this line
      baggageClaim,
      departureDelayMinutes: Number(departureDelayMinutes),
      arrivalDelayMinutes: Number(arrivalDelayMinutes),
      MarketedFlightSegment: marketingSegments.map((segment) => ({
        MarketingAirlineCode: segment.MarketingAirlineCode,
        FlightNumber: segment.FlightNumber,
      })),
      departureTerminal: flightData.departureTerminal,
      arrivalTerminal: flightData.arrivalTerminal,
      boardingTime: flightData.boardingTime,
      isCanceled: flightData.isCanceled || false,
      blockchainUpdated: true,
      blockchainTxHash: tasnectionhash,
    });

    // Save the flight data
    const savedFlightData = await newFlightData.save();

    console.log("[MongoDB] Flight Data Saved Successfully", {
      flightNumber: savedFlightData.flightNumber,
      _id: savedFlightData._id,
    });

    return savedFlightData;
  } catch (error) {
    console.error("[MongoDB] Error Saving Flight Data", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

const prepareFlightDataForBlockchain = (flightData) => {
  // Validate required fields
  if (
    !flightData.flightNumber ||
    !flightData.carrierCode ||
    !flightData.scheduledDepartureDate
  ) {
    throw new Error("Missing required flight data fields");
  }

  const blockchainFlightData = [
    flightData.flightNumber,
    flightData.scheduledDepartureDate,
    flightData.carrierCode,
    flightData.arrivalCity || "",
    flightData.departureCity || "",
    flightData.arrivalAirport || "",
    flightData.departureAirport || "",
    flightData.operatingAirline || flightData.carrierCode || "",
    flightData.arrivalGate || "",
    flightData.departureGate || "",
    flightData.currentFlightStatus || "",
    flightData.equipmentModel || "",
  ];

  const blockchainUtcTimes = [
    flightData.actualArrivalUTC || "",
    flightData.actualDepartureUTC || "",
    flightData.estimatedArrivalUTC || "",
    flightData.estimatedDepartureUTC || "",
    flightData.scheduledArrivalUTCDateTime || "",
    flightData.scheduledDepartureUTCDateTime || "",
    String(flightData.arrivalDelayMinutes || "0"),
    String(flightData.departureDelayMinutes || "0"),
    flightData.baggageClaim || "",
  ];

  const blockchainStatusData = [
    flightData.statusCode || "",
    flightData.flightStatus || "",
    flightData.arrivalStatus || "",
    flightData.departureStatus || "",
    flightData.outTimeUTC || "",
    flightData.offTimeUTC || "",
    flightData.onTimeUTC || "",
    flightData.inTimeUTC || "",
  ];

  // Handle marketing segments - ensure at least one empty entry if empty
  const marketingSegments = flightData.marketedFlightSegment || [{}];
  const marketingAirlineCodes = marketingSegments.map(
    (segment) => segment.MarketingAirlineCode || ""
  );
  const marketingFlightNumbers = marketingSegments.map(
    (segment) => segment.FlightNumber || ""
  );

  return {
    blockchainFlightData,
    blockchainUtcTimes,
    blockchainStatusData,
    marketingAirlineCodes,
    marketingFlightNumbers,
  };
};

export const addFlightSubscription = async (req, res) => {
  try {
    console.log("[API] Flight Subscription Request Received:", {
      body: req.body,
      timestamp: new Date().toISOString(),
    });

    const {
      flightNumber,
      scheduledDepartureDate,
      departureAirport,
      carrierCode,
      walletAddress,
    } = req.body;

    // Validate input
    if (
      !flightNumber ||
      !scheduledDepartureDate ||
      !carrierCode ||
      !departureAirport ||
      !walletAddress
    ) {
      console.log("[API] Validation Failed - Missing Parameters", {
        providedParams: Object.keys(req.body),
        missingParams: {
          flightNumber: !flightNumber,
          scheduledDepartureDate: !scheduledDepartureDate,
          carrierCode: !carrierCode,
          departureAirport: !departureAirport,
          walletAddress: !walletAddress,
        },
      });

      return res.status(400).json({
        error: "Missing required parameters",
        details: {
          flightNumber: !!flightNumber,
          scheduledDepartureDate: !!scheduledDepartureDate,
          carrierCode: !!carrierCode,
          departureAirport: !!departureAirport,
          walletAddress: !!walletAddress,
        },
      });
    }

    // 1. Fetch flight data from external source
    console.log("[API] Fetching Flight Status Data", {
      flightNumber,
      scheduledDepartureDate,
      departureAirport,
      walletAddress,
    });

    const flightData = await fetchFlightStatusData(
      flightNumber,
      scheduledDepartureDate,
      departureAirport,
      walletAddress
    );

    if (!flightData) {
      console.log("[API] Flight Data Not Found", {
        flightNumber,
        scheduledDepartureDate,
        departureAirport,
      });

      return res.status(404).json({
        error: "Flight data not found",
        details: {
          flightNumber,
          scheduledDepartureDate,
          departureAirport,
        },
      });
    }

    console.log("[API] Flight Data Retrieved Successfully", {
      flightNumber: flightData.flightNumber,
      carrierCode: flightData.carrierCode,
    });

    // 2. Check if flight exists in blockchain
    console.log("[BLOCKCHAIN] Checking Flight Existence", {
      flightNumber,
    });

    const isFlightExist = await blockchainService.checkFlightExistence(
      flightNumber
    );

    console.log("[BLOCKCHAIN] Flight Existence Check", {
      flightNumber,
      exists: isFlightExist,
    });

    // If flight does not exist in blockchain, insert flight details
    if (!isFlightExist) {
      console.log("[BLOCKCHAIN] Inserting Flight Details", {
        flightNumber: flightData.flightNumber,
        carrierCode: flightData.carrierCode,
      });

      try {
        const {
          blockchainFlightData,
          blockchainUtcTimes,
          blockchainStatusData,
          marketingAirlineCodes,
          marketingFlightNumbers,
        } = prepareFlightDataForBlockchain(flightData);

        const blockchainInsertService =
          await blockchainService.insertFlightDetails(
            blockchainFlightData,
            blockchainUtcTimes,
            blockchainStatusData,
            marketingAirlineCodes,
            marketingFlightNumbers
          );

        console.log("[BLOCKCHAIN] Flight Details Inserted Successfully", {
          flightNumber: flightData.flightNumber,
          tasnectionhash: blockchainInsertService.transactionHash,
        });

        const flightInsert = await saveFlightDataToMongoDB(
          flightData,
          blockchainFlightData,
          blockchainUtcTimes,
          blockchainStatusData,
          blockchainInsertService.transactionHash
        );

        console.log("[API] Flight Details Inserted Successfully In Mongodb", {
          flightNumber: flightData.flightNumber,
          flightInsert,
        });
      } catch (insertError) {
        console.error("[BLOCKCHAIN] Error Inserting Flight Details", {
          flightNumber: flightData.flightNumber,
          error: insertError.message,
        });

        return res.status(500).json({
          error: "Failed to insert flight details in blockchain",
          details: insertError.message,
        });
      }
    }

    // Check if user is already subscribed to this flight
    console.log("[BLOCKCHAIN] Checking Flight Subscription", {
      walletAddress,
      flightNumber,
      carrierCode,
      departureAirport,
    });

    const isSubscribed = await blockchainService.checkFlightSubscription(
      walletAddress,
      flightNumber,
      carrierCode,
      departureAirport
    );

    console.log("[BLOCKCHAIN] Subscription Check Result", {
      walletAddress,
      flightNumber,
      isSubscribed,
    });

    if (isSubscribed) {
      console.log("[API] User Already Subscribed", {
        walletAddress,
        flightNumber,
      });

      return res.status(200).json({
        ...flightData,
        isSubscribed: true,
        message: "Already subscribed to this flight",
      });
    }

    // Add subscription to blockchain
    console.log("[BLOCKCHAIN] Attempting Flight Subscription", {
      flightNumber,
      carrierCode,
      departureAirport,
    });

    let blockchainSubscription;
    try {
      blockchainSubscription = await blockchainService.addFlightSubscription(
        flightNumber,
        carrierCode,
        departureAirport
      );

      console.log("[BLOCKCHAIN] Subscription Added Successfully", {
        flightNumber,
        transactionHash: blockchainSubscription.transactionHash,
      });
    } catch (subscriptionError) {
      console.error("[BLOCKCHAIN] Subscription Error", {
        flightNumber,
        error: subscriptionError.message,
      });

      return res.status(500).json({
        error: "Failed to subscribe to flight",
        details: subscriptionError.message,
      });
    }

    // Save subscription details to MongoDB
    console.log("[API] Saving Subscription to Database", {
      walletAddress,
      flightNumber,
    });

    const newSubscription = new FlightSubscription({
      walletAddress,
      flightNumber,
      departureAirport,
      arrivalAirport: flightData.arrivalAirport,
      blockchainTxHash: blockchainSubscription.transactionHash,
      flightSubscriptionStatus: "subscribed", // Use this fixed value for subscriptions
      isSubscriptionActive: true,
    });

    await newSubscription.save();

    console.log("[API] Subscription Saved Successfully", {
      walletAddress,
      flightNumber,
      subscriptionId: newSubscription._id,
    });

    // Return full flight data with subscription status
    return res.status(200).json({
      ...flightData,
      isSubscribed: true,
      message: "Successfully subscribed to flight",
    });
  } catch (error) {
    console.error("[API] Unexpected Error in Flight Subscription", {
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};

// Schedule periodic flight status updates
export const startFlightStatusMonitoring = () => {
  // Run every 5 minutes
  const job = schedule.scheduleJob("*/5 * * * *", async () => {
    try {
      console.log(
        "[SCHEDULER] Running scheduled flight status update check..."
      );

      // Get flights updated in the last 24 hours
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const recentFlights = await FlightData.find({
        updatedAt: { $gte: oneDayAgo },
        isSubscribed: true, // Only check subscribed flights
      }).sort({ updatedAt: -1 });

      console.log(
        `[SCHEDULER] Found ${recentFlights.length} recent subscribed flights to check for updates`
      );

      // Track results
      const results = {
        total: recentFlights.length,
        updated: 0,
        failed: 0,
        skipped: 0,
        blockchainUpdated: 0,
      };

      // Check each flight for updates
      for (const flight of recentFlights) {
        try {
          // Skip already arrived flights
          if (
            flight.currentFlightStatus === "in" ||
            flight.statusCode === "IN"
          ) {
            console.log(
              `[SCHEDULER] Skipping already arrived flight ${flight.flightNumber} for ${flight.scheduledDepartureDate}`
            );
            results.skipped++;
            continue;
          }

          // Fetch latest flight data from external API
          console.log(
            `[SCHEDULER] Fetching latest data for flight ${flight.flightNumber}`
          );

          const newFlightData = await fetchFlightStatusData(
            flight.flightNumber,
            flight.scheduledDepartureDate,
            flight.departureAirport
          );

          if (!newFlightData) {
            console.log(
              `[SCHEDULER] No data found for flight ${flight.flightNumber}`
            );
            continue;
          }

          // Determine the new flight phase from the API response
          // We need to extract the phase from the API response
          const newPhase =
            newFlightData.phase || newFlightData.currentFlightStatus || "";

          let shouldUpdate = false;
          let newStatusCode = "";

          // Check for phase transitions
          // ndpt -> out
          if (flight.currentFlightStatus === "ndpt" && newPhase === "out") {
            shouldUpdate = true;
            newStatusCode = "OUT";
          }
          // out -> off
          else if (flight.currentFlightStatus === "out" && newPhase === "off") {
            shouldUpdate = true;
            newStatusCode = "OFF";
          }
          // off -> on
          else if (flight.currentFlightStatus === "off" && newPhase === "on") {
            shouldUpdate = true;
            newStatusCode = "ON";
          }
          // on -> in
          else if (flight.currentFlightStatus === "on" && newPhase === "in") {
            shouldUpdate = true;
            newStatusCode = "IN";
          }

          // Perform update if conditions are met
          if (shouldUpdate) {
            console.log(
              `[SCHEDULER] Updating flight ${flight.flightNumber} from ${flight.currentFlightStatus} to ${newPhase}`
            );

            // Set the appropriate UTC time based on the phase
            let outTimeUTC = flight.outTimeUTC || "";
            let offTimeUTC = flight.offTimeUTC || "";
            let onTimeUTC = flight.onTimeUTC || "";
            let inTimeUTC = flight.inTimeUTC || "";

            // Update the appropriate time field based on new phase
            const currentUTC = new Date().toISOString();
            if (newPhase === "out") {
              outTimeUTC = currentUTC;
            } else if (newPhase === "off") {
              offTimeUTC = currentUTC;
            } else if (newPhase === "on") {
              onTimeUTC = currentUTC;
            } else if (newPhase === "in") {
              inTimeUTC = currentUTC;
            }

            // Prepare update data with new status
            const updateData = {
              ...newFlightData,
              currentFlightStatus: newPhase,
              statusCode: newStatusCode,
              outTimeUTC,
              offTimeUTC,
              onTimeUTC,
              inTimeUTC,
              blockchainUpdated: false, // Initially mark as not updated in blockchain
            };

            // Update in blockchain using the existing prepareFlightDataForBlockchain function
            try {
              // Create a merged flightData object with the updated fields
              const mergedFlightData = {
                ...flight.toObject(),
                ...updateData,
              };

              // Use the existing helper function to prepare data for blockchain
              const {
                blockchainFlightData,
                blockchainUtcTimes,
                blockchainStatusData,
                marketingAirlineCodes,
                marketingFlightNumbers,
              } = prepareFlightDataForBlockchain(mergedFlightData);

              console.log(
                `[BLOCKCHAIN] Updating flight status in blockchain for flight ${flight.flightNumber}`
              );

              // Call the insertFlightDetails method to update the flight in blockchain
              const blockchainResponse =
                await blockchainService.insertFlightDetails(
                  blockchainFlightData,
                  blockchainUtcTimes,
                  blockchainStatusData,
                  marketingAirlineCodes,
                  marketingFlightNumbers
                );

              console.log(`[BLOCKCHAIN] Update response:`, blockchainResponse);

              // Mark blockchain as updated
              updateData.blockchainUpdated = true;
              updateData.blockchainTxHash = blockchainResponse.transactionHash;

              results.blockchainUpdated++;
            } catch (blockchainError) {
              console.error(
                `[BLOCKCHAIN ERROR] Failed to update blockchain for flight ${flight.flightNumber}:`,
                blockchainError.message
              );

              // Mark blockchain as needing update
              updateData.blockchainUpdated = false;
            }

            // Update in MongoDB
            await FlightData.findByIdAndUpdate(flight._id, updateData);

            console.log(
              `[SCHEDULER] Successfully updated flight ${flight.flightNumber} from ${flight.currentFlightStatus} to ${newPhase}`
            );
            results.updated++;
          } else {
            console.log(
              `[SCHEDULER] No valid phase transition detected for flight ${flight.flightNumber} (current: ${flight.currentFlightStatus}, new: ${newPhase})`
            );
          }
        } catch (flightError) {
          console.error(
            `[SCHEDULER ERROR] Error updating flight ${flight.flightNumber}:`,
            flightError.message
          );
          results.failed++;
        }
      }

      // Handle any flights that need blockchain updates but failed previously
      try {
        const pendingBlockchainUpdates = await FlightData.find({
          blockchainUpdated: false,
          isSubscribed: true,
        });

        console.log(
          `[SCHEDULER] Found ${pendingBlockchainUpdates.length} flights pending blockchain updates`
        );

        for (const flight of pendingBlockchainUpdates) {
          try {
            // Use the existing helper function to prepare data for blockchain
            const {
              blockchainFlightData,
              blockchainUtcTimes,
              blockchainStatusData,
              marketingAirlineCodes,
              marketingFlightNumbers,
            } = prepareFlightDataForBlockchain(flight);

            console.log(
              `[BLOCKCHAIN] Retrying blockchain update for flight ${flight.flightNumber}`
            );

            // Update flight status in blockchain by re-inserting the data
            const blockchainResponse =
              await blockchainService.insertFlightDetails(
                blockchainFlightData,
                blockchainUtcTimes,
                blockchainStatusData,
                marketingAirlineCodes,
                marketingFlightNumbers
              );

            // Mark as updated in MongoDB
            await FlightData.findByIdAndUpdate(flight._id, {
              blockchainUpdated: true,
              blockchainTxHash: blockchainResponse.transactionHash,
            });

            results.blockchainUpdated++;

            console.log(
              `[BLOCKCHAIN] Successfully updated pending flight ${flight.flightNumber} in blockchain`
            );
          } catch (retryError) {
            console.error(
              `[BLOCKCHAIN ERROR] Failed to retry blockchain update for flight ${flight.flightNumber}:`,
              retryError.message
            );
          }
        }
      } catch (pendingError) {
        console.error(
          `[SCHEDULER ERROR] Error processing pending blockchain updates:`,
          pendingError.message
        );
      }

      console.log(
        `[SCHEDULER] Scheduled flight status update completed. Results: ${JSON.stringify(
          results
        )}`,
        new Date()
      );
    } catch (error) {
      console.error(
        `[SCHEDULER ERROR] Error in scheduled flight status update:`,
        error.message,
        error.stack
      );
    }
  });

  console.log(
    "[SCHEDULER] Flight status monitoring started - checking every 5 minutes"
  );
  return job;
};
/*

1. Use insertFlightDetails for updates: Your contract's insertFlightDetails function can actually be used to update existing flight data because it overwrites the data in the mappings for that flight.
2. Keep track of flight phases: I've maintained the phase transition detection (ndpt → out → off → on → in) and mapped those to appropriate status codes.
3. Track timestamps for each phase: As the flight progresses through different phases, we update the appropriate timestamp (outTimeUTC, offTimeUTC, onTimeUTC, inTimeUTC).
4. Maintain blockchain transaction record: We store the transaction hash and update status in MongoDB.
   Added retry mechanism: For flights that failed to update in the blockchain, we have a retry process.

*/
// You'll need to implement this function in your blockchainService

export const getSubscribedFlights = async (req, res) => {
  try {
    const { walletAddress } = req.params;

    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet address is required" });
    }

    // Get all subscribed flight numbers
    const subscriptions = await FlightSubscription.find({ walletAddress });

    const subscribedFlightNumbers = subscriptions.map(
      (sub) => sub.flightNumber
    );

    if (subscribedFlightNumbers.length === 0) {
      return res.status(200).json([]);
    }

    // Find all flights matching the subscribed flight numbers
    const flights = await FlightData.find({
      flightNumber: { $in: subscribedFlightNumbers },
    });

    res.status(200).json(flights);
  } catch (error) {
    console.error("Error fetching subscribed flights:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/*
  API: getAllSubscriptionOfUser
  Description: Fetches all flight subscriptions of a user along with their flight details.
  
  Steps:
  1. Extract walletAddress from request parameters.
  2. Validate that walletAddress is provided; return an error if missing.
  3. Retrieve all subscriptions associated with the walletAddress from FlightSubscription model.
  4. If no subscriptions exist, return a 404 response.
  5. For each subscription, fetch the corresponding flight details from FlightData model.
  6. Combine the subscription and flight data into a structured response.
  7. Return the response with success status.
  8. Handle errors and return a 500 status in case of failure.
*/

export const getAllSubscriptionOfUser = async (req, res) => {
  try {
    const { walletAddress } = req.params;

    // Step 2: Validate input
    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet address is required" });
    }

    // Step 3: Fetch all subscriptions for the user
    const subscriptions = await FlightSubscription.find({ walletAddress });

    // Step 4: Check if subscriptions exist
    if (!subscriptions.length) {
      return res
        .status(404)
        .json({ message: "No subscriptions found for this user" });
    }

    // Step 5 & 6: Fetch flight details for each subscription
    const flightDetails = await Promise.all(
      subscriptions.map(async (subscription) => {
        const flight = await FlightData.findOne({
          flightNumber: subscription.flightNumber,
        });
        return {
          subscription,
          flight,
        };
      })
    );

    // Step 7: Return successful response
    res.status(200).json({ success: true, data: flightDetails });
  } catch (error) {
    // Step 8: Handle errors
    console.error("Error fetching subscription and flight details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/*
  API: unsubscribeFlights
  Description: Unsubscribes multiple flights from both the blockchain and MongoDB using walletAddress, flight numbers, carrier codes, and departure airports.
  
  Steps:
  1. Extract walletAddress, flightNumbers, carrierCodes, and departureAirports from request body.
  2. Validate input to ensure all required fields are provided and arrays match in length.
  3. Fetch matching subscriptions associated with the walletAddress from FlightSubscription model.
  4. If no subscriptions exist, return a 404 response.
  5. Remove subscriptions from MongoDB.
  6. Call blockchain function to remove subscriptions from the blockchain.
  7. Return success response if both operations are successful.
  8. Handle errors and return a 500 status in case of failure.
*/

export const unsubscribeFlights = async (req, res) => {
  try {
    const { walletAddress, flightNumbers, carrierCodes, departureAirports } =
      req.body;

    // Step 2: Validate input
    if (
      !walletAddress ||
      !flightNumbers ||
      !carrierCodes ||
      !departureAirports ||
      flightNumbers.length !== carrierCodes.length ||
      flightNumbers.length !== departureAirports.length
    ) {
      return res
        .status(400)
        .json({ error: "Invalid or mismatched input arrays" });
    }

    // Step 3: Fetch matching subscriptions associated with the walletAddress
    const subscriptions = await FlightSubscription.find({
      walletAddress,
      $or: flightNumbers.map((flightNumber, index) => ({
        flightNumber,
        departureAirport: departureAirports[index],
      })),
    });

    // Step 4: If no subscriptions exist, return a 404 response
    if (!subscriptions.length) {
      return res.status(404).json({
        message: "No matching subscriptions found for this wallet address",
      });
    }

    // Step 5: Remove subscriptions from MongoDB
    await FlightSubscription.deleteMany({
      walletAddress,
      $or: flightNumbers.map((flightNumber, index) => ({
        flightNumber,
        departureAirport: departureAirports[index],
      })),
    });

    // Step 6: Remove subscriptions from blockchain
    const blockRes = await blockchainService.removeFlightSubscriptions(
      flightNumbers,
      carrierCodes,
      departureAirports
    );

    // Step 7: Return success response
    res.status(200).json({
      success: true,
      message: "Subscriptions removed successfully",
      blockRes,
    });
  } catch (error) {
    // Step 8: Handle errors
    console.error("Error unsubscribing flights:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
// Initialize and start monitoring
startFlightStatusMonitoring();
