import {
  airPortCodeDb,
  createAirportCodeItem,
  TABLE_NAME,
} from "../model/AirportCodesModel.js";
import { getDocumentClient, getDynamoClient } from "../config/Dynamodb.js";
/**
 * Creates the AirportCodes table
 */
const createAirportCodesTable = async (req, res) => {
  const tableParams = {
    TableName: TABLE_NAME,
    KeySchema: [
      {
        AttributeName: "airPortCode",
        KeyType: "HASH",
      },
    ],
    AttributeDefinitions: [
      {
        AttributeName: "airPortCode",
        AttributeType: "S",
      },
    ],
    BillingMode: "PAY_PER_REQUEST",
  };

  try {
    const dynamoClient = getDynamoClient();
    await dynamoClient.createTable(tableParams).promise();
    console.log("AirportCodes table created successfully");
    res.status(200).json({
      message: "AirportCodes table created successfully.",
      tableName: TABLE_NAME,
    });
  } catch (error) {
    if (error.code === "ResourceInUseException") {
      console.warn("Table already exists:", TABLE_NAME);
      res.status(200).json({
        message: "Table already exists.",
        tableName: TABLE_NAME,
      });
    } else {
      console.error("Error creating table:", error);
      res.status(500).json({
        error: error.message,
        tableName: TABLE_NAME,
      });
    }
  }
};

/**
 * Create a new airport/station code
 */
const createAirportCode = async (req, res) => {
  try {
    const { airPortCode, ...additionalData } = req.body;

    if (!airPortCode) {
      return res.status(400).json({
        error: "airPortCode is required",
        tableName: TABLE_NAME,
      });
    }

    const documentClient = getDocumentClient();
    const codeUpper = airPortCode.toUpperCase();

    // Check if airport code already exists
    const existingItem = await documentClient
      .get({
        TableName: TABLE_NAME,
        Key: { airPortCode: codeUpper },
      })
      .promise();

    if (existingItem.Item) {
      return res.status(409).json({
        error: "Airport code already exists",
        airPortCode: codeUpper,
        tableName: TABLE_NAME,
      });
    }

    const item = createAirportCodeItem(codeUpper, additionalData);

    await documentClient
      .put({
        TableName: TABLE_NAME,
        Item: item,
      })
      .promise();

    console.log(` Airport code created: ${codeUpper}`);
    res.status(201).json({
      message: "Airport code created successfully",
      data: item,
      tableName: TABLE_NAME,
    });
  } catch (error) {
    console.error("❌ Error creating airport code:", error);
    res.status(500).json({
      error: error.message,
      tableName: TABLE_NAME,
    });
  }
};

/**
 * Get all airport codes with optional pagination
 */
const getAllAirportCodes = async (req, res) => {
  try {
    const data = await airPortCodeDb.findMany({});
    
    const response = {
      message: "Airport codes retrieved successfully",
      data: data,
      count: data.length, // ✅ Fixed: count from data array length
      tableName: TABLE_NAME,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("❌ Error retrieving airport codes:", error);
    res.status(500).json({
      error: error.message,
      tableName: TABLE_NAME,
    });
  }
};



export {
  createAirportCodesTable,
  createAirportCode,
  getAllAirportCodes,
};
