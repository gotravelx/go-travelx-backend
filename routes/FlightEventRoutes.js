import express from "express";
import { fetchFlightDetails } from "../controllers/UnitedApiController.js";
import { decryptFlightData } from "../controllers/EncryptController.js";
import { clearFlightEventTableData, createFlightEventTable,   getAllFlightDetails,   getHistoricalData  } from "../controllers/FlightEventController.js";
import { validateToken } from "../middleware/validateToken.js";


const router = express.Router();

/* ================== table route's start =========================*/ 
router.get("/get-flight-status/:flightNumber",validateToken, fetchFlightDetails)
router.post("/decrypt-flight-data",validateToken, decryptFlightData);
router.get("/fetch-historical/:flightNumber/date-range",validateToken, getHistoricalData);
/* ================== table route's end =========================*/ 

router.get("/get-all-flights",validateToken, getAllFlightDetails);


/* ================== table route's start =========================*/ 
router.get("/create-table",validateToken, createFlightEventTable);
router.get("/clear-table",validateToken, clearFlightEventTableData);
/* ================== table route's end   =========================*/
export default router;
