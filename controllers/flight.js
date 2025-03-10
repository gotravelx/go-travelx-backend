import schedule from "node-schedule";
import FlightData from "../model/flight.js";
import https from "https";
import dotenv from "dotenv";
import { fetchFlightData } from "./api.js";
import { response } from "express";
dotenv.config();

const agent = new https.Agent({
  rejectUnauthorized: false,
});

export const addFlightSubscription = async (req, res) => {
  try {
    const { flightNumber, scheduledDepartureDate, departureStation, carrierCode } = req.body;

    // Validate input
    if (!flightNumber || !scheduledDepartureDate || !carrierCode || !departureStation) {
      return res.status(400).json({
        error: "Missing required parameters",
      });
    }

    // Step 1: Check if flight exists in our MongoDB
    let flightRecord = await FlightData.findOne({
      flightNumber: Number(flightNumber),
      carrierCode: carrierCode,
      scheduledDepartureDate: scheduledDepartureDate
    });

    // If flight exists and is already subscribed
    if (flightRecord && flightRecord.isSubscribed) {
      return res.json({
        status: 200,
        message: "You have already subscribed to this flight",
        data: flightRecord
      });
    }

    let options = {};
    if (scheduledDepartureDate || departureStation) {
      options = {
        departureDate: scheduledDepartureDate,
        departure: departureStation
      };
    }

    const fetchedFlightData = await fetchFlightData(flightNumber, options);

    if (!fetchedFlightData.success) {
      return res.status(404).json({
        error: fetchedFlightData.errorMessage,
        details: fetchedFlightData.errorDetails
      });
    }

    // Create a new flight data object with all required fields
    const flightData = new FlightData({
      ...fetchedFlightData,
      flightNumber: Number(flightNumber), // Ensure flightNumber is a number
      carrierCode: carrierCode, // Use the carrierCode from request
      scheduledDepartureDate: scheduledDepartureDate, // Add this missing field
      isSubscribed: true
    });

    const newFlightAdd = await flightData.save();




    // Step 2: If not found in our database, check blockchain
    /*  if (!flightRecord) {
        try {
          // Fetch flight details from blockchain
          const blockchainFlightData =
            await flightBlockchainService.getFlightDetails(
              flightNumber,
              originationDate,
              carrierCode
            );
  
          console.log(
            "blockchainFlightData get flight details ---------- > ",
            blockchainFlightData
          );
  
          // Fetch additional details like UTC times
          const utcTimes = await flightBlockchainService.getFlightUTCTimes(
            flightNumber,
            originationDate,
            carrierCode
          );
  
          // fist subscribe for this function
  
          // insert flight data into blockchain
  
          // transection hash
  
          // Create a new FlightData record from blockchain
          flightRecord = new FlightData({
            ...blockchainFlightData,
            ...utcTimes,
            flightNumber: Number(flightNumber),
            flightOriginationDate: originationDate,
            operatingAirline: carrierCode,
          });
  
          // Save to our database for future use
          await flightRecord.save();
        } catch (blockchainError) {
          // If blockchain lookup fails, try external data source
          try {
            const externalFlightData = await fetchFlightFromDataSource(
              flightNumber,
              originationDate,
              carrierCode
            );
  
            flightRecord = new FlightData({
              ...externalFlightData.toObject(),
              flightNumber: Number(flightNumber),
              flightOriginationDate: originationDate,
              operatingAirline: carrierCode,
            });
  
            // check the status of the flight the save executed status
  
            // Save to our database
            await flightRecord.save();
          } catch (dataSourceError) {
            return res.status(404).json({
              error: "Flight not found in any data source",
              details: dataSourceError.message,
            });
          }
        }
      }
  */
    // Fetch detailed flight status
    /*  try {
        const flightStatus =
          await flightBlockchainService.checkDetailedFlightStatus(
            flightNumber,
            originationDate,
            carrierCode
          );
  
        // Merge status information
        flightRecord.set({
          flightStatusCode: flightStatus.flightStatusCode,
          flightStatusDescription: flightStatus.flightStatusDescription,
          outTimeUTC: flightStatus.outUtc,
          offTimeUTC: flightStatus.offUtc,
          onTimeUTC: flightStatus.onUtc,
          inTimeUTC: flightStatus.inUtc,
        });
      } catch (statusError) {
        console.warn("Could not fetch detailed flight status:", statusError);
      }
  */
    // Return the flight data

    return res.json({
      status: 200,
      message: "Successfully subscribed to flight",
      data: newFlightAdd
    });

  } catch (error) {
    console.error("Flight Search Error:", error);
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

          const newFlightData = await fetchFlightData(
            flight.flightNumber,
            flight.scheduledDepartureDate,
            flight.carrierCode
          );
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

// Initialize and start monitoring
startFlightStatusMonitoring();

export default {
  addFlightSubscription,
};
