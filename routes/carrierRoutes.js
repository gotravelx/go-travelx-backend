import express from "express";
import { getCarriers, seedCarriers, addCarrier, deleteCarrier } from "../controllers/CarrierController.js";

const router = express.Router();

router.get("/get-all", getCarriers);
router.post("/seed-carriers", seedCarriers);
router.post("/", addCarrier);
router.delete("/:carrierCode", deleteCarrier);

export default router;
