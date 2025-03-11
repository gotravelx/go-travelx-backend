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
  const INTERVAL = 48000; // 8 minutes (adjust if needed)

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
          break;
        case "out":
          nextPhase = "off";
          updateData.offTimeUTC = new Date().toISOString();
          break;
        case "off":
          nextPhase = "on";
          updateData.onTimeUTC = new Date().toISOString();
          break;
        case "on":
          nextPhase = "in";
          updateData.inTimeUTC = new Date().toISOString();
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
        `Flight ${flight.flightNumber} updated  to phase: ${nextPhase}`
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
    console.log(
      flightNumber,
      scheduledDepartureDate,
      departureAirport,
      carrierCode
    );

    if (
      !flightNumber ||
      !scheduledDepartureDate ||
      !departureAirport ||
      !carrierCode
    ) {
      throw new Error("Missing required parameters for flight data fetch");
    }

    const flight = await DataSource.findOne({
      flightNumber,
      scheduledDepartureDate,
      departureAirport,
      carrierCode,
    });

    console.log("flight -------->", flight);

    if (flight) {
      console.log(
        `[DATA SOURCE] Found flight ${flightNumber} in local database`
      );
      return flight;
    }

    // ✅ Fix: Return "Not found" before accessing flight.flightNumber
    console.log(`[DATA SOURCE] Flight not found in local database`);
    return { message: "Not found" };
  } catch (error) {
    console.error(`[DATA SOURCE ERROR] Failed to fetch flight data:`, error);
    throw new Error(`Failed to fetch flight data: ${error.message}`);
  }
};
