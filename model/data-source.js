import mongoose from "mongoose";

const DataSourceSchema = new mongoose.Schema(
  {
    flightNumber: {
      type: String,
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
    arrivalState: {
      type: String,
      enum: ["ONT", "ERL", "DLY", "CNL", "PND", "DVT", "XST", "NST", "LCK"],
      default: "ONT", // On Time is default
    },
    departureState: {
      type: String,
      enum: ["ONT", "DLY", "CNL", "PND", "DIV", "XSP", "NSP", "LCK"],
      default: "ONT", // On Time is default
    },
    arrivalAirport: String,
    departureAirport: String,
    departureGate: String,
    arrivalGate: String,
    departureTerminal: String,
    arrivalTerminal: String,
    equipmentModel: String,
    statusCode: {
      type: String,
      enum: [
        "NDPT",
        "OUT",
        "OFF",
        "ON",
        "IN",
        "CNCL",
        "RTBL",
        "RTFL",
        "DVRT",
        "LOCK",
      ],
      default: "NDPT",
    },
    flightStatusDescription: {
      type: String,
      enum: [
        "Not Departed",
        "Departed Gate",
        "In Flight",
        "Landed",
        "Arrived at Gate",
        "Cancelled",
        "Returned to Gate",
        "Returned to Airport",
        "Diverted",
        "Contact United",
      ],
      default: "Not Departed",
    },
    currentFlightStatus: {
      type: String,
      enum: [
        "ndpt",
        "out",
        "off",
        "on",
        "in",
        "cncl",
        "rtbl",
        "rtfl",
        "dvrt",
        "lock",
      ],
      default: "ndpt",
    },
    bagClaim: String,
    departureDelayMinutes: {
      type: Number,
      default: 0,
    },
    arrivalDelayMinutes: {
      type: Number,
      default: 0,
    },
    marketedFlightSegment: [
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
    isDiverted: {
      type: Boolean,
      default: false,
    },
    isReturnedToGate: {
      type: Boolean,
      default: false,
    },
    isReturnedToAirport: {
      type: Boolean,
      default: false,
    },
    isExtraStop: {
      type: Boolean,
      default: false,
    },
    isNoStop: {
      type: Boolean,
      default: false,
    },
    hasMishap: {
      type: Boolean,
      default: false,
    },
    decisionTimeUTC: String,
  },
  {
    timestamps: true,
  }
);

DataSourceSchema.index({ flightNumber: 1, scheduledDepartureDate: 1 });

const DataSource = mongoose.model("DataSource", DataSourceSchema);

export default DataSource;
