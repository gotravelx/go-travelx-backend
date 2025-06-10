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
    blockchainTxHash: {
      type: String,
      required: true,
    },
    flightSubscriptionStatus: {
      type: String,
      enum: ["subscribed", "cancelled", "active"],
      default: "subscribed",
    },
    // userSubscription state needs to change 
    isSubscriptionActive: {
      type: Boolean,
      default: true,
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
