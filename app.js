import dotenv from "dotenv";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import flightRouter from "./routes/flight.js";
import { connectDb } from "./config/db.config.js";
import simulateFlightRouter from "./routes/simulate-flight.js";
import logger from "./utils/logger.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Corrected CORS Configuration
const allowedOrigins = [
  "http://localhost:3001",
  "http://localhost:3002",
  "https://dev.gotravelx.com",
  "https://gotravelx.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ✅ Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static("public"));

// ✅ Routes
app.use("/v1/flights", flightRouter);
app.use("/v1/simulate-flight", simulateFlightRouter);

const startServer = async () => {
  logger.info("Starting server...");
  try {
    await connectDb();
    app.listen(PORT, () => {
      logger.info(`✅ Server is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("❌ Database connection failed:", error.message);
    process.exit(1);
  }
};

startServer();
