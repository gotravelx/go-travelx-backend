import DynamoDbOp from "../services/DynamodbOperations.js";

const CARRIER_TABLE = "Carriers";

export const carrierDb = new DynamoDbOp(CARRIER_TABLE, "carrierCode");

const TABLE_NAME = CARRIER_TABLE;

/* =================== Defines the table schema  ===================*/

export const CarrierModel = {
    TableName: TABLE_NAME,
    KeySchema: [
        { AttributeName: "carrierCode", KeyType: "HASH" }, // Partition key
    ],
    AttributeDefinitions: [
        { AttributeName: "carrierCode", AttributeType: "S" },
    ],
    BillingMode: "PAY_PER_REQUEST",
};

/* =================== Defines the table schema ===================*/

/* =================== Carrier Wrapper  ===================*/

export const createCarrier = async (carrierData) => {
    try {
        const {
            carrierCode,
            carrierName,
            program,
            createdAt = new Date().toISOString(),
            updatedAt = new Date().toISOString(),
        } = carrierData;

        const item = {
            carrierCode,
            carrierName,
            program,
            createdAt,
            updatedAt,
        };

        await carrierDb.create(item);
        return { success: true, item };
    } catch (error) {
        console.error("[DYNAMODB] Error saving carrier", {
            carrierCode: carrierData?.carrierCode,
            error: error.message,
        });

        return { success: false, error: error.message };
    }
};

export const getAllCarriers = async () => {
    try {
        const result = await carrierDb.findMany({});
        return { success: true, items: result };
    } catch (error) {
        console.error("[DYNAMODB] Error fetching carriers", error);
        return { success: false, error: error.message };
    }
};

export const getCarrierByCode = async (carrierCode) => {
    try {
        const result = await carrierDb.findById(carrierCode);
        if (result) {
            return { success: true, item: result };
        } else {
            return { success: false, message: "Carrier not found" };
        }
    } catch (error) {
        console.error("[DYNAMODB] Error fetching carrier by code", error);
        return { success: false, error: error.message };
    }
}

export const deleteCarrierByCode = async (carrierCode) => {
    try {
        const result = await carrierDb.deleteById(carrierCode);
        return result;
    } catch (error) {
        console.error("[DYNAMODB] Error deleting carrier", error);
        return { success: false, error: error.message };
    }
}
