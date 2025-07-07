import DynamoDbOp from "../services/DynamodbOperations.js";

export const subscribeDb = new DynamoDbOp("FlightSubscriptions", ["flightNumber","walletAddress"]);

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

export const insertFlightSubscription = async (subscriptionData) => {
  try {
    const {
      walletAddress,
      flightNumber,
      carrierCode,
      departureDate,
      departureAirport,
      arrivalAirport,
      blockchainTxHash,
      isSubscriptionActive,
      subscriptionDate,
      createdAt,
      updatedAt,
    } = subscriptionData;

    const item = {
      walletAddress,
      flightNumber,
      carrierCode,
      departureDate,
      departureAirport,
      arrivalAirport,
      blockchainTxHash,
      isSubscriptionActive,
      subscriptionDate,
      createdAt,
      updatedAt,
    };

    // use both partition and sort key
    await subscribeDb.create(item);

    console.log("[DYNAMODB] Flight subscription saved successfully", {
      walletAddress,
      flightNumber,
      blockchainTxHash,
    });

    return { success: true, item };
  } catch (error) {
    console.error("[DYNAMODB] Error saving flight subscription", {
      walletAddress: subscriptionData?.walletAddress,
      flightNumber: subscriptionData?.flightNumber,
      error: error.message,
    });

    return { success: false, error: error.message };
  }
};

/* =================== Flight Subscription Wrapper  ===================*/