import mongoose from "mongoose";
import logger from "../utils/logger.js";

const connectDb = async () => {
  try {
    logger.info("Connecting to database...");
    const connection = await mongoose.connect(process.env.MONGO_URI);
    logger.info("Database connected successfully");
    logger.info(`MongoDB connected: ${connection.connection.host}`);
    logger.info(`MongoDB port: ${connection.connection.port}`);
    logger.info(`MongoDB database: ${connection.connection.name}`);
  } catch (error) {
    logger.error("Database connection failed:", error.message);
    process.exit(1);
  }
};

export { connectDb };
