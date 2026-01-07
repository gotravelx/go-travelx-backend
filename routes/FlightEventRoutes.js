import express from "express";
import { fetchFlightDetails } from "../controllers/UnitedApiController.js";
import { decryptFlightData } from "../controllers/EncryptController.js";
import { clearFlightEventTableData, createFlightEventTable, getAllFlightDetails, getHistoricalData } from "../controllers/FlightEventController.js";
import { validateToken } from "../middleware/validateToken.js";


const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Flights
 *   description: Flight information and event management
 */

/**
 * @swagger
 * /flights/get-flight-status/{flightNumber}:
 *   get:
 *     summary: Get flight status by flight number
 *     tags: [Flights]
 *     parameters:
 *       - in: path
 *         name: flightNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: Flight number
 *       - in: query
 *         name: departureDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Departure date (YYYY-MM-DD)
 *       - in: query
 *         name: departure
 *         schema:
 *           type: string
 *         description: Departure airport code
 *       - in: query
 *         name: arrival
 *         schema:
 *           type: string
 *         description: Arrival airport code
 *       - in: query
 *         name: carrier
 *         schema:
 *           type: string
 *         description: Airline carrier code
 *       - in: query
 *         name: includeFullData
 *         schema:
 *           type: boolean
 *         description: Include full flight data in response
 *     responses:
 *       200:
 *         description: Flight status retrieved successfully
 *       404:
 *         description: Flight not found
 *       500:
 *         description: Server error
 */
router.get("/get-flight-status/:flightNumber", fetchFlightDetails);

/**
 * @swagger
 * /flights/decrypt-flight-data:
 *   post:
 *     summary: Decrypt encrypted flight data
 *     tags: [Flights]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - encryptedData
 *             properties:
 *               encryptedData:
 *                 type: string
 *                 description: Encrypted flight data
 *     responses:
 *       200:
 *         description: Data decrypted successfully
 *       400:
 *         description: Invalid encrypted data
 *       500:
 *         description: Server error
 */
router.post("/decrypt-flight-data", decryptFlightData);

/**
 * @swagger
 * /flights/fetch-historical/{flightNumber}/date-range:
 *   get:
 *     summary: Get historical flight data
 *     tags: [Flights]
 *     parameters:
 *       - in: path
 *         name: flightNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: Flight number
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Historical data retrieved successfully
 *       400:
 *         description: Invalid date range
 *       500:
 *         description: Server error
 */
router.get("/fetch-historical/:flightNumber/date-range", getHistoricalData);

/**
 * @swagger
 * /flights/get-all-flights:
 *   get:
 *     summary: Get all flight events (Admin)
 *     tags: [Flights]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all flight events
 *       500:
 *         description: Server error
 */
router.get("/get-all-flights", validateToken, getAllFlightDetails);

/**
 * @swagger
 * /flights/create-table:
 *   get:
 *     summary: Create flight events table (Admin)
 *     tags: [Flights]
 *     responses:
 *       201:
 *         description: Table created successfully
 *       200:
 *         description: Table already exists
 *       500:
 *         description: Server error
 */
router.get("/create-table", createFlightEventTable);

/**
 * @swagger
 * /flights/clear-table:
 *   get:
 *     summary: Clear flight events table (Admin)
 *     tags: [Flights]
 *     responses:
 *       200:
 *         description: Table cleared successfully
 *       500:
 *         description: Server error
 */
router.get("/clear-table", clearFlightEventTableData);
export default router;
