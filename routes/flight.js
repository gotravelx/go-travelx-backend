import express from "express";
import { getHistoricalFlights, searchFlight } from "../controllers/flight.js";
const router = express.Router();  // Use express.Router() to define routes

// Import the insertFlight controller

// Define a POST route to insert a flight
router.post("/search-flight", searchFlight);

// Route to get historical flight data
router.get('/historical', getHistoricalFlights);

// Export the router
export default router;