const TABLE_NAME = "FlightEvents";

const flightEventSchema = {
  TableName: TABLE_NAME,
  KeySchema: [
    { AttributeName: "flightNumber", KeyType: "HASH" },
    { AttributeName: "DepartureDate", KeyType: "RANGE" },
  ],
  AttributeDefinitions: [
    { AttributeName: "flightNumber", AttributeType: "S" },
    { AttributeName: "DepartureDate", AttributeType: "S" },
  ],
  BillingMode: "PAY_PER_REQUEST",
};
