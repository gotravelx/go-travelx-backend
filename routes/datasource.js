import express from "express";
import {
  createFlight,
  fetchFlightFromDataSource,
} from "../controllers/datasource.js";

const dataSource = express.Router();

dataSource.post("/create", async (req, res) => {
  try {
    const flightData = req.body;
    const data = await createFlight(flightData);
    res.status(201).json({ message: "Flight created ", data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

dataSource.get("/fetch-flight-from-data-source", fetchFlightFromDataSource);

export default dataSource;
