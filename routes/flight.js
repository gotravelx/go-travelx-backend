import express from "express";
import {
  addFlightSubscription,
  getAllSubscriptionOfUser,
  getSubscribedFlights,
  unsubscribeFlights,
} from "../controllers/flight.js";
import { fetchFlightStatus } from "../controllers/api.js";
const router = express.Router(); // Use express.Router() to define routes

// Import the insertFlight controller

// Define a POST route to insert a flight
router.post("/add-flight-subscription", addFlightSubscription);
router.get("/get-flight-status/:flightNumber", fetchFlightStatus);
router.get("/subscribed-flights/:walletAddress", getSubscribedFlights);
router.get(
  "/subscribed-flights-details/:walletAddress",
  getAllSubscriptionOfUser
);
// Route to unsubscribe multiple flights
router.post("/subscriptions/unsubscribe", unsubscribeFlights);

// Export the router
export default router;
