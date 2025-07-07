import express from "express";
import {
  addFlightSubscription,
  clearFlightSubscriptionTableData,
  createFlightSubscriptionTable,
  getSubscribedFlights,
  unsubscribeFlight,
} from "../controllers/FlightSubscriptionController.js";

const router = express.Router();

router.post("/add-flight-subscription", addFlightSubscription);
router.get("/create-table", createFlightSubscriptionTable);
router.get("/clear-table", clearFlightSubscriptionTableData);
router.get("/get-flight-subscriptions", getSubscribedFlights);
router.post("/unsubscribe-flight", unsubscribeFlight);

export default router;
