// model/flightSubscription.js
import mongoose from "mongoose";

// Define the FlightSubscription schema
const flightSubscriptionSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: true, // User's wallet address (assumed to be a string)
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
      default: Date.now, // Default to the current date and time
    },
    blockchainTxHash: {
      type: String,
      required: true, // Blockchain transaction hash to track the subscription
    },
    flightSubscriptionStatus: {
      type: String,
      enum: ["subscribed", "cancelled", "active"],
      default: "subscribed", // Subscription status
    },
    isSubscriptionActive: {
      type: Boolean,
      default: true, // Default to active subscription
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

// Create the model for the FlightSubscription
const FlightSubscription = mongoose.model(
  "FlightSubscription",
  flightSubscriptionSchema
);

export default FlightSubscription;
