import express from "express";
import {
  addFlightSubscription,
  getAllSubscriptionOfUser,
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
const router = express.Router(); // Use express.Router() to define routes

// Import the insertFlight controller

// Define a POST route to insert a flight
router.post("/add-flight-subscription", addFlightSubscription);
router.get("/get-flight-status/:flightNumber", fetchFlightStatus);
router.get("/all-subscribed-flights/:walletAddress", getSubscribedFlights);
router.get(
  "/subscribed-flights-details/:walletAddress",
  getAllSubscriptionOfUser
);
// Route to unsubscribe multiple flights
router.post("/subscriptions/unsubscribe", unsubscribeFlights);

// flight simulation api 'start here -----------------------------------

router.post("/update/ndpt-to-out", updateToOut);
router.post("/update/out-to-off", updateToOff);
router.post("/update/off-to-on", updateToOn);
router.post("/update/on-to-in", updateToIn);

// end here ------------------------------------------------------------

// Export the router
export default router;
