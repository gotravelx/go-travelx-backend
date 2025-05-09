import express from "express";
import {
  updateToCancelled,
  updateToDiverted,
  updateToIn,
  updateToMishap,
  updateToOff,
  updateToOn,
  updateToOut,
  updateToReturnedToAirport,
  updateToReturnedToGate,
} from "../controllers/simulate-flights.js";

const router = express.Router();

router.post("/status/out", updateToOut);
router.post("/status/off", updateToOff);
router.post("/status/on", updateToOn);
router.post("/status/in", updateToIn);
router.post("/status/cancelled", updateToCancelled);
router.post("/status/returned-to-gate", updateToReturnedToGate);
router.post("/status/returned-to-airport", updateToReturnedToAirport);
router.post("/status/diverted", updateToDiverted);
router.post("/status/mishap", updateToMishap);

export default router;
