import dotenv from "dotenv";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import FlightRouter from "./routes/FlightEventRoutes.js";
import logger from "./utils/Logger.js";
import { connectDynamoDB } from "./config/Dynamodb.js";
import AirPortCodesRouter from "./routes/AirportCodesRoutes.js";
import TokenRefresher from "./helper/0authTokenManager.js";
import tokenConfig from "./config/0authTokenConfig.js";
import SubscriptionRouter from "./routes/SubscritionRoutes.js";

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
/* ==================== Routes Setups ====================*/
logger.info(`Application version ${version}`);

/* ==================== Flight Event routes ========================= */
app.use(`/${version}/flights`, FlightRouter);
/* ==================== Flight Event routes ========================= */

/* ==================== Flight Event routes ========================= */
app.use(`/${version}/subscription`, SubscriptionRouter);
/* ==================== Flight Event routes ========================= */

/* ==================== Station codes routes ======================== */
app.use(`/${version}/airport-codes`, AirPortCodesRouter);
/* ==================== Station codes routes ======================== */
/* ==================== Routes Setups End ====================*/

/* ======================== Health Check Api  ======================*/
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});
/* ======================== Health Check Api  ======================*/

const startServer = async () => {
  logger.info("Starting server...");
  try {
    /* ================== United API CLASS SINGLE TON INSTANCE ================== */
    await connectDynamoDB();
    new TokenRefresher(tokenConfig);
    app.listen(PORT, () => {
      logger.info(`🚀 Server is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Database connection failed:", error.message);
    process.exit(1);
  }
};

startServer();
