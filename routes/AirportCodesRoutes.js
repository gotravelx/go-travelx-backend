// routes/airportCodes.js (unified routes for airport/station codes)
import express from "express";
import {
  createAirportCodesTable,
  createAirportCode,
  getAllAirportCodes,
} from "../controllers/AirportCodesController.js";

const router = express.Router();

// Table management routes
router.post("/table/create", createAirportCodesTable);
router.post("/", createAirportCode);
router.get("/", getAllAirportCodes);


export default router;
