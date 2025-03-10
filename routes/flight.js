import express from "express";
import {
  addFlightSubscription,
  getSubscribedFlight,
} from "../controllers/flight.js";
const router = express.Router(); // Use express.Router() to define routes

// Import the insertFlight controller

// Define a POST route to insert a flight
router.post("/add-flight-subscription", addFlightSubscription);
router.get("/gte-flight-details", getSubscribedFlight);

// Export the router
export default router;
