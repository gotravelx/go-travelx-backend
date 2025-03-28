import express from "express";
import {
  addFlightSubscription,
  getAllSubscribedFlights,
  getSubscribedFlight,
} from "../controllers/flight.js";
import { fetchFlightDetails } from "../controllers/api.js";
const router = express.Router(); // Use express.Router() to define routes

// Import the insertFlight controller

// Define a POST route to insert a flight
router.post("/add-flight-subscription", addFlightSubscription);
router.post("/get-flight-details", getSubscribedFlight);
router.get("/get-flight-status/:flightNumber", fetchFlightDetails);
router.get("/get-all-subscribed-flights", getAllSubscribedFlights);

// Export the router
export default router;
