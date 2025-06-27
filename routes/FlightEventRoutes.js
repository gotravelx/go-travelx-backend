import express from "express";
import { fetchFlightDetails } from "../controllers/UnitedApiController.js";
import { decryptFlightData } from "../controllers/EncryptController.js";
import { clearFlightEventTableData, createFlightEventTable, getHistoricalData } from "../controllers/FlightEventController.js";


const router = express.Router();

/* ================== table route's start =========================*/ 
router.get("/get-flight-status/:flightNumber", fetchFlightDetails)
router.post("/decrypt-flight-data", decryptFlightData);
router.get("/fetch-historical/:flightNumber/date-range", getHistoricalData);
/* ================== table route's end =========================*/ 


/* ================== table route's start =========================*/ 
router.get("/create-table", createFlightEventTable);
router.get("/clear-table", clearFlightEventTableData);
/* ================== table route's end   =========================*/

export default router;
