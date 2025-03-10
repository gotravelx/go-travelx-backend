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
    let flightRecord = await FlightData.findOne({
      flightNumber: Number(flightNumber),
      carrierCode: carrierCode,
      scheduledDepartureDate: scheduledDepartureDate,
    });

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

    console.log("------> fetch from api ", flightDataResponse.flightNumber);
    if (!flightDataResponse)
      return res.status(404).json("Flight is not found ");

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
      flightStatus: flightDataResponse.flightStatus,
      statusCode: flightDataResponse.statusCode,
      equipmentModel: flightDataResponse.equipmentModel,
      phase: flightDataResponse.phase,
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
      }).sort({ updatedAt: -1 });

      console.log(
        `[SCHEDULER] Found ${recentFlights.length} recent flights to check for updates`
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
          if (flight.phase === "in" || flight.statusCode === "IN") {
            console.log(
              `[SCHEDULER] Skipping already arrived flight ${flight.flightNumber} for ${flight.scheduledDepartureDate}`
            );
            results.skipped++;
            continue;
          }

          // Status progression update logic

          let options = {};
          if (scheduledDepartureDate || departureStation) {
            options = {
              departureDate: scheduledDepartureDate,
              departure: departureStation,
            };
          }

          // fetch form costume data source
          // const fetchedFlightData = await fetchFlightData(flightNumber, options);
          const newFlightData = await fetchFlightFromDataSource(
            flightNumber,
            options.departureDate, // Ensure this is the correct date
            options.departure
          );

          // fetch from real time api

          // const newFlightData = await fetchFlightData(
          //   flight.flightNumber,
          //   flight.scheduledDepartureDate,
          //   flight.carrierCode
          // );

          let shouldUpdate = false;
          let updateData = {};

          // not_departed -> out
          if (
            flight.phase === "not_departed" &&
            newFlightData.phase === "out"
          ) {
            shouldUpdate = true;
            updateData = {
              ...newFlightData,
              phase: "out",
              blockchainUpdated: false,
            };
          }
          // out -> off
          else if (flight.phase === "out" && newFlightData.phase === "off") {
            shouldUpdate = true;
            updateData = {
              ...newFlightData,
              phase: "off",
              blockchainUpdated: false,
            };
          }
          // off -> on
          else if (flight.phase === "off" && newFlightData.phase === "on") {
            shouldUpdate = true;
            updateData = {
              ...newFlightData,
              phase: "on",
              blockchainUpdated: false,
            };
          }
          // on -> in
          else if (flight.phase === "on" && newFlightData.phase === "in") {
            shouldUpdate = true;
            updateData = {
              ...newFlightData,
              phase: "in",
              blockchainUpdated: false,
            };
          }

          // Perform update if conditions are met
          if (shouldUpdate) {
            console.log(
              `[SCHEDULER] Updating flight ${flight.flightNumber} for ${flight.scheduledDepartureDate}`
            );

            // Update in MongoDB
            await FlightData.findByIdAndUpdate(flight._id, updateData);

            console.log(
              `[SCHEDULER] Successfully updated flight ${flight.flightNumber} from ${flight.phase} to ${updateData.phase}`
            );
            results.updated++;
          } else {
            console.log(
              `[SCHEDULER] No update needed for flight ${flight.flightNumber}`
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

export const getSubscribedFlight = async (req, res) => {
  try {
    const { flightNumber, scheduledDepartureDate, carrierCode } = req.body;

    // Fetch flight details and status from blockchain
    const response = await blockchainService.getFlightDetails(
      flightNumber,
      scheduledDepartureDate,
      carrierCode
    );

    // const flightStatus = await blockchainService.getFlightStatus(
    //   flightNumber,
    //   scheduledDepartureDate,
    //   carrierCode
    // );

    // Validate response to avoid sending undefined data
    if (!response) {
      return res.status(404).json({ error: "Flight details not found" });
    }

    // if (!flightStatus) {
    //   return res.status(404).json({ error: "Flight status not available" });
    // }

    // Return a well-structured response
    res.status(200).json({
      message: "Flight details retrieved successfully",
      data: response,
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
