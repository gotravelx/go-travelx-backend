import dotenv from "dotenv";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import flightRouter from "./routes/flight.js";
import simulateFlightRouter from "./routes/simulate-flight.js";
import logger from "./utils/logger.js";
import { connectDynamoDB } from "./config/dynamodb.js";
import airPortCodesRouter from "./routes/airportCodes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static("public"));
const version = process.env.VERSION;
// Set up routes

console.log(version);
// Flight routes

app.use(`/${version}/flights`, flightRouter);

// Simulate flight routes

app.use(`/${version}/simulate-flight`, simulateFlightRouter);

// Station codes routes

app.use(`/${version}/airport-codes`, airPortCodesRouter);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

const startServer = async () => {
  logger.info("Starting server...");
  try {
    // connect to DynamoDB
    await connectDynamoDB();
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Database connection failed:", error.message);
    process.exit(1);
  }
};

startServer();
