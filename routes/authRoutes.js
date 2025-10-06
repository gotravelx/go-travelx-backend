import express from "express";
import { authLogin, refreshToken } from "../controllers/AuthController.js"; 

const router = express.Router();
router.post("/login", authLogin);
router.post("/refresh-token", refreshToken);

export default router;
