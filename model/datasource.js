// model/flight.js
import mongoose from "mongoose";

const DataSourceSchema = new mongoose.Schema(
  {
    flightNumber: {
      type: Number,
      required: true,
    },
    flightOriginationDate: {
      type: String,
      required: true,
    },
    operatingAirline: {
      type: String,
      required: true,
    },
    estimatedArrivalUTC: String,
    estimatedDepartureUTC: String,
    actualDepartureUTC: String,
    actualArrivalUTC: String,
    outTimeUTC: String,
    offTimeUTC: String,
    onTimeUTC: String,
    inTimeUTC: String,
    arrivalCity: String,
    departureCity: String,
    departureGate: String,
    arrivalGate: String,
    departureTerminal: String,
    arrivalTerminal: String,
    flightStatus: String,
    statusCode: String,
    equipmentModel: String,
    phase: {
      type: String,
      enum: ["not_departed", "out", "off", "on", "in"],
      default: "not_departed",
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
    boardingTime: String,
    isCanceled: {
      type: Boolean,
      default: false,
    },
    scheduledArrivalUTCDateTime: String,
    scheduledDepartureUTCDateTime: String,
  },
  {
    timestamps: true,
    // Create a compound index for efficient queries
    index: {
      flightNumber: 1,
      flightOriginationDate: 1,
    },
  }
);

const DataSource = mongoose.model("DataSource", DataSourceSchema);

export default DataSource;
