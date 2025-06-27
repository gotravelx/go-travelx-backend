// routes/airportCodes.js (unified routes for airport/station codes)
import express from "express";
import {
  createAirportCodesTable,
  createAirportCode,
  getAllAirportCodes,
  getAirportCode,
  updateAirportCode,
  deleteAirportCode,
  searchAirportCodes,
  bulkInsertFromFile,
  deleteAllAirportCodes,
} from "../controllers/AirportCodesController.js";

const router = express.Router();

// Table management routes
router.post("/table/create", createAirportCodesTable);
router.delete("/table/clear", deleteAllAirportCodes);

// CRUD operations
router.post("/", createAirportCode);
router.get("/", getAllAirportCodes);
router.get("/:code", getAirportCode);
router.put("/:code", updateAirportCode);
router.delete("/:code", deleteAirportCode);

// Bulk operations
router.post("/bulk-insert-file", bulkInsertFromFile); // Insert from airportCodeData.js

// Search operations
router.get("/search/airport-codes", searchAirportCodes);

export default router;
