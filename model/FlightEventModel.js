import DynamoDbOp from "../services/DynamodbOperations.js";

export const flightDb = new DynamoDbOp("FlightEvents", "flightNumber");

const TABLE_NAME = "FlightEvents";

/* ======================== FlightEvent Definition. ======================== */

const FlightEventModel = {
  TableName: TABLE_NAME,
  KeySchema: [
    { AttributeName: "flightNumber", KeyType: "HASH" }, // Partition key
  ],
  AttributeDefinitions: [{ AttributeName: "flightNumber", AttributeType: "S" }],
  BillingMode: "PAY_PER_REQUEST",
};

/* ======================== FlightEvent Definition. ======================== */

/* ======================== Inserts a flight event into the DynamoDB table. ======================== */

const insertFlightEvent = async (
  flightNumber,
  carrierCode,
  departureDate,
  departureAirport,
  arrivalAirport,
  flightStatus,
  blockchainHashKey,
  flightData
) => {
  try {
    const item = {
      flightNumber,
      carrierCode,
      departureDate,
      departureAirport,
      arrivalAirport,
      flightStatus,
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

/* ======================== Update a Flight event into the DynamoDB table. Start  ======================== */

const updateFlightEvent = async (
  flightNumber,
  carrierCode,
  departureDate,
  departureAirport,
  arrivalAirport,
  flightStatus,
  blockchainHashKey,
  flightData
) => {
  try {
    const updateItem = {
      carrierCode,
      departureDate,
      departureAirport,
      arrivalAirport,
      flightStatus,
      blockchainHashKey,
      flightData,
      updatedAt: new Date().toISOString(),
    };

    // Use update method instead of findMany
    const result = await flightDb.updateById(flightNumber, updateItem);

    console.log("[DYNAMODB] Flight event updated successfully", {
      flightNumber,
      departureDate,
      blockchainHashKey,
    });

    return { success: true, item: result };
  } catch (error) {
    console.error("[DYNAMODB] Error updating flight event", {
      flightNumber,
      error: error.message,
    });

    return { success: false, error: error.message };
  }
};

/* ============================== GET FLIGHT EVENT BY FLIGHT NUMBER ==============================*/

const getFlightEventByNumber = async (flightNumber) => {
  try {
    console.log(
      `[DYNAMODB] Fetching flight event for flight number: ${flightNumber}`
    );

    const result = await flightDb.findOne({ flightNumber });

    if (result) {
      console.log(`[DYNAMODB] Flight event found for flight ${flightNumber}`);
      return result;
    } else {
      console.log(
        `[DYNAMODB] No flight event found for flight ${flightNumber}`
      );
      return null;
    }
  } catch (error) {
    console.error(
      `[DYNAMODB] Error fetching flight event for flight ${flightNumber}:`,
      {
        error: error.message,
      }
    );
    throw error;
  }
};

/* ============================== GET FLIGHT EVENT BY FLIGHT NUMBER ==============================*/

/* ======================== Update a Flight event into the DynamoDB table. End  ======================== */

export {
  FlightEventModel,
  insertFlightEvent,
  updateFlightEvent,
  getFlightEventByNumber,
};
