import mongoose from "mongoose";

const DataSourceSchema = new mongoose.Schema(
  {
    flightNumber: {
      type: String, // Changed from Number to String
      required: true,
    },
    scheduledDepartureDate: {
      type: String,
      required: true,
    },
    carrierCode: {
      type: String,
      required: true,
    },
    operatingAirline: String,
    estimatedArrivalUTC: String,
    estimatedDepartureUTC: String,
    actualDepartureUTC: String,
    actualArrivalUTC: String,
    scheduledArrivalUTCDateTime: String,
    scheduledDepartureUTCDateTime: String,
    outTimeUTC: String,
    offTimeUTC: String,
    onTimeUTC: String,
    inTimeUTC: String,
    arrivalCity: String,
    departureCity: String,
    arrivalStatus: String,
    departureStatus: String,
    arrivalAirport: String,
    departureAirport: String,
    departureGate: String,
    arrivalGate: String,
    departureTerminal: String,
    arrivalTerminal: String,
    equipmentModel: String,
    statusCode: String,
    flightStatusDescription: String,
    currentFlightStatus: {
      type: String,
      enum: ["ndpt", "out", "off", "on", "in"],
      default: "ndpt",
    },
    baggageClaim: String,
    departureDelayMinutes: {
      type: Number,
      default: 0,
    },
    arrivalDelayMinutes: {
      type: Number,
      default: 0,
    },
    marketedFlightSegment: [
      // Changed from MarketedFlightSegment to match JSON key
      {
        MarketingAirlineCode: String,
        FlightNumber: String,
      },
    ],
    boardingTime: String,
    isCanceled: Boolean, // Added this field from JSON
  },
  {
    timestamps: true,
  }
);

// Define index (Removed `flightOriginationDate`)
DataSourceSchema.index({ flightNumber: 1, scheduledDepartureDate: 1 });

const DataSource = mongoose.model("DataSource", DataSourceSchema);

export default DataSource;
