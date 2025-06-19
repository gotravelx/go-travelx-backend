import AWS from "aws-sdk";

const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_REGION,
});

const TABLE_NAME = "FlightSubscriptions";

export class FlightSubscription {
  constructor({
    walletAddress,
    flightNumber,
    departureAirport,
    arrivalAirport,
    subscriptionDate = new Date().toISOString(),
    isSubscriptionActive = true,
    blockchainTxHash,
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString(),
  }) {
    if (!walletAddress) throw new Error("walletAddress is required");
    if (!flightNumber) throw new Error("flightNumber is required");
    if (!departureAirport) throw new Error("departureAirport is required");
    if (!arrivalAirport) throw new Error("arrivalAirport is required");
    if (!blockchainTxHash) throw new Error("blockchainTxHash is required");

    this.id = `${walletAddress}#${flightNumber}#${Date.now()}`;
    this.walletAddress = walletAddress;
    this.flightNumber = flightNumber;
    this.departureAirport = departureAirport;
    this.arrivalAirport = arrivalAirport;
    this.subscriptionDate = subscriptionDate;
    this.isSubscriptionActive = isSubscriptionActive;
    this.blockchainTxHash = blockchainTxHash;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  // Save to DynamoDB
  async save() {
    const params = {
      TableName: TABLE_NAME,
      Item: {
        id: this.id,
        walletAddress: this.walletAddress,
        flightNumber: this.flightNumber,
        departureAirport: this.departureAirport,
        arrivalAirport: this.arrivalAirport,
        subscriptionDate: this.subscriptionDate,
        isSubscriptionActive: this.isSubscriptionActive,
        blockchainTxHash: this.blockchainTxHash,
        createdAt: this.createdAt,
        updatedAt: new Date().toISOString(),
      },
    };

    try {
      await dynamodb.put(params).promise();
      return this;
    } catch (error) {
      throw new Error(`Failed to save FlightSubscription: ${error.message}`);
    }
  }

  // Find by ID
  static async findById(id) {
    const params = {
      TableName: TABLE_NAME,
      Key: { id },
    };

    try {
      const result = await dynamodb.get(params).promise();
      return result.Item ? new FlightSubscription(result.Item) : null;
    } catch (error) {
      throw new Error(`Failed to find FlightSubscription: ${error.message}`);
    }
  }

  // Get all active subscriptions
  static async findActiveSubscriptions() {
    const params = {
      TableName: TABLE_NAME,
      FilterExpression: "isSubscriptionActive = :isActive",
      ExpressionAttributeValues: {
        ":isActive": true,
      },
    };

    try {
      const result = await dynamodb.scan(params).promise();
      return result.Items.map((item) => new FlightSubscription(item));
    } catch (error) {
      throw new Error(`Failed to find active subscriptions: ${error.message}`);
    }
  }
}

export default FlightSubscription;

export const createFlightSubscriptionTable = async () => {
  const dynamodbClient = new AWS.DynamoDB({
    region: process.env.AWS_REGION || "us-east-1",
  });

  const tableParams = {
    TableName: TABLE_NAME,
    KeySchema: [
      {
        AttributeName: "id",
        KeyType: "HASH",
      },
    ],
    AttributeDefinitions: [
      {
        AttributeName: "id",
        AttributeType: "S",
      },
      {
        AttributeName: "walletAddress",
        AttributeType: "S",
      },
      {
        AttributeName: "flightNumber",
        AttributeType: "S",
      },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "WalletAddressIndex",
        KeySchema: [
          {
            AttributeName: "walletAddress",
            KeyType: "HASH",
          },
        ],
        Projection: {
          ProjectionType: "ALL",
        },
        BillingMode: "PAY_PER_REQUEST",
      },
      {
        IndexName: "FlightNumberIndex",
        KeySchema: [
          {
            AttributeName: "flightNumber",
            KeyType: "HASH",
          },
        ],
        Projection: {
          ProjectionType: "ALL",
        },
        BillingMode: "PAY_PER_REQUEST",
      },
    ],
    BillingMode: "PAY_PER_REQUEST",
  };

  try {
    await dynamodbClient.createTable(tableParams).promise();
    console.log("Table created successfully");
  } catch (error) {
    console.error("Error creating table:", error);
  }
};
