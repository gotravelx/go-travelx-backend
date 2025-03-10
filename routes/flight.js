import express from "express";
import { addFlightSubscription } from "../controllers/flight.js";
const router = express.Router(); // Use express.Router() to define routes

// Import the insertFlight controller

// Define a POST route to insert a flight
router.post("/add-flight-subscription", addFlightSubscription);

// Export the router
export default router;
