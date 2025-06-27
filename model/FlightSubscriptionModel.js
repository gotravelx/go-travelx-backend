import AWS from "aws-sdk";

const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_REGION,
});

const TABLE_NAME = "FlightSubscriptions";

/* =================== Defines the table schema  ===================*/

export const FlightSubscriptionModel = {
  TableName: TABLE_NAME,
  KeySchema: [
    { AttributeName: "walletAddress", KeyType: "HASH" },
    { AttributeName: "flightNumber", KeyType: "RANGE" },
  ],
  AttributeDefinitions: [
    { AttributeName: "walletAddress", AttributeType: "S" },
    { AttributeName: "flightNumber", AttributeType: "S" },
  ],
  BillingMode: "PAY_PER_REQUEST", 
};

/* =================== Defines the table schema ===================*/

/* =================== Flight Subscription Wrapper  ===================*/

export default class FlightSubscriptionWrapper {
  constructor(data) {
    this.walletAddress = data.walletAddress;
    this.flightNumber = data.flightNumber;
    this.departureAirport = data.departureAirport;
    this.arrivalAirport = data.arrivalAirport;
    this.subscriptionDate = data.subscriptionDate || new Date().toISOString();
    this.isSubscriptionActive = data.isSubscriptionActive ?? true;
    this.blockchainTxHash = data.blockchainTxHash;
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }
}

/* =================== Flight Subscription Wrapper  ===================*/