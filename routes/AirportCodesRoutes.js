// routes/airportCodes.js (unified routes for airport/station codes)
import express from "express";
import {
  createAirportCodesTable,
  createAirportCode,
  getAllAirportCodes,
} from "../controllers/AirportCodesController.js";
import { validateToken } from "../middleware/validateToken.js";

const router = express.Router();

// Protect routes with validateToken middleware
router.post("/table/create", validateToken, createAirportCodesTable);
router.post("/", validateToken, createAirportCode);
router.get("/", validateToken, getAllAirportCodes);



export default router;
