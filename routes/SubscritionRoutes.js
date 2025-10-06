import express from "express";
import {
  addFlightSubscription,
  clearFlightSubscriptionTableData,
  createFlightSubscriptionTable,
  getSubscribedFlights,
  unsubscribeFlight,
} from "../controllers/FlightSubscriptionController.js";
import { validateToken } from "../middleware/validateToken.js";

const router = express.Router();

router.post("/add-flight-subscription",validateToken, addFlightSubscription);
router.get("/create-table",validateToken, createFlightSubscriptionTable);
router.get("/clear-table",validateToken, clearFlightSubscriptionTableData);
router.get("/get-flight-subscriptions", validateToken,getSubscribedFlights);
router.post("/unsubscribe-flight",validateToken, unsubscribeFlight);

export default router;
