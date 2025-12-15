// import dotenv from "dotenv";
// import express from "express";
// import cookieParser from "cookie-parser";
// import cors from "cors";
// import FlightRouter from "./routes/FlightEventRoutes.js";
// import authRouter from "./routes/authRoutes.js";
// import logger from "./utils/Logger.js";
// import { connectDynamoDB } from "./config/Dynamodb.js";
// import TokenRefresher from "./helper/0authTokenManager.js";
// import tokenConfig from "./config/0authTokenConfig.js";
// import SubscriptionRouter from "./routes/SubscritionRoutes.js";
// import helmet from "helmet";

// // Load environment variables first
// dotenv.config();
 
// // Environment configuration
// const ENV = process.env.NODE_ENV || 'local';
// const isLocalEnv = ENV === 'local';
// const isDevEnv = ENV === 'dev' || ENV === 'development';

// // Force local DynamoDB configuration for local and dev environments
// if (isLocalEnv || isDevEnv) {
//   logger.info(`Setting up ${ENV.toUpperCase()} environment with local DynamoDB`);  
//   process.env.AWS_REGION = "us-east-1";
//   process.env.DYNAMO_ENDPOINT = "http://localhost:8000";
  
//   logger.info("Local DynamoDB credentials configured");
//   logger.info(`DynamoDB endpoint: ${process.env.DYNAMO_ENDPOINT}`);
// } else {
//   logger.info(`Setting up ${ENV.toUpperCase()} environment with AWS DynamoDB`);
//   logger.info(`AWS Region: ${process.env.AWS_REGION || 'us-east-1'}`);
// }

// const app = express();
// const PORT = process.env.PORT || 3000;

// // Environment-specific CORS configuration
// const getAllowedOrigins = () => {
//   const baseOrigins = [
//     "http://localhost:3001",
//     "http://localhost:3003", 
//     "http://localhost:3002",
//     "http://localhost:3000",
//     "http://127.0.0.1:3000",
//     "http://127.0.0.1:3001",
//     "http://127.0.0.1:3002", 
//     "http://127.0.0.1:3003",
//   ];

//   switch (ENV) {
//     case 'local':
//       case 'dev':
//         return [
//           ...baseOrigins,
//           "http://gotravelx.com",
//           "https://gotravelx.com",
//           "http://api.dev.gotravelx.com",
//           "https://api.dev.gotravelx.com",
//           "https://dev.gotravelx.com",
//         ];      
//     case 'qa':
//       return [
//         ...baseOrigins,
//         "https://qa.gotravelx.com",
//         "https://dev.gotravelx.com",
//       ];
//     case 'stg':
//     case 'staging':
//       return [
//         ...baseOrigins,
//         "https://staging.gotravelx.com",
//         "https://stg.gotravelx.com",
//         "https://dev.gotravelx.com",
//       ];
//     case 'prod':
//     case 'production':
//       return [
//         "https://gotravelx.com",
//         "https://www.gotravelx.com",
//       ];
//     default:
//       return baseOrigins;
//   }
// };

// const allowedOrigins = getAllowedOrigins();

// // CORS configuration based on environment
// const corsOptions = {
//   origin: function (origin, callback) {
//     // Allow requests with no origin in non-production environments
//     if (isLocalEnv || isDevEnv) {
//       if (!origin || allowedOrigins.includes(origin)) {
//         callback(null, true);
//       } else {
//         logger.warn(`CORS blocked origin: ${origin}`);
//         callback(null, true); // More permissive in dev/local mode
//       }
//     } else {
//       // Strict CORS in QA, staging, and production
//       if (!origin || allowedOrigins.includes(origin)) {
//         callback(null, true);
//       } else {
//         logger.error(`CORS blocked origin: ${origin}`);
//         callback(new Error("Not allowed by CORS"));
//       }
//     }
//   },
//   credentials: true,
//   methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//   allowedHeaders: ["Content-Type", "Authorization", "x-requested-with", "x-api-key"],
//   preflightContinue: false,
//   optionsSuccessStatus: 200
// };

// app.use(helmet());
// app.use(cors(corsOptions));
// const jsonLimit = '10mb';
// // Enhanced middleware with environment-specific settings
// app.use(express.json({ limit: jsonLimit }));
// app.use(express.urlencoded({ extended: true, limit: jsonLimit }));
// app.use(cookieParser());
// app.use(express.static("public"));
// const version = process.env.VERSION || 'v1';

// /* ==================== Routes Setups ====================*/
// logger.info(`Application version: ${version}`);
// logger.info(`Environment: ${ENV}`);
// logger.info(`Allowed origins: ${allowedOrigins.length} configured`);

// // =======================Auth routes=================================
// app.use(`/${version}/auth`,authRouter);

// /* ==================== Flight Event routes ========================= */
// app.use(`/${version}/flights`, FlightRouter);

// /* ==================== Subscription routes ========================= */
// app.use(`/${version}/subscription`, SubscriptionRouter);


// /* ==================== Routes Setups End ====================*/

// /* ======================== Health Check Api  ======================*/
// app.get("/health", (req, res) => {
//   res.status(200).json({
//     status: "OK",
//     message: "Server is running",
//     timestamp: new Date().toISOString(),
//     environment: ENV,
//     version: version,
//     dynamodb: {
//       endpoint: process.env.DYNAMO_ENDPOINT || "AWS DynamoDB",
//       region: process.env.AWS_REGION
//     },
//     cors: {
//       allowedOriginsCount: allowedOrigins.length
//     }
//   });
// });

// /* ======================== Environment Info Endpoints  ======================*/
// // Local environment info
// if (isLocalEnv) {
//   app.get("/local/info", (req, res) => {
//     res.status(200).json({
//       environment: ENV,
//       version: version,
//       port: PORT,
//       dynamodb: {
//         endpoint: process.env.DYNAMO_ENDPOINT,
//         region: process.env.AWS_REGION,
//         accessKeyId: process.env.AWS_ACCESS_KEY_ID
//       },
//       allowedOrigins: allowedOrigins,
//       corsPermissive: true
//     });
//   });
// }

// // Dev environment info
// if (isDevEnv) {
//   app.get("/dev/info", (req, res) => {
//     res.status(200).json({
//       environment: ENV,
//       version: version,
//       port: PORT,
//       dynamodb: {
//         endpoint: process.env.DYNAMO_ENDPOINT,
//         region: process.env.AWS_REGION,
//         accessKeyId: process.env.AWS_ACCESS_KEY_ID
//       },
//       allowedOrigins: allowedOrigins,
//       corsPermissive: true
//     });
//   });
// }

// /* ======================== Error Handling Middleware  ======================*/
// app.use((err, req, res, next) => {
//   const errorId = Date.now().toString(36);
//   logger.error(`[${errorId}] Error: ${err.message}`);
//   logger.error(`[${errorId}] Stack: ${err.stack}`);
  
//   if (isLocalEnv || isDevEnv) {
//     res.status(500).json({
//       errorId,
//       error: err.message,
//       stack: err.stack,
//       timestamp: new Date().toISOString(),
//       environment: ENV
//     });
//   } else {
//     res.status(500).json({
//       errorId,
//       error: "Internal Server Error",
//       timestamp: new Date().toISOString(),
//       environment: ENV
//     });
//   }
// });

// /* ======================== 404 Handler  ======================*/
// app.use("*", (req, res) => {
//   logger.warn(`🔍 404 - Route not found: ${req.method} ${req.originalUrl}`);
//   res.status(404).json({
//     error: "Route not found",
//     method: req.method,
//     path: req.originalUrl,
//     timestamp: new Date().toISOString(),
//     environment: ENV
//   });
// });

// const startServer = async () => {
//   logger.info("Starting server...");
//   logger.info(`Environment: ${ENV}`);
  
//   try {
//     /* ================== DynamoDB Connection ================== */
//     logger.info("Connecting to DynamoDB...");
//     await connectDynamoDB();
//     logger.info("DynamoDB connected successfully");

//     /* ================== Token Refresher - Environment Specific ================== */
//     const shouldInitializeTokenRefresher = !isLocalEnv; // Skip in local only
    
//     if (shouldInitializeTokenRefresher) {
//       logger.info("Initializing Token Refresher...");
//       new TokenRefresher(tokenConfig);
//       logger.info("Token Refresher initialized");
//     } else {
//       logger.info("Skipping Token Refresher in local environment");
//     }

//     /* ================== Start Express Server ================== */
//     app.listen(PORT, () => {
//       logger.info(`Server is running on port ${PORT}`);
//       logger.info(`Environment: ${ENV}`);
//       logger.info(`Health check: http://localhost:${PORT}/health`);
//       logger.info(`CORS: ${allowedOrigins.length} allowed origins`);
//       logger.info(`Token Refresher: ${shouldInitializeTokenRefresher ? 'Enabled' : 'Disabled'}`);
//       logger.info("Server started successfully!");
//     });
    
//   } catch (error) {
//     logger.error("Server startup failed:", error.message);
//     logger.error("Stack:", error.stack);
//     process.exit(1);
//   }
// };

// // Graceful shutdown handling
// const gracefulShutdown = (signal) => {
//   logger.info(`${signal} received, shutting down gracefully`);
//   logger.info(`Environment: ${ENV}`);
//   process.exit(0);
// };

// process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
// process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// process.on('unhandledRejection', (reason, promise) => {
//   logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
//   logger.error(`Environment: ${ENV}`);
// });

// process.on('uncaughtException', (error) => {
//   logger.error('Uncaught Exception:', error);
//   logger.error(`Environment: ${ENV}`);
//   process.exit(1);
// });

// startServer();


import dotenv from "dotenv";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import FlightRouter from "./routes/FlightEventRoutes.js";
import authRouter from "./routes/authRoutes.js";
import NewsLetterRoutes from "./routes/newsletterRoutes.js";

import logger from "./utils/Logger.js";
import { connectDynamoDB } from "./config/Dynamodb.js";
import TokenRefresher from "./helper/0authTokenManager.js";
import tokenConfig from "./config/0authTokenConfig.js";
import SubscriptionRouter from "./routes/SubscritionRoutes.js";
import helmet from "helmet";

// Load environment variables first
dotenv.config();

// Environment configuration
const ENV = process.env.NODE_ENV || "local";
const isLocalEnv = ENV === "local";
const isDevEnv = ENV === "dev" || ENV === "development";

if (isLocalEnv || isDevEnv) {
  logger.info(`Setting up ${ENV.toUpperCase()} environment with local DynamoDB`);
  process.env.AWS_REGION = "us-east-1";
  process.env.DYNAMO_ENDPOINT = "http://localhost:8000";

  logger.info("Local DynamoDB credentials configured");
  logger.info(`DynamoDB endpoint: ${process.env.DYNAMO_ENDPOINT}`);
} else {
  logger.info(`Setting up ${ENV.toUpperCase()} environment with AWS DynamoDB`);
  logger.info(`AWS Region: ${process.env.AWS_REGION || "us-east-1"}`);
}

const app = express();
const PORT = process.env.PORT || 3000;

/* ========================= CORS CONFIG ========================= */

// Allow all GoTravelx frontends + backends + localhost (HTTP & HTTPS)
const allowedOrigins = [
  // Local development
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3003",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:3002",
  "http://127.0.0.1:3003",

  // GoTravelx domains
  "http://gotravelx.com",
  "https://gotravelx.com",
  "http://www.gotravelx.com",
  "https://www.gotravelx.com",
  "http://dev.gotravelx.com",
  "https://dev.gotravelx.com",
  "http://qa.gotravelx.com",
  "https://qa.gotravelx.com",
  "http://stg.gotravelx.com",
  "https://stg.gotravelx.com",
  "http://client.gotravelx.com",
  "https://client.gotravelx.com",
  "http://stg.client.gotravelx.com",
  "https://stg.client.gotravelx.com",
  "http://qa.client.gotravelx.com",
  "https://qa.client.gotravelx.com",
  "http://dev.client.gotravelx.com",
  "https://dev.client.gotravelx.com",

  // Backend APIs
  "http://api.dev.gotravelx.com",
  "https://api.dev.gotravelx.com",
  "http://api.qa.gotravelx.com",
  "https://api.qa.gotravelx.com",
  "http://api.stg.gotravelx.com",
  "https://api.stg.gotravelx.com",
  "http://api.gotravelx.com",
  "https://api.gotravelx.com",
];

// Open CORS setup for all environments
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`🚫 CORS blocked origin: ${origin}`);
      callback(null, true); // Allow temporarily
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
    "x-api-key",
    "rte-ual-auth",
  ],
  preflightContinue: false,
  optionsSuccessStatus: 200,
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(express.static("public"));

const version = process.env.VERSION || "v1";

/* ==================== ROUTES ==================== */
logger.info(`Application version: ${version}`);
logger.info(`Environment: ${ENV}`);
logger.info(`Allowed origins: ${allowedOrigins.length} configured`);

app.use(`/${version}/auth`, authRouter);
app.use(`/${version}/flights`, FlightRouter);
app.use(`/${version}/subscription`, SubscriptionRouter);
app.use(`/${version}/newsletter`, NewsLetterRoutes);


/* ==================== HEALTH CHECK ==================== */
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: ENV,
    version: version,
    dynamodb: {
      endpoint: process.env.DYNAMO_ENDPOINT || "AWS DynamoDB",
      region: process.env.AWS_REGION,
    },
    cors: {
      allowedOriginsCount: allowedOrigins.length,
    },
  });
});

/* ==================== ENV INFO ==================== */
if (isLocalEnv || isDevEnv) {
  app.get(`/${ENV}/info`, (req, res) => {
    res.status(200).json({
      environment: ENV,
      version: version,
      port: PORT,
      dynamodb: {
        endpoint: process.env.DYNAMO_ENDPOINT,
        region: process.env.AWS_REGION,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      },
      allowedOrigins,
      corsPermissive: true,
    });
  });
}

/* ==================== ERROR HANDLER ==================== */
app.use((err, req, res, next) => {
  const errorId = Date.now().toString(36);
  logger.error(`[${errorId}] Error: ${err.message}`);
  logger.error(`[${errorId}] Stack: ${err.stack}`);

  res.status(500).json({
    errorId,
    error:
      isLocalEnv || isDevEnv ? err.message : "Internal Server Error",
    stack: isLocalEnv || isDevEnv ? err.stack : undefined,
    timestamp: new Date().toISOString(),
    environment: ENV,
  });
});

/* ==================== 404 HANDLER ==================== */
app.use("*", (req, res) => {
  logger.warn(`🔍 404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: "Route not found",
    method: req.method,
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
    environment: ENV,
  });
});

/* ==================== SERVER STARTUP ==================== */
const startServer = async () => {
  logger.info("Starting server...");
  try {
    await connectDynamoDB();
    logger.info("✅ DynamoDB connected successfully");

    if (!isLocalEnv) {
      logger.info("Initializing Token Refresher...");
      new TokenRefresher(tokenConfig);
      logger.info("Token Refresher initialized");
    } else {
      logger.info("Skipping Token Refresher in local environment");
    }

    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`Environment: ${ENV}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`Allowed Origins: ${allowedOrigins.length}`);
    });
  } catch (error) {
    logger.error("❌ Server startup failed:", error.message);
    logger.error("Stack:", error.stack);
    process.exit(1);
  }
};

/* ==================== SHUTDOWN HANDLERS ==================== */
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received, shutting down gracefully`);
  process.exit(0);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});

startServer();
