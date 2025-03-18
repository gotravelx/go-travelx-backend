import DataSource from "../model/datasource.js";

export const createFlight = async (flightData) => {
  try {
    const flight = new DataSource({
      ...flightData,
      phase: "not_departed",
      outTimeUTC: null,
      offTimeUTC: null,
      onTimeUTC: null,
      inTimeUTC: null,
    });

    const savedFlight = await flight.save();
    console.log("New flight created:", savedFlight);

    // Start automatic status updates
    autoUpdateFlightStatus(savedFlight._id);
  } catch (error) {
    console.error("Error creating flight:", error);
  }
};

export const autoUpdateAllFlights = async () => {
  try {
    const flights = await DataSource.find({}, "_id"); // Get only IDs
    if (!flights.length) {
      console.log("No flights found in the database.");
      return;
    }

    console.log(`Found ${flights.length} flights. Starting updates...`);

    for (const flight of flights) {
      autoUpdateFlightStatus(flight._id);
    }
  } catch (error) {
    console.error("Error fetching flights:", error);
  }
};

// Function to update flight status automatically
export const autoUpdateFlightStatus = async (flightId) => {
  const INTERVAL = 300000; // 5 minutes

  const updateLoop = async () => {
    try {
      const flight = await DataSource.findById(flightId);
      if (!flight) {
        console.log(`Flight with ID ${flightId} not found.`);
        return;
      }

      let nextPhase = flight.phase;
      let updateData = {};

      switch (flight.phase) {
        case "not_departed":
          nextPhase = "out";
          updateData.outTimeUTC = new Date().toISOString();
          updateData.flightStatus = "Departed from gate";
          break;
        case "out":
          nextPhase = "off";
          updateData.offTimeUTC = new Date().toISOString();
          updateData.actualDepartureUTC = new Date().toISOString(); // Added actual departure time
          updateData.flightStatus = "In air";
          break;
        case "off":
          nextPhase = "on";
          updateData.onTimeUTC = new Date().toISOString();
          updateData.flightStatus = "Landing";
          break;
        case "on":
          nextPhase = "in";
          updateData.inTimeUTC = new Date().toISOString();
          updateData.actualArrivalUTC = new Date().toISOString(); // Added actual arrival time
          updateData.flightStatus = "Arrived at gate";
          break;
        case "in":
          console.log(`Flight ${flight.flightNumber} has already arrived.`);
          return;
        case "canceled":
          console.log(
            `Flight ${flight.flightNumber} is canceled. No updates required.`
          );
          return;
        default:
          console.log(`Unknown phase for flight ${flight.flightNumber}.`);
          return;
      }

      // Update the flight phase in DB
      updateData.phase = nextPhase;
      await DataSource.findByIdAndUpdate(flightId, updateData, {
        new: true,
      });

      console.log(
        `Flight ${flight.flightNumber} updated to phase: ${nextPhase}`
      );

      // Schedule next update only if not arrived
      if (nextPhase !== "in") {
        setTimeout(updateLoop, INTERVAL);
      }
    } catch (error) {
      console.error("Error updating flight phase:", error);
    }
  };

  updateLoop(); // Start updating immediately
};
export const fetchFlightFromDataSource = async (
  flightNumber,
  scheduledDepartureDate,
  departureAirport,
  carrierCode
) => {
  try {
    console.log("Querying MongoDB with:", {
      flightNumber,
      scheduledDepartureDate,
      departureAirport,
      carrierCode,
    });

    if (
      !flightNumber ||
      !scheduledDepartureDate ||
      !departureAirport ||
      !carrierCode
    ) {
      throw new Error("Missing required parameters for flight data fetch");
    }

    console.log(
      "------->",
      "flightNumber:",
      Number(flightNumber),
      "scheduledDepartureDate:",
      scheduledDepartureDate.trim(),
      "departureAirport:",
      departureAirport.trim().toUpperCase(),
      "carrierCode:",
      carrierCode.trim().toUpperCase()
    );

    const flight = await DataSource.findOne({
      flightNumber: Number(flightNumber), // Convert to number
      scheduledDepartureDate: scheduledDepartureDate.trim(), // Trim extra spaces
      departureAirport: departureAirport.trim().toUpperCase(), // Standardize format
      carrierCode: carrierCode.trim().toUpperCase(),
    });

    console.log("flight -------->", flight);

    if (flight) {
      console.log(
        `[DATA SOURCE] Found flight ${flightNumber} in local database`
      );
      return flight;
    }

    console.log(`[DATA SOURCE] Flight not found in local database`);
    return { message: "Flight is not found" };
  } catch (error) {
    console.error(`[DATA SOURCE ERROR] Failed to fetch flight data:`, error);
    throw new Error(`Failed to fetch flight data: ${error.message}`);
  }
};
