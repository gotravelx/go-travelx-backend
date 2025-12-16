import { getDocumentClient, getDynamoClient } from "../config/Dynamodb.js";

const TABLE_NAME = "NewsletterSubscriptions";

// Use your existing DynamoDbOp wrapper
import DynamoDbOp from "../services/DynamodbOperations.js";
export const newsletterDb = new DynamoDbOp(TABLE_NAME, "email");

/* ================= Create Table ================= */
export const createNewsletterTableIfNotExists = async () => {
  try {
    const dynamoClient = getDynamoClient();
    const tableParams = {
      TableName: TABLE_NAME,
      KeySchema: [{ AttributeName: "email", KeyType: "HASH" }],
      AttributeDefinitions: [{ AttributeName: "email", AttributeType: "S" }],
      BillingMode: "PAY_PER_REQUEST",
    };

    await dynamoClient.createTable(tableParams).promise();
    console.log("[DYNAMODB] Table created:", TABLE_NAME);
  } catch (err) {
    if (err.code === "ResourceInUseException") {
      console.log("[DYNAMODB] Table already exists:", TABLE_NAME);
    } else {
      console.error("[DYNAMODB] Error creating table:", err.message);
    }
  }
};

/* ================= Insert Subscription ================= */
export const insertNewsletterSubscription = async (email, categories = [], subscribed = true) => {
  try {
    const item = {
      email,
      subscribed,
      categories,
      createdAt: new Date().toISOString(),
    };
    await newsletterDb.create(item);
    return { success: true, item };
  } catch (err) {
    console.error("[DYNAMODB] Insert subscription error:", err.message);
    return { success: false, error: err.message };
  }
};

/* ================= Update Subscription ================= */
export const updateNewsletterSubscription = async (email, updates = {}) => {
  try {
    const existing = await newsletterDb.findById(email);
    if (!existing) {
      return { success: false, message: "Email not found" };
    }
    if (existing.subscribed === false) {
      return { 
        success: false, 
        message: "You are already unsubscribed. Please subscribe first." 
      };
    }
    const updateItem = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    const result = await newsletterDb.updateById(email, updateItem);
    return { success: true, item: result };
  } catch (err) {
    console.error("[DYNAMODB] Update subscription error:", err.message);
    return { success: false, error: err.message };
  }
};
