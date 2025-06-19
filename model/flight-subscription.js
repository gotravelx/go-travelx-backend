import mongoose from "mongoose";

const flightSubscriptionSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: true,
    },
    flightNumber: {
      type: String,
      required: true,
    },
    departureAirport: {
      type: String,
      required: true,
    },
    arrivalAirport: {
      type: String,
      required: true,
    },
    subscriptionDate: {
      type: Date,
      default: Date.now,
    },
    isSubscriptionActive: {
      type: Boolean,
      default: true,
    },
    blockchainTxHash: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const FlightSubscription = mongoose.model(
  "FlightSubscription",
  flightSubscriptionSchema
);

export default FlightSubscription;
