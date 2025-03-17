import schedule from "node-schedule";
import FlightData from "../model/flight.js";
import https from "https";
import dotenv from "dotenv";
import { fetchFlightData } from "./api.js";
import { fetchFlightFromDataSource } from "./datasource.js";
import blockchainService from "../utils/flightBlockchainService.js";
dotenv.config();

const agent = new https.Agent({
  rejectUnauthorized: false,
});

export const addFlightSubscription = async (req, res) => {
  try {
    const {
      flightNumber,
      scheduledDepartureDate,
      departureAirport,
      carrierCode,
    } = req.body;

    // Validate input
    if (
      !flightNumber ||
      !scheduledDepartureDate ||
      !carrierCode ||
      !departureAirport
    ) {
      return res.status(400).json({ error: "Missing required parameters" });
    }
    // Step 1: Check if flight exists in MongoDB
    const flightRecord = await FlightData.findOne(
      { flightNumber: Number(flightNumber) } // Match by flightNumber
    )
      .sort({ date: -1 }) // Sort by date in descending order (most recent first)
      .exec(); // Execute the query

    // If flight exists and is already subscribed
    if (flightRecord && flightRecord.isSubscribed) {
      return res.json({
        status: 200,
        message: "You have already subscribed to this flight",
        data: flightRecord,
      });
    }

    // Step 2: Check if flight exists in the blockchain
    const flightExists = await blockchainService.checkFlightExists(
      flightNumber
    );

    if (!flightExists) {
      console.log("[BLOCKCHAIN] Flight does not exist in the blockchain");
    }

    //  Fetch flight details from API
    const flightDataResponse = await fetchFlightFromDataSource(
      flightNumber,
      scheduledDepartureDate,
      departureAirport,
      carrierCode
    );

    // Check if flight data is null or undefined
    if (!flightDataResponse || !flightDataResponse.flightNumber) {
      console.log("[DATA SOURCE] Flight not found in local database");
      console.log("------> fetch from API: undefined");
      return res.status(404).json({ message: "Flight is not found" });
    }

    console.log("------> fetch from API:", flightDataResponse.flightNumber);

    const flightData = [
      flightDataResponse.flightNumber,
      flightDataResponse.scheduledDepartureDate,
      flightDataResponse.carrierCode,
      flightDataResponse.arrivalCity || "",
      flightDataResponse.departureCity || "",
      flightDataResponse.arrivalAirport || "",
      flightDataResponse.departureAirport || "",
      flightDataResponse.operatingAirline || "",
      flightDataResponse.arrivalGate || "",
      flightDataResponse.departureTerminal || "",
      flightDataResponse.flightStatus || "",
      flightDataResponse.equipmentModel || "",
    ];

    const utcTimes = [
      flightDataResponse.actualArrivalUTC || "",
      flightDataResponse.actualDepartureUTC || "",
      flightDataResponse.estimatedArrivalUTC || "",
      flightDataResponse.estimatedDepartureUTC || "",
      flightDataResponse.scheduledArrivalUTCDateTime || "",
      flightDataResponse.scheduledDepartureUTCDateTime || "",
    ];

    const status = [
      flightDataResponse.statusCode || "",
      flightDataResponse.flightStatus || "",
      flightDataResponse.outTimeUTC || "",
      flightDataResponse.offTimeUTC || "",
      flightDataResponse.onTimeUTC || "",
      flightDataResponse.inTimeUTC || "",
    ];

    console.log("Preparing to insert flight details into blockchain...");

    // Insert flight details into blockchain
    const isInserted = await blockchainService.insertFlightDetails(
      flightData,
      utcTimes,
      status
    );

    console.log("Blockchain insertion response:", isInserted);

    // Step 3: Check if the user is already subscribed to the flight in the blockchain
    const isSubscribed = await blockchainService.checkSubscriptionStatus(
      flightNumber,
      carrierCode,
      departureAirport,
      scheduledDepartureDate
    );

    if (isSubscribed) {
      return res.status(400).json({
        error: "You are already subscribed to this flight in the blockchain",
      });
    }

    // Step 5: Subscribe to the flight in the blockchain
    const subscriptionReceipt = await blockchainService.subscribeFlight(
      flightNumber,
      carrierCode,
      departureAirport,
      scheduledDepartureDate
    );

    // Extract transaction hash from the receipt
    const transactionHash = subscriptionReceipt.transactionHash;

    // Step 6: Save flight data and transaction hash in MongoDB
    const newFlightData = new FlightData({
      flightNumber: Number(flightNumber),
      scheduledDepartureDate: scheduledDepartureDate,
      carrierCode: carrierCode,
      operatingAirline: flightDataResponse.operatingAirline,
      estimatedArrivalUTC: flightDataResponse.estimatedArrivalUTC,
      estimatedDepartureUTC: flightDataResponse.estimatedDepartureUTC,
      actualDepartureUTC: flightDataResponse.actualDepartureUTC || "",
      actualArrivalUTC: flightDataResponse.actualArrivalUTC || "",
      outTimeUTC: flightDataResponse.outTimeUTC || "",
      offTimeUTC: flightDataResponse.offTimeUTC || "",
      onTimeUTC: flightDataResponse.onTimeUTC || "",
      inTimeUTC: flightDataResponse.inTimeUTC || "",
      arrivalCity: flightDataResponse.arrivalCity,
      departureCity: flightDataResponse.departureAirport, // Since it's mapped differently
      arrivalAirport: flightDataResponse.arrivalAirport,
      departureAirport: flightDataResponse.departureAirport,
      departureGate: flightDataResponse.departureGate || "TBD",
      arrivalGate: flightDataResponse.arrivalGate || "TBD",
      departureTerminal: flightDataResponse.departureTerminal || "TBD",
      arrivalTerminal: flightDataResponse.arrivalTerminal || "TBD",
      currentFlightStatus: flightDataResponse.flightStatus,
      statusCode: flightDataResponse.statusCode,
      equipmentModel: flightDataResponse.equipmentModel,
      currentPhase: flightDataResponse.phase,
      baggageClaim: flightDataResponse.baggageClaim || "TBD",
      departureDelayMinutes: flightDataResponse.departureDelayMinutes || 0,
      arrivalDelayMinutes: flightDataResponse.arrivalDelayMinutes || 0,
      boardingTime: flightDataResponse.boardingTime || "",
      isCanceled: flightDataResponse.isCanceled,
      scheduledArrivalUTCDateTime:
        flightDataResponse.scheduledArrivalUTCDateTime,
      scheduledDepartureUTCDateTime:
        flightDataResponse.scheduledDepartureUTCDateTime,
      isSubscribed: true,
      blockchainTxHash: transactionHash,
      blockchainUpdated: true,
    });

    const savedFlight = await newFlightData.save();

    // Step 7: Return success response
    return res.json({
      status: 200,
      message: "Successfully subscribed to flight",
      data: {
        ...savedFlight.toObject(),
        transactionHash: transactionHash,
      },
    });
  } catch (error) {
    console.error("Flight Subscription Error:", error);
    res.status(500).json({
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
          if (flight.currentPhase === "in" || flight.statusCode === "IN") {
            console.log(
              `[SCHEDULER] Skipping already arrived flight ${flight.flightNumber} for ${flight.scheduledDepartureDate}`
            );
            results.skipped++;
            continue;
          }

          // Fetch latest flight data
          const newFlightData = await fetchFlightFromDataSource(
            flight.flightNumber,
            flight.scheduledDepartureDate,
            flight.departureAirport,
            flight.carrierCode
          );

          if (!newFlightData) {
            console.log(
              `[SCHEDULER] No data found for flight ${flight.flightNumber}`
            );
            continue;
          }

          let shouldUpdate = false;
          let updateData = {};
          let newPhase = "";
          let newStatusCode = "";

          // Check for phase transitions
          // not_departed -> out
          if (
            flight.currentPhase === "not_departed" &&
            newFlightData.phase === "out"
          ) {
            shouldUpdate = true;
            newPhase = "out";
            newStatusCode = "OUT";
          }
          // out -> off
          else if (
            flight.currentPhase === "out" &&
            newFlightData.phase === "off"
          ) {
            shouldUpdate = true;
            newPhase = "off";
            newStatusCode = "OFF";
          }
          // off -> on
          else if (
            flight.currentPhase === "off" &&
            newFlightData.phase === "on"
          ) {
            shouldUpdate = true;
            newPhase = "on";
            newStatusCode = "ON";
          }
          // on -> in
          else if (
            flight.currentPhase === "on" &&
            newFlightData.phase === "in"
          ) {
            shouldUpdate = true;
            newPhase = "in";
            newStatusCode = "IN";
          }

          // Perform update if conditions are met
          if (shouldUpdate) {
            console.log(
              `[SCHEDULER] Updating flight ${flight.flightNumber} from ${flight.currentPhase} to ${newPhase}`
            );

            // Prepare update data with new status
            updateData = {
              ...newFlightData,
              currentPhase: newPhase,
              statusCode: newStatusCode,
            };

            // Update in blockchain first - using the existing insertFlightDetails method
            try {
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

              // Update these fields in our updateData for MongoDB
              updateData.outTimeUTC = outTimeUTC;
              updateData.offTimeUTC = offTimeUTC;
              updateData.onTimeUTC = onTimeUTC;
              updateData.inTimeUTC = inTimeUTC;

              // Prepare the flight data array for blockchain insert/update
              const flightData = [
                flight.flightNumber.toString(),
                flight.scheduledDepartureDate,
                flight.carrierCode,
                flight.arrivalCity || "",
                flight.departureCity || "",
                flight.arrivalAirport || "",
                flight.departureAirport || "",
                flight.operatingAirline || "",
                flight.arrivalGate || "",
                flight.departureGate || "",
                newPhase, // Use the new phase as flight status
                flight.equipmentModel || "",
              ];

              // Prepare UTC times array
              const utcTimes = [
                flight.actualArrivalUTC || "",
                flight.actualDepartureUTC || "",
                updateData.estimatedArrivalUTC || "",
                updateData.estimatedDepartureUTC || "",
                flight.scheduledArrivalUTCDateTime || "",
                flight.scheduledDepartureUTCDateTime || "",
              ];

              // Prepare status array
              const status = [
                newStatusCode, // Use the new status code
                newPhase, // Use the new phase as description
                outTimeUTC,
                offTimeUTC,
                onTimeUTC,
                inTimeUTC,
              ];

              console.log(
                `[BLOCKCHAIN] Updating flight status in blockchain for flight ${flight.flightNumber}`
              );

              // Call the insertFlightDetails method to update the flight in blockchain
              const blockchainResponse =
                await blockchainService.insertFlightDetails(
                  flightData,
                  utcTimes,
                  status
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
            const { _id, ...dataToUpdate } = updateData;
            await FlightData.findByIdAndUpdate(flight._id, dataToUpdate);

            console.log(
              `[SCHEDULER] Successfully updated flight ${flight.flightNumber} from ${flight.currentPhase} to ${newPhase}`
            );
            results.updated++;
          } else {
            console.log(
              `[SCHEDULER] No status change detected for flight ${flight.flightNumber}`
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
            // Prepare the flight data array
            const flightData = [
              flight.flightNumber.toString(),
              flight.scheduledDepartureDate,
              flight.carrierCode,
              flight.arrivalCity || "",
              flight.departureCity || "",
              flight.arrivalAirport || "",
              flight.departureAirport || "",
              flight.operatingAirline || "",
              flight.arrivalGate || "",
              flight.departureGate || "",
              flight.currentPhase,
              flight.equipmentModel || "",
            ];

            // Prepare UTC times array
            const utcTimes = [
              flight.actualArrivalUTC || "",
              flight.actualDepartureUTC || "",
              flight.estimatedArrivalUTC || "",
              flight.estimatedDepartureUTC || "",
              flight.scheduledArrivalUTCDateTime || "",
              flight.scheduledDepartureUTCDateTime || "",
            ];

            // Prepare status array
            const status = [
              flight.statusCode || "",
              flight.currentFlightStatus || "",
              flight.outTimeUTC || "",
              flight.offTimeUTC || "",
              flight.onTimeUTC || "",
              flight.inTimeUTC || "",
            ];

            console.log(
              `[BLOCKCHAIN] Retrying blockchain update for flight ${flight.flightNumber}`
            );

            // Update flight status in blockchain by re-inserting the data
            const blockchainResponse =
              await blockchainService.insertFlightDetails(
                flightData,
                utcTimes,
                status
              );

            // Mark as updated in MongoDB
            await FlightData.findByIdAndUpdate(flight._id, {
              blockchainUpdated: true,
              blockchainTxHash: blockchainResponse.transactionHash,
            });

            results.blockchainUpdated++;
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
        error.message
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
2. Keep track of flight phases: I've maintained the phase transition detection (not_departed → out → off → on → in) and mapped those to appropriate status codes.
3. Track timestamps for each phase: As the flight progresses through different phases, we update the appropriate timestamp (outTimeUTC, offTimeUTC, onTimeUTC, inTimeUTC).
4. Maintain blockchain transaction record: We store the transaction hash and update status in MongoDB.
   Added retry mechanism: For flights that failed to update in the blockchain, we have a retry process.

*/
// You'll need to implement this function in your blockchainService

export const getSubscribedFlight = async (req, res) => {
  try {
    const { flightNumber, scheduledDepartureDate, carrierCode } = req.body;

    // Fetch flight details and status from blockchain
    const response = await blockchainService.getFlightDetails(
      flightNumber,
      scheduledDepartureDate,
      carrierCode
    );

    // Validate response to avoid sending undefined data
    if (!response) {
      return res.status(404).json({ error: "Flight details not found" });
    }

    console.log("----->", response);

    res.status(200).json({
      message: "Flight details retrieved successfully",
      response,
    });
  } catch (error) {
    console.error("Error fetching flight details:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

// Initialize and start monitoring
startFlightStatusMonitoring();

export default {
  addFlightSubscription,
};
