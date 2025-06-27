import DynamoDbOp from "../services/DynamodbOperations.js";

const flightDb = new DynamoDbOp("FlightEvents", "flightNumber");

const TABLE_NAME = "FlightEvents";

/* ======================== FlightEvent Definition. ======================== */

const FlightEventModel = {
  TableName: TABLE_NAME,
  KeySchema: [
    { AttributeName: "flightNumber", KeyType: "HASH" }, // Partition key
    { AttributeName: "departureDate", KeyType: "RANGE" }, // Sort key
  ],
  AttributeDefinitions: [
    { AttributeName: "flightNumber", AttributeType: "S" },
    { AttributeName: "departureDate", AttributeType: "S" },
  ],
  BillingMode: "PAY_PER_REQUEST",
};

/* ======================== FlightEvent Definition. ======================== */

/* ======================== Inserts a flight event into the DynamoDB table. ======================== */

const createTable = async (
  
) => {
  try {
  

  } catch (error) {
    console.error("[DYNAMODB] Error creating FlightEvents table", error);
    return { success: false, error: error.message };
  }
};

/* ======================== Inserts a flight event into the DynamoDB table. ======================== */



/* ======================== Inserts a flight event into the DynamoDB table. ======================== */

const insertFlightEvent = async (
  flightNumber,
  departureDate,
  blockchainHashKey,
  flightData
) => {
  try {
    const item = {
      flightNumber,
      departureDate,
      blockchainHashKey,
      flightData,
      createdAt: new Date().toISOString(),
    };

    // use both partition and sort key
    await flightDb.create(item);

    console.log("[DYNAMODB] Flight event saved successfully", {
      flightNumber,
      departureDate,
      blockchainHashKey,
    });

    return { success: true, item };
  } catch (error) {
    console.error("[DYNAMODB] Error saving flight event", {
      flightNumber,
      error: error.message,
    });

    return { success: false, error: error.message };
  }
};

/* ======================== Inserts a flight event into the DynamoDB table. ======================== */

/* ============================== GET FLIGHT EVENT BY FLIGHT NUMBER AND DATE ==============================*/

const getFlightEventByNumber = async (flightNumber, departureDate) => {
  try {
    const key = {
      flightNumber,
      departureDate,
    };

    const flightEvent = await flightDb.findOne(key);

    if (!flightEvent) {
      console.log("[DYNAMODB] Flight event not found", {
        flightNumber,
        departureDate,
      });
      return null;
    }

    console.log("[DYNAMODB] Flight event retrieved successfully", {
      flightNumber,
      departureDate,
    });

    return flightEvent;
  } catch (error) {
    console.error("[DYNAMODB] Error retrieving flight event", {
      flightNumber,
      departureDate,
      error: error.message,
    });

    throw new Error("Failed to retrieve flight event");
  }
};

/* ============================== GET FLIGHT EVENT BY FLIGHT NUMBER AND DATE ==============================*/

/* ============================== GET FLIGHTS VIA DEPARTURE DATE ================================ */

const getFlightsByDepartureDate = async (departureDate) => {
  try {
    const flights = await flightDb.findMany({ departureDate });

    console.log(
      "[DYNAMODB] Flights fetched for departureDate:",
      departureDate,
      {
        count: flights.length,
      }
    );

    return flights;
  } catch (error) {
    console.error("[DYNAMODB] Error fetching flights by departure date", {
      departureDate,
      error: error.message,
    });

    throw new Error("Failed to retrieve flights by departure date");
  }
};

/* ============================== GET FLIGHTS VIA DEPARTURE DATE ================================ */

export {
  FlightEventModel,
  createTable,
  insertFlightEvent,
  getFlightEventByNumber,
  getFlightsByDepartureDate,
};
