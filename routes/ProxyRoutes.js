import express from 'express';
import { getProxyFlightStatus, getAzureToken } from '../controllers/ProxyController.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Proxy
 *   description: Proxy endpoints for external APIs
 */

/**
 * @swagger
 * /api/proxy:
 *   get:
 *     summary: Proxy flight status request
 *     tags: [Proxy]
 *     parameters:
 *       - in: query
 *         name: fltNbr
 *         schema:
 *           type: string
 *         description: Flight number
 *       - in: query
 *         name: carrier
 *         schema:
 *           type: string
 *         description: Carrier code
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/proxy', getProxyFlightStatus);

/**
 * @swagger
 * /api/auth/token:
 *   get:
 *     summary: Get Azure OAuth2 token
 *     tags: [Proxy]
 *     responses:
 *       200:
 *         description: Success
 *       500:
 *         description: Server error
 */
router.get('/auth/token', getAzureToken);

export default router;
