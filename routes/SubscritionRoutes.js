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

/**
 * @swagger
 * tags:
 *   name: Subscription
 *   description: Flight subscription management
 */

/**
 * @swagger
 * /subscription/add-flight-subscription:
 *   post:
 *     summary: Subscribe to a flight
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - flightNumber
 *               - departureDate
 *               - departureAirport
 *               - arrivalAirport
 *               - carrierCode
 *             properties:
 *               flightNumber:
 *                 type: string
 *                 description: Flight number
 *               departureDate:
 *                 type: string
 *                 format: date
 *                 description: Departure date (YYYY-MM-DD)
 *               departureAirport:
 *                 type: string
 *                 description: Departure airport code
 *               arrivalAirport:
 *                 type: string
 *                 description: Arrival airport code
 *               carrierCode:
 *                 type: string
 *                 description: Airline carrier code
 *     responses:
 *       200:
 *         description: Subscription successful
 *       400:
 *         description: Missing required parameters
 *       500:
 *         description: Server error
 */
router.post("/add-flight-subscription", validateToken, addFlightSubscription);

/**
 * @swagger
 * /subscription/create-table:
 *   get:
 *     summary: Create subscription table (Admin)
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Table created successfully
 *       200:
 *         description: Table already exists
 *       500:
 *         description: Server error
 */
router.get("/create-table", validateToken, createFlightSubscriptionTable);

/**
 * @swagger
 * /subscription/clear-table:
 *   get:
 *     summary: Clear subscription table (Admin)
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Table cleared successfully
 *       500:
 *         description: Server error
 */
router.get("/clear-table", validateToken, clearFlightSubscriptionTableData);

/**
 * @swagger
 * /subscription/get-flight-subscriptions:
 *   get:
 *     summary: Get all subscribed flights
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of subscribed flights
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 subscriptions:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Server error
 */
router.get("/get-flight-subscriptions", validateToken, getSubscribedFlights);

/**
 * @swagger
 * /subscription/unsubscribe-flight:
 *   post:
 *     summary: Unsubscribe from flights
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - flightNumbers
 *               - carrierCodes
 *               - departureAirports
 *               - arrivalAirports
 *             properties:
 *               flightNumbers:
 *                 type: array
 *                 items:
 *                   type: string
 *               carrierCodes:
 *                 type: array
 *                 items:
 *                   type: string
 *               departureAirports:
 *                 type: array
 *                 items:
 *                   type: string
 *               arrivalAirports:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Unsubscription successful
 *       400:
 *         description: Invalid parameters
 *       500:
 *         description: Server error
 */
router.post("/unsubscribe-flight", validateToken, unsubscribeFlight);

export default router;
