import express from "express";
import { searchFlight } from "../controllers/flight.js";
const router = express.Router(); // Use express.Router() to define routes

// Import the insertFlight controller

// Define a POST route to insert a flight
router.post("/search-flight", searchFlight);

// Export the router
export default router;
