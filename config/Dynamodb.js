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
      logger.info("Connecting to DynamoDB...");

      const config = {
        region: process.env.AWS_REGION,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };

      AWS.config.update(config);

      this.documentClient = new AWS.DynamoDB.DocumentClient();
      this.dynamoClient = new AWS.DynamoDB();

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
      throw error;
    }
  }

  async testConnection() {
    try {
      await this.dynamoClient.listTables({ Limit: 1 }).promise();
    } catch (error) {
      try {
        await this.documentClient
          .scan({
            TableName: "test-connection-" + Date.now(),
            Limit: 1,
          })
          .promise();
      } catch (testError) {
        if (testError.code !== "ResourceNotFoundException") {
          throw testError;
        }
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
export const connectDynamoDB = async () => {
  return await dynamoDBConnection.connect();
};

export const getDocumentClient = () => {
  return dynamoDBConnection.getDocumentClient();
};

export const getDynamoClient = () => {
  return dynamoDBConnection.getDynamoClient();
};

export const disconnectDynamoDB = async () => {
  await dynamoDBConnection.disconnect();
};

export default dynamoDBConnection;
