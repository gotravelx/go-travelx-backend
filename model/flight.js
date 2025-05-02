// model/flight.js
import mongoose from "mongoose";

const flightDataSchema = new mongoose.Schema(
  {
    flightNumber: {
      type: Number,
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
    arrivalState: String,
    departureState: String,
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
    MarketedFlightSegment: [
      {
        MarketingAirlineCode: String,
        FlightNumber: String,
      },
    ],
    boardingTime: String,
    isCanceled: {
      type: Boolean,
      default: false,
    },

    blockchainTxHash: {
      type: String,
    },
    blockchainUpdated: {
      type: Boolean,
      default: false,
    },
    isSubscribed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    index: {
      flightNumber: 1,
      flightOriginationDate: 1,
    },
  }
);

const FlightData = mongoose.model("FlightData", flightDataSchema);

export default FlightData;
