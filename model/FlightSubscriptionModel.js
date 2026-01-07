import DynamoDbOp from "../services/DynamodbOperations.js";

const FLIGHT_SUBSCRIPTION_TABLE=process.env.FLIGHT_SUBSCRIPTION_TABLE || "FlightSubscriptions"

export const subscribeDb = new DynamoDbOp(FLIGHT_SUBSCRIPTION_TABLE, ["flightNumber","walletAddress"]);

const TABLE_NAME = FLIGHT_SUBSCRIPTION_TABLE;

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
      departureAirport,
      arrivalAirport,
      blockchainTxHash,
      isSubscriptionActive,
      subscriptionDate,
      createdAt,
      updatedAt,
    };

    await subscribeDb.create(item);
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

export const getFlightSubscriptions = async (walletAddress) => {
  try {
    const params = {
      KeyConditionExpression: "walletAddress = :walletAddress",
      ExpressionAttributeValues: {
        ":walletAddress": walletAddress,
      },
    };

    const result = await subscribeDb.query(params);

    if (result.Items && result.Items.length > 0) {
      return { success: true, items: result.Items };
    } else {
      return { success: false, message: "No subscriptions found for this wallet address." };
    }
  } catch (error) {
    console.error("[DYNAMODB] Error fetching flight subscriptions", error);
    return { success: false, error: error.message };
  }

}

/* =================== Flight Subscription Wrapper  ===================*/


/* =================== Additional Flight Subscription Operations ===================*/

export const updateFlightSubscription = async (walletAddress, flightNumber, updateData) => {
  try {
    const filter = { walletAddress, flightNumber };
    
    // Use the updateOne method from DbOperations
    const result = await subscribeDb.updateOne(filter, updateData);

    console.log("[DYNAMODB] Flight subscription updated successfully", {
      walletAddress,
      flightNumber,
      updatedFields: Object.keys(updateData)
    });

    return { success: true, updatedItem: result };
  } catch (error) {
    console.error("[DYNAMODB] Error updating flight subscription", {
      walletAddress,
      flightNumber,
      error: error.message,
    });

    return { success: false, error: error.message };
  }
};

export const markSubscriptionInactive = async (walletAddress, flightNumber, additionalData = {}) => {
  try {
    const updateData = {
      isSubscriptionActive: false,
      unsubscriptionDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...additionalData // Allow additional fields like blockchainUnsubscriptionTxHash
    };

    return await updateFlightSubscription(walletAddress, flightNumber, updateData);
  } catch (error) {
    console.error("[DYNAMODB] Error marking subscription as inactive", {
      walletAddress,
      flightNumber,
      error: error.message,
    });

    return { success: false, error: error.message };
  }
};

export const getActiveSubscriptions = async (walletAddress) => {
  try {
    const params = {
      KeyConditionExpression: "walletAddress = :walletAddress",
      FilterExpression: "isSubscriptionActive = :active",
      ExpressionAttributeValues: {
        ":walletAddress": walletAddress,
        ":active": true,
      },
    };

    const result = await subscribeDb.query(params);

    if (result.Items && result.Items.length > 0) {
      return { success: true, items: result.Items };
    } else {
      return { success: false, message: "No active subscriptions found for this wallet address." };
    }
  } catch (error) {
    console.error("[DYNAMODB] Error fetching active subscriptions", error);
    return { success: false, error: error.message };
  }
};

export const getInactiveSubscriptions = async (walletAddress) => {
  try {
    const params = {
      KeyConditionExpression: "walletAddress = :walletAddress",
      FilterExpression: "isSubscriptionActive = :inactive",
      ExpressionAttributeValues: {
        ":walletAddress": walletAddress,
        ":inactive": false,
      },
    };

    const result = await subscribeDb.query(params);

    if (result.Items && result.Items.length > 0) {
      return { success: true, items: result.Items };
    } else {
      return { success: false, message: "No inactive subscriptions found for this wallet address." };
    }
  } catch (error) {
    console.error("[DYNAMODB] Error fetching inactive subscriptions", error);
    return { success: false, error: error.message };
  }
};

/* =================== Additional Flight Subscription Operations ===================*/


export const isFlightSubscribed = async (walletAddress, flightNumber) => {
  try {
    const filter = { walletAddress, flightNumber };

    const exists = await subscribeDb.findOne(filter);
    if(!exists) return { success: true, isSubscribed:false };

    return { success: true, isSubscribed:true, item: exists };
  } catch (error) {
    console.error("[DYNAMODB] Error checking flight subscription existence", {
      walletAddress,
      flightNumber,
      error: error.message,
    });

    return { success: false, error: error.message };
  }
};
