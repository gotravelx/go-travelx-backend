import {
  createAirportCodeItem,
  TABLE_NAME,
  updateAirportCodeItem,
} from "../model/AirportCodesModel.js";
import codes from "../utils/AirportCodeData.js";
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
    const { limit, lastEvaluatedKey } = req.query;
    const documentClient = getDocumentClient();

    const params = {
      TableName: TABLE_NAME,
    };

    if (limit) {
      params.Limit = parseInt(limit);
    }

    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = JSON.parse(
        decodeURIComponent(lastEvaluatedKey)
      );
    }

    const result = await documentClient.scan(params).promise();

    const response = {
      message: "Airport codes retrieved successfully",
      data: result.Items,
      count: result.Count,
      tableName: TABLE_NAME,
    };

    if (result.LastEvaluatedKey) {
      response.lastEvaluatedKey = encodeURIComponent(
        JSON.stringify(result.LastEvaluatedKey)
      );
      response.hasMore = true;
    } else {
      response.hasMore = false;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error("❌ Error retrieving airport codes:", error);
    res.status(500).json({
      error: error.message,
      tableName: TABLE_NAME,
    });
  }
};

/**
 * Get specific airport code by airPortCode
 */
const getAirportCode = async (req, res) => {
  try {
    const { code } = req.params;
    const documentClient = getDocumentClient();

    const params = {
      TableName: TABLE_NAME,
      Key: {
        airPortCode: code.toUpperCase(),
      },
    };

    const result = await documentClient.get(params).promise();

    if (!result.Item) {
      return res.status(404).json({
        message: "Airport code not found",
        airPortCode: code.toUpperCase(),
        tableName: TABLE_NAME,
      });
    }

    res.status(200).json({
      message: "Airport code retrieved successfully",
      data: result.Item,
      tableName: TABLE_NAME,
    });
  } catch (error) {
    console.error("Error retrieving airport code:", error);
    res.status(500).json({
      error: error.message,
      tableName: TABLE_NAME,
    });
  }
};

/**
 * Update airport code
 */
const updateAirportCode = async (req, res) => {
  try {
    const { code } = req.params;
    const updates = req.body;
    const documentClient = getDocumentClient();
    const codeUpper = code.toUpperCase();

    // First, get the existing item
    const existingResult = await documentClient
      .get({
        TableName: TABLE_NAME,
        Key: { airPortCode: codeUpper },
      })
      .promise();

    if (!existingResult.Item) {
      return res.status(404).json({
        message: "Airport code not found",
        airPortCode: codeUpper,
        tableName: TABLE_NAME,
      });
    }

    // Create updated item
    const updatedItem = updateAirportCodeItem(existingResult.Item, updates);

    await documentClient
      .put({
        TableName: TABLE_NAME,
        Item: updatedItem,
      })
      .promise();

    console.log(` Airport code updated: ${codeUpper}`);
    res.status(200).json({
      message: "Airport code updated successfully",
      data: updatedItem,
      tableName: TABLE_NAME,
    });
  } catch (error) {
    console.error("❌ Error updating airport code:", error);
    res.status(500).json({
      error: error.message,
      tableName: TABLE_NAME,
    });
  }
};

/**
 * Delete airport code
 */
const deleteAirportCode = async (req, res) => {
  try {
    const { code } = req.params;
    const documentClient = getDocumentClient();
    const codeUpper = code.toUpperCase();

    // Check if item exists first
    const existingResult = await documentClient
      .get({
        TableName: TABLE_NAME,
        Key: { airPortCode: codeUpper },
      })
      .promise();

    if (!existingResult.Item) {
      return res.status(404).json({
        message: "Airport code not found",
        airPortCode: codeUpper,
        tableName: TABLE_NAME,
      });
    }

    await documentClient
      .delete({
        TableName: TABLE_NAME,
        Key: { airPortCode: codeUpper },
      })
      .promise();

    console.log(`Airport code deleted: ${codeUpper}`);
    res.status(200).json({
      message: "Airport code deleted successfully",
      airPortCode: codeUpper,
      tableName: TABLE_NAME,
    });
  } catch (error) {
    console.error("Error deleting airport code:", error);
    res.status(500).json({
      error: error.message,
      tableName: TABLE_NAME,
    });
  }
};

const searchAirportCodes = async (req, res) => {
  try {
    const {
      query,
      limit = 50,
      sortBy = "code", // 'code', 'name', 'city'
      order = "asc", // 'asc', 'desc'
      searchType = "begins_with", // 'begins_with', 'contains'
    } = req.query;

    if (!query) {
      return res.status(400).json({
        error: "Search query is required",
        example: "/search/airport-codes?query=S&sortBy=name&order=asc",
        searchOptions: {
          sortBy: ["code", "name", "city"],
          order: ["asc", "desc"],
          searchType: ["begins_with", "contains"],
        },
        tableName: TABLE_NAME,
      });
    }

    const documentClient = getDocumentClient();
    const searchQuery = query.toUpperCase().trim();

    // Build filter expression based on search type
    let filterExpression;
    let expressionAttributeValues;

    if (searchType === "contains") {
      // Search in airport code, name, and city for better results
      filterExpression = `
        contains(airPortCode, :query) OR 
        contains(#name, :queryOriginal) OR 
        contains(city, :queryOriginal)
      `;
      expressionAttributeValues = {
        ":query": searchQuery,
        ":queryOriginal": query.toUpperCase(),
      };
    } else {
      // Default begins_with search
      filterExpression = "begins_with(airPortCode, :query)";
      expressionAttributeValues = {
        ":query": searchQuery,
      };
    }

    const params = {
      TableName: TABLE_NAME,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      // Use ExpressionAttributeNames for reserved keywords like 'name'
      ExpressionAttributeNames:
        searchType === "contains"
          ? {
              "#name": "name", // Assuming your table has a 'name' field
            }
          : undefined,
      Limit: Math.max(1, Math.min(parseInt(limit), 500)), // Cap at 500 for performance
    };

    const result = await documentClient.scan(params).promise();

    // Enhanced sorting with multiple options
    const sortedResults = result.Items.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "name":
          // Assuming you have airport name field
          comparison = (a.name || a.airPortName || "").localeCompare(
            b.name || b.airPortName || ""
          );
          break;
        case "city":
          comparison = (a.city || "").localeCompare(b.city || "");
          break;
        case "code":
        default:
          comparison = a.airPortCode.localeCompare(b.airPortCode);
          break;
      }

      return order === "desc" ? -comparison : comparison;
    });

    // Enhanced response with metadata
    const response = {
      success: true,
      message: "Search completed successfully",
      query: {
        original: query,
        processed: searchQuery,
        type: searchType,
        sortBy,
        order,
      },
      data: sortedResults,
      metadata: {
        totalFound: sortedResults.length,
        limit: parseInt(limit),
        hasMore: result.Items.length === parseInt(limit),
        searchTime: Date.now(),
      },
      tableName: TABLE_NAME,
    };

    // Add suggestions for better search if no results found
    if (sortedResults.length === 0) {
      response.suggestions = [
        `Try searching with fewer characters: "${query.substring(
          0,
          Math.max(1, query.length - 1)
        )}"`,
        'Use "searchType=contains" for broader search',
        "Check spelling of airport code or name",
      ];
    }

    res.status(200).json(response);
  } catch (error) {
    console.error("❌ Error searching airport codes:", error);

    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        type: error.name,
        timestamp: new Date().toISOString(),
      },
      query: req.query.query || null,
      tableName: TABLE_NAME,
    });
  }
};

/**
 * Bulk insert airport codes from data file
 */
const bulkInsertFromFile = async (req, res) => {
  try {
    const documentClient = getDocumentClient();

    // Create items with proper structure
    const items = codes.map((code) => createAirportCodeItem(code));

    // Split into chunks of 25 (DynamoDB batch limit)
    const chunks = [];
    for (let i = 0; i < items.length; i += 25) {
      chunks.push(items.slice(i, i + 25));
    }

    let totalInserted = 0;

    for (const chunk of chunks) {
      const batchRequests = chunk.map((item) => ({
        PutRequest: {
          Item: item,
        },
      }));

      const params = {
        RequestItems: {
          [TABLE_NAME]: batchRequests,
        },
      };

      await documentClient.batchWrite(params).promise();
      totalInserted += chunk.length;
      console.log(
        `Inserted ${chunk.length} airport codes (Total: ${totalInserted}/${items.length})`
      );
    }

    console.log("All airport codes from file inserted successfully");
    res.status(200).json({
      message: "All airport codes from file inserted successfully.",
      totalInserted,
      tableName: TABLE_NAME,
    });
  } catch (error) {
    console.error("Error inserting airport codes from file:", error);
    res.status(500).json({
      error: error.message,
      tableName: TABLE_NAME,
    });
  }
};

/**
 * Delete all airport codes (for testing purposes)
 */
const deleteAllAirportCodes = async (req, res) => {
  try {
    const documentClient = getDocumentClient();

    // First, scan to get all items
    const scanParams = {
      TableName: TABLE_NAME,
      ProjectionExpression: "airPortCode",
    };

    const scanResult = await documentClient.scan(scanParams).promise();

    if (scanResult.Items.length === 0) {
      return res.status(200).json({
        message: "No airport codes to delete.",
        tableName: TABLE_NAME,
      });
    }

    // Delete in batches
    const chunks = [];
    for (let i = 0; i < scanResult.Items.length; i += 25) {
      chunks.push(scanResult.Items.slice(i, i + 25));
    }

    let totalDeleted = 0;

    for (const chunk of chunks) {
      const deleteRequests = chunk.map((item) => ({
        DeleteRequest: {
          Key: {
            airPortCode: item.airPortCode,
          },
        },
      }));

      const params = {
        RequestItems: {
          [TABLE_NAME]: deleteRequests,
        },
      };

      await documentClient.batchWrite(params).promise();
      totalDeleted += chunk.length;
      console.log(
        `Deleted ${chunk.length} airport codes (Total: ${totalDeleted}/${scanResult.Items.length})`
      );
    }

    res.status(200).json({
      message: "All airport codes deleted successfully.",
      totalDeleted,
      tableName: TABLE_NAME,
    });
  } catch (error) {
    console.error("Error deleting airport codes:", error);
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
  getAirportCode,
  updateAirportCode,
  deleteAirportCode,
  searchAirportCodes,
  bulkInsertFromFile,
  deleteAllAirportCodes,
};
