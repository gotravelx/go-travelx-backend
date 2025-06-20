import schedule from "node-schedule";
import FlightData from "../model/flight.js";

import { prepareFlightDataForBlockchain } from "./encrypt.js";
import blockchainService from "../utils/flightBlockchainService.js";
import customLogger from "../utils/logger.js";
import { fetchFlightData } from "./api.js";

const encryptionKey = process.env.ENCRYPTION_KEY;

const getCurrentUTCTime = () => {
  return new Date().toISOString();
};

const calculateDepartureState = (flight) => {
  if (flight.isCanceled) {
    return "CNL";
  }

  const scheduledTime = new Date(flight.scheduledDepartureUTCDateTime);
  const estimatedTime = flight.estimatedDepartureUTC
    ? new Date(flight.estimatedDepartureUTC)
    : null;
  const actualTime = flight.actualDepartureUTC
    ? new Date(flight.actualDepartureUTC)
    : null;

  const delayThresholdMinutes = 15;

  // Calculate departure delay in minutes if we have the necessary data
  if (estimatedTime && scheduledTime) {
    const delayMs = estimatedTime - scheduledTime;
    const delayMinutes = Math.floor(delayMs / (1000 * 60));
    if (delayMinutes > 0) {
      flight.departureDelayMinutes = delayMinutes;
    }
  } else if (actualTime && scheduledTime) {
    const delayMs = actualTime - scheduledTime;
    const delayMinutes = Math.floor(delayMs / (1000 * 60));
    if (delayMinutes > 0) {
      flight.departureDelayMinutes = delayMinutes;
    }
  }

  if (
    estimatedTime &&
    (estimatedTime - scheduledTime) / (1000 * 60) >= delayThresholdMinutes
  ) {
    return "DLY";
  }

  if (actualTime && actualTime > scheduledTime) {
    return "DLY";
  }

  if (flight.decisionTimeUTC) {
    const decisionTime = new Date(flight.decisionTimeUTC);
    if (decisionTime > scheduledTime) {
      return "PND";
    }
  }

  if (flight.isDiverted) {
    return "DIV";
  }

  if (flight.isExtraStop) {
    return "XSP";
  }

  if (flight.isNoStop) {
    return "NSP";
  }

  if (flight.hasMishap) {
    return "LCK";
  }

  return "ONT";
};

const calculateArrivalState = (flight) => {
  if (flight.isCanceled) {
    return "CNL";
  }

  const scheduledTime = new Date(flight.scheduledArrivalUTCDateTime);
  const estimatedTime = flight.estimatedArrivalUTC
    ? new Date(flight.estimatedArrivalUTC)
    : null;
  const actualTime = flight.actualArrivalUTC
    ? new Date(flight.actualArrivalUTC)
    : null;

  const timeThresholdMinutes = 15;

  // Calculate arrival delay in minutes if we have the necessary data
  if (estimatedTime && scheduledTime) {
    const delayMs = estimatedTime - scheduledTime;
    const delayMinutes = Math.floor(delayMs / (1000 * 60));
    if (delayMinutes > 0) {
      flight.arrivalDelayMinutes = delayMinutes;
    }
  } else if (actualTime && scheduledTime) {
    const delayMs = actualTime - scheduledTime;
    const delayMinutes = Math.floor(delayMs / (1000 * 60));
    if (delayMinutes > 0) {
      flight.arrivalDelayMinutes = delayMinutes;
    }
  }

  if (
    estimatedTime &&
    (scheduledTime - estimatedTime) / (1000 * 60) >= timeThresholdMinutes
  ) {
    return "ERL";
  }

  if (actualTime && actualTime < scheduledTime) {
    return "ERL";
  }

  if (
    estimatedTime &&
    (estimatedTime - scheduledTime) / (1000 * 60) >= timeThresholdMinutes
  ) {
    return "DLY";
  }

  if (actualTime && actualTime > scheduledTime) {
    return "DLY";
  }

  if (flight.decisionTimeUTC) {
    return "PND";
  }

  if (flight.isDiverted) {
    return "DVT";
  }

  if (flight.isExtraStop) {
    return "XST";
  }

  if (flight.isNoStop) {
    return "NST";
  }

  if (flight.hasMishap) {
    return "LCK";
  }

  return "ONT";
};

const updateFlightStates = (flight) => {
  flight.departureState = calculateDepartureState(flight);
  flight.arrivalState = calculateArrivalState(flight);
  return flight;
};

const statusDescriptions = {
  ndpt: "Not Departed",
  out: "Departed Gate",
  off: "In Flight",
  on: "Landed",
  in: "Arrived at Gate",
  cncl: "Cancelled",
  rtbl: "Returned to Gate",
  rtfl: "Returned to Airport",
  dvrt: "Diverted",
  lock: "Contact United",
};

const determinePhaseTransition = (currentPhase, newPhase) => {
  const validTransitions = {
    "ndpt-out": { statusCode: "OUT", description: statusDescriptions.out },
    "out-off": { statusCode: "OFF", description: statusDescriptions.off },
    "off-on": { statusCode: "ON", description: statusDescriptions.on },
    "on-in": { statusCode: "IN", description: statusDescriptions.in },
    "any-cncl": { statusCode: "CNCL", description: statusDescriptions.cncl },
    "any-rtbl": { statusCode: "RTBL", description: statusDescriptions.rtbl },
    "any-rtfl": { statusCode: "RTFL", description: statusDescriptions.rtfl },
    "any-dvrt": { statusCode: "DVRT", description: statusDescriptions.dvrt },
    "any-lock": { statusCode: "LOCK", description: statusDescriptions.lock },
    "off-out": { statusCode: "OUT", description: statusDescriptions.out },
    "on-off": { statusCode: "OFF", description: statusDescriptions.off },
    "in-on": { statusCode: "ON", description: statusDescriptions.on },
  };

  // Check for standard progression
  const transitionKey = `${currentPhase}-${newPhase}`;
  if (validTransitions[transitionKey]) {
    return {
      shouldUpdate: true,
      ...validTransitions[transitionKey],
    };
  }

  // Check for transitions to exceptional states (from any state)
  if (["cncl", "rtbl", "rtfl", "dvrt", "lock"].includes(newPhase)) {
    const exceptionTransitionKey = `any-${newPhase}`;
    if (validTransitions[exceptionTransitionKey]) {
      return {
        shouldUpdate: true,
        ...validTransitions[exceptionTransitionKey],
      };
    }
  }

  // No valid transition found
  return { shouldUpdate: false };
};

export const startFlightStatusMonitoring = () => {
  // Run every 3 minutes (using */3 as specified in the comment)
  const job = schedule.scheduleJob("*/1 * * * *", async () => {
    try {
      customLogger.info(
        "[CRON-JOB] Running scheduled flight status update check..."
      );

      // Get current date in YYYY-MM-DD format
      const currentDate = new Date().toISOString().split("T")[0];

      // First, check and ensure we have today's flights
      await checkAndCreateTodaysFlights(currentDate);

      const todaysFlights = await FlightData.find({
        scheduledDepartureDate: currentDate,
      });

      customLogger.info(
        `[CRON-JOB] Found ${todaysFlights.length} flights for today (${currentDate})`
      );

      const results = {
        total: todaysFlights.length,
        updated: 0,
        failed: 0,
        skipped: 0,
        blockchainUpdated: 0,
      };

      for (const flight of todaysFlights) {
        try {
          customLogger.info(
            `[CRON-JOB] Processing flight ${flight.flightNumber} with status: ${flight.currentFlightStatus} (${flight.statusCode})`
          );

          // Skip already completed flights that arrived at gate
          if (
            flight.currentFlightStatus === "in" ||
            flight.statusCode === "IN"
          ) {
            customLogger.info(
              `[CRON-JOB] Skipping already arrived flight ${flight.flightNumber} for ${flight.scheduledDepartureDate}`
            );
            results.skipped++;
            continue;
          }

          // Skip cancelled flights
          if (
            flight.currentFlightStatus === "cncl" ||
            flight.statusCode === "CNCL"
          ) {
            customLogger.info(
              `[CRON-JOB] Skipping cancelled flight ${flight.flightNumber} for ${flight.scheduledDepartureDate}`
            );
            results.skipped++;
            continue;
          }

          // Fetch latest flight data from external API
          customLogger.info(
            `[CRON-JOB] Fetching latest data for flight ${flight.flightNumber}`
          );

          const newFlightData = await fetchFlightData(
            flight.flightNumber, 
            flight.scheduledDepartureDate,
            flight.departureAirport
          );

          if (!newFlightData) {
            customLogger.info(
              `[CRON-JOB] No data found for flight ${flight.flightNumber}`
            );
            results.skipped++;
            continue;
          }

          // Determine the new flight phase from the API response
          const newPhase =
            newFlightData.phase || newFlightData.currentFlightStatus || "";
          const currentPhase = flight.currentFlightStatus || "ndpt";

          // Check for valid phase transition
          const { shouldUpdate, statusCode, description } =
            determinePhaseTransition(currentPhase, newPhase);

          // Perform update if a valid transition is found
          if (shouldUpdate) {
            customLogger.info(
              `[CRON-JOB] Updating flight ${flight.flightNumber} from ${currentPhase} to ${newPhase}`
            );

            // Set the appropriate UTC time based on the phase
            let outTimeUTC = flight.outTimeUTC || "";
            let offTimeUTC = flight.offTimeUTC || "";
            let onTimeUTC = flight.onTimeUTC || "";
            let inTimeUTC = flight.inTimeUTC || "";
            let actualDepartureUTC = flight.actualDepartureUTC || "";
            let actualArrivalUTC = flight.actualArrivalUTC || "";

            // Current time for timestamp
            const currentUTC = getCurrentUTCTime();

            // Prepare update data with new status
            const updateData = {
              ...newFlightData,
              currentFlightStatus: newPhase,
              statusCode,
              flightStatusDescription: description,
              outTimeUTC,
              offTimeUTC,
              onTimeUTC,
              inTimeUTC,
              actualDepartureUTC,
              actualArrivalUTC,
              blockchainUpdated: false, // Initially mark as not updated in blockchain
            };

            // Update the appropriate time fields based on new phase
            switch (newPhase) {
              case "out":
                outTimeUTC = currentUTC;
                actualDepartureUTC = currentUTC;
                break;
              case "off":
                offTimeUTC = currentUTC;
                if (!actualDepartureUTC) actualDepartureUTC = currentUTC;
                break;
              case "on":
                onTimeUTC = currentUTC;
                break;
              case "in":
                inTimeUTC = currentUTC;
                actualArrivalUTC = currentUTC;
                break;
              // Additional cases for exceptional states
              case "cncl":
                // Set isCanceled flag for cancellation
                updateData.isCanceled = true;
                break;
              case "rtbl":
                // Set isReturnedToGate flag
                updateData.isReturnedToGate = true;
                break;
              case "rtfl":
                // Set isReturnedToAirport flag
                updateData.isReturnedToAirport = true;
                break;
              case "dvrt":
                // Set isDiverted flag
                updateData.isDiverted = true;
                // If the API provides a divertedTo field, update the arrival airport
                if (newFlightData.divertedTo) {
                  updateData.arrivalAirport = newFlightData.divertedTo;
                }
                break;
              case "lock":
                // Set hasMishap flag
                updateData.hasMishap = true;
                break;
            }

            // Apply state calculations (departure/arrival state)
            const mergedFlightData = {
              ...flight.toObject(),
              ...updateData,
            };
            updateFlightStates(mergedFlightData);

            // Include calculated states in the update
            updateData.departureState = mergedFlightData.departureState;
            updateData.arrivalState = mergedFlightData.arrivalState;

            // Update in blockchain
            try {
              // Use the existing helper function to prepare data for blockchain
              const {
                blockchainFlightData,
                blockchainUtcTimes,
                blockchainStatusData,
                marketingAirlineCodes,
                marketingFlightNumbers,
              } = prepareFlightDataForBlockchain(
                mergedFlightData,
                encryptionKey
              );

              customLogger.info(
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
              customLogger.error(
                `[BLOCKCHAIN ERROR] Failed to update blockchain for flight ${flight.flightNumber}: ${blockchainError.message}`
              );

              // Mark blockchain as needing update
              updateData.blockchainUpdated = false;
            }

            // Update in MongoDB
            await FlightData.findByIdAndUpdate(flight._id, updateData);

            customLogger.info(
              `[CRON-JOB] Successfully updated flight ${flight.flightNumber} from ${currentPhase} to ${newPhase}`
            );
            results.updated++;
          } else {
            customLogger.info(
              `[CRON-JOB] No valid phase transition detected for flight ${flight.flightNumber} (current: ${currentPhase}, new: ${newPhase})`
            );
            results.skipped++;
          }
        } catch (flightError) {
          customLogger.error(
            `[CRON-JOB ERROR] Error updating flight ${flight.flightNumber}:${flightError.message}`
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

        customLogger.info(
          `[CRON-JOB] Found ${pendingBlockchainUpdates.length} flights pending blockchain updates`
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
            } = prepareFlightDataForBlockchain(flight, encryptionKey);

            customLogger.warn(
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

            customLogger.warn(
              `[BLOCKCHAIN] Successfully updated pending flight ${flight.flightNumber} in blockchain`
            );
          } catch (retryError) {
            customLogger.error(
              `[BLOCKCHAIN ERROR] Failed to retry blockchain update for flight ${flight.flightNumber}:`,
              retryError.message
            );
          }
        }
      } catch (pendingError) {
        customLogger.error(
          `[CRON-JOB ERROR] Error processing pending blockchain updates:`,
          pendingError.message
        );
      }

      customLogger.info(
        `[CRON-JOB] Scheduled flight status update completed. Results: ${JSON.stringify(
          results
        )}`,
        new Date()
      );
    } catch (error) {
      customLogger.error(
        `[CRON-JOB ERROR] Error in scheduled flight status update:`,
        error.message,
        error.stack
      );
    }
  });

  customLogger.info(
    "[CRON-JOB] Flight status monitoring started - checking every 3 minutes"
  );
  return job;
};

/**
 * Checks if today's flights exist and creates them from yesterday's data if needed
 * This function runs on every cron job execution to ensure we have the latest data
 * @param {string} currentDate - The current date in YYYY-MM-DD format
 */
async function checkAndCreateTodaysFlights(currentDate) {
  try {
    customLogger.info(
      `[FLIGHT-CHECK] Checking flights for date ${currentDate}...`
    );

    const subscribedFlights = await FlightData.find({});

    customLogger.info(
      `[FLIGHT-CHECK] Found ${subscribedFlights.length} subscribed flight numbers`
    );

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const flightNumber of subscribedFlights) {
      try {
        const existingTodayFlight = await FlightData.findOne({
          flightNumber: flightNumber,
          scheduledDepartureDate: currentDate,
        });

        if (existingTodayFlight) {
          skipped++;
          continue;
        }

        const yesterdayFlight = await FlightData.findOne({
          flightNumber: flightNumber,
          scheduledDepartureDate: yesterdayStr,
        });

        if (!yesterdayFlight) {
          customLogger.warn(
            `[FLIGHT-CHECK] No previous data found for flight ${flightNumber} for yesterday (${yesterdayStr})`
          );
          skipped++;
          continue;
        }

        // Fetch latest flight data from external API for today's date
        const newFlightData = await fetchFlightData(
          flightNumber,
          currentDate,
          yesterdayFlight.departureAirport
        );

        if (!newFlightData) {
          customLogger.warn(
            `[FLIGHT-CHECK] No data found for flight ${flightNumber} for today (${currentDate})`
          );
          skipped++;
          continue;
        }

        // Create a new flight entry for today based on yesterday's flight and new data
        const newFlightEntry = new FlightData({
          ...newFlightData,
          flightNumber: flightNumber,
          departureAirport: yesterdayFlight.departureAirport,
          arrivalAirport: yesterdayFlight.arrivalAirport,
          scheduledDepartureDate: currentDate,
          currentFlightStatus: newFlightData.currentFlightStatus || "ndpt",
          statusCode: newFlightData.statusCode || "NDPT",
          isSubscribed: true, // Mark as subscribed since we're tracking it
          createdAt: new Date(),
          lastUpdated: new Date(),
          blockchainUpdated: false,
        });

        // Save to MongoDB
        await newFlightEntry.save();

        // Update blockchain with initial flight data
        try {
          const {
            blockchainFlightData,
            blockchainUtcTimes,
            blockchainStatusData,
            marketingAirlineCodes,
            marketingFlightNumbers,
          } = prepareFlightDataForBlockchain(newFlightEntry, encryptionKey);

          const blockchainResponse =
            await blockchainService.insertFlightDetails(
              blockchainFlightData,
              blockchainUtcTimes,
              blockchainStatusData,
              marketingAirlineCodes,
              marketingFlightNumbers
            );

          // Mark as updated in blockchain
          await FlightData.findByIdAndUpdate(newFlightEntry._id, {
            blockchainUpdated: true,
            blockchainTxHash: blockchainResponse.transactionHash,
          });

          customLogger.info(
            `[FLIGHT-CHECK] Successfully created and tracked flight ${newFlightEntry.flightNumber} for today (${currentDate})`
          );
          created++;
        } catch (blockchainError) {
          customLogger.error(
            `[BLOCKCHAIN ERROR] Failed to update blockchain for new flight ${newFlightEntry.flightNumber}: ${blockchainError.message}`
          );
          // Will be retried in the main flight status update routine
        }
      } catch (flightError) {
        customLogger.error(
          `[FLIGHT-CHECK ERROR] Error creating flight ${flightNumber} for today: ${flightError.message}`
        );
        failed++;
      }
    }

    customLogger.info(
      `[FLIGHT-CHECK] Flight checking completed. Results: Created: ${created}, Skipped: ${skipped}, Failed: ${failed}`
    );
  } catch (error) {
    customLogger.error(
      `[FLIGHT-CHECK ERROR] Error in checking today's flights: ${error.message}`
    );
  }
}
