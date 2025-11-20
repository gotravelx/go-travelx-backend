import express from "express";
import {
  createSubscriptionController,
  unsubscribeController,
} from "../controllers/NewsLetterController.js";

const router = express.Router();

// POST → Subscribe to newsletter
router.post("/subscribe", createSubscriptionController);


// DELETE → Unsubscribe
router.delete("/unsubscribe", unsubscribeController);


export default router;
