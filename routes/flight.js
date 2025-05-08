import express from "express";
import {
  addFlightSubscription,
  getAllSubscriptionOfUser,
  getHistoricalData,
  getSubscribedFlights,
  unsubscribeFlights,
} from "../controllers/flight.js";
import {
  updateToIn,
  fetchFlightStatus,
  updateToOff,
  updateToOn,
  updateToOut,
} from "../controllers/api.js";
import { decryptFlightData } from "../controllers/encrypt.js";

const router = express.Router();

router.post("/add-flight-subscription", addFlightSubscription);
router.get("/get-flight-status/:flightNumber", fetchFlightStatus);
router.get("/all-subscribed-flights/:walletAddress", getSubscribedFlights);
router.get(
  "/subscribed-flights-details/:walletAddress",
  getAllSubscriptionOfUser
);
router.post("/subscriptions/unsubscribe", unsubscribeFlights);
router.post("/update/ndpt-to-out", updateToOut);
router.post("/update/out-to-off", updateToOff);
router.post("/update/off-to-on", updateToOn);
router.post("/update/on-to-in", updateToIn);
router.post("/decrypt-flight-data", decryptFlightData);
router.get("/fetch-historical/:flightNumber/date-range", getHistoricalData);

export default router;
