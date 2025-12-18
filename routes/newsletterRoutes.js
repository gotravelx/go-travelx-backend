import express from "express";
import {
  createSubscriptionController,
  unsubscribeController,
} from "../controllers/NewsLetterController.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Newsletter
 *   description: Newsletter subscription management
 */

/**
 * @swagger
 * /newsletter/subscribe:
 *   post:
 *     summary: Subscribe to newsletter
 *     tags: [Newsletter]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Subscriber's email address
 *               categories:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Newsletter categories to subscribe to
 *               env:
 *                 type: string
 *                 description: Environment (for email sending)
 *     responses:
 *       201:
 *         description: Subscription successful
 *       400:
 *         description: Invalid email or email already exists
 *       500:
 *         description: Server error
 */
router.post("/subscribe", createSubscriptionController);


/**
 * @swagger
 * /newsletter/unsubscribe:
 *   delete:
 *     summary: Unsubscribe from newsletter
 *     tags: [Newsletter]
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: Email address to unsubscribe
 *     responses:
 *       200:
 *         description: Unsubscribed successfully
 *       400:
 *         description: Email is required
 *       404:
 *         description: Email not found
 *       500:
 *         description: Server error
 */
router.delete("/unsubscribe", unsubscribeController);


export default router;
