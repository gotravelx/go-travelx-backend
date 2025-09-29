// config/dynamodb.js
import AWS from "aws-sdk";
import logger from "../utils/Logger.js";

class DynamoDBConnection {
  constructor() {
    this.documentClient = null;
    this.dynamoClient = null;
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected) {
      return {
        documentClient: this.documentClient,
        dynamoClient: this.dynamoClient,
      };
    }

    try {
      const isLocal = process.env.NODE_ENV === "local";

      const config = isLocal
        ? {
            region: process.env.AWS_REGION || "us-east-1",
            endpoint: process.env.DYNAMO_ENDPOINT || "http://localhost:8000",
          }
        : {
            region: process.env.AWS_REGION,
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          };

      logger.info(
        `Connecting to DynamoDB with config: ${JSON.stringify(config)}`
      );

      // Update global AWS config (v2 SDK)
      AWS.config.update(config);

      // Create clients
      this.documentClient = new AWS.DynamoDB.DocumentClient(config);
      this.dynamoClient = new AWS.DynamoDB(config);

      await this.testConnection();

      this.isConnected = true;

      logger.info("DynamoDB connected successfully");
      logger.info(`Region: ${AWS.config.region}`);

      return {
        documentClient: this.documentClient,
        dynamoClient: this.dynamoClient,
      };
    } catch (error) {
      logger.error("DynamoDB connection failed:", error.message);
      console.error("DynamoDB connection failed:", error);
      throw error;
    }
  }

  async testConnection() {
    try {
      await this.dynamoClient.listTables({ Limit: 1 }).promise();
    } catch (error) {
      // ignore ResourceNotFound for test table
      if (error.code !== "ResourceNotFoundException") {
        throw error;
      }
    }
  }

  getDocumentClient() {
    if (!this.isConnected || !this.documentClient) {
      throw new Error("DynamoDB not connected. Call connect() first.");
    }
    return this.documentClient;
  }

  getDynamoClient() {
    if (!this.isConnected || !this.dynamoClient) {
      throw new Error("DynamoDB not connected. Call connect() first.");
    }
    return this.dynamoClient;
  }

  async disconnect() {
    this.documentClient = null;
    this.dynamoClient = null;
    this.isConnected = false;
    logger.info("DynamoDB disconnected");
  }
}

const dynamoDBConnection = new DynamoDBConnection();

export const connectDynamoDB = async () => await dynamoDBConnection.connect();
export const getDocumentClient = () => dynamoDBConnection.getDocumentClient();
export const getDynamoClient = () => dynamoDBConnection.getDynamoClient();
export const disconnectDynamoDB = async () =>
  await dynamoDBConnection.disconnect();

export default dynamoDBConnection;
