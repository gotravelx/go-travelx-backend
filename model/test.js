import mongoose from "mongoose";
import DataSource from "./datasource.js";

const dummyFlightsUSA = [
  {
    flightNumber: 1001,
    flightOriginationDate: "2025-03-05",
    operatingAirline: "American Airlines",
    estimatedDepartureUTC: new Date().toISOString(),
    estimatedArrivalUTC: new Date(
      Date.now() + 4 * 60 * 60 * 1000
    ).toISOString(), // 4 hours later
    departureCity: "New York (JFK)",
    arrivalCity: "Los Angeles (LAX)",
    departureGate: "A10",
    arrivalGate: "B4",
    departureTerminal: "T8",
    arrivalTerminal: "T4",
    flightStatus: "Scheduled",
    statusCode: "SCH",
    equipmentModel: "Boeing 777",
    baggageClaim: "C12",
    boardingTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 mins before departure
    scheduledArrivalUTCDateTime: new Date(
      Date.now() + 4 * 60 * 60 * 1000
    ).toISOString(),
    scheduledDepartureUTCDateTime: new Date().toISOString(),
  },
  {
    flightNumber: 1002,
    flightOriginationDate: "2025-03-05",
    operatingAirline: "Delta Airlines",
    estimatedDepartureUTC: new Date(
      Date.now() + 2 * 60 * 60 * 1000
    ).toISOString(),
    estimatedArrivalUTC: new Date(
      Date.now() + 5 * 60 * 60 * 1000
    ).toISOString(),
    departureCity: "Chicago (ORD)",
    arrivalCity: "Miami (MIA)",
    departureGate: "C5",
    arrivalGate: "D12",
    departureTerminal: "T3",
    arrivalTerminal: "T1",
    flightStatus: "Delayed",
    statusCode: "DL",
    departureDelayMinutes: 45,
    equipmentModel: "Airbus A321",
    baggageClaim: "B8",
  },
  {
    flightNumber: 1003,
    flightOriginationDate: "2025-03-05",
    operatingAirline: "United Airlines",
    estimatedDepartureUTC: new Date(
      Date.now() - 1 * 60 * 60 * 1000
    ).toISOString(),
    estimatedArrivalUTC: new Date(
      Date.now() + 3 * 60 * 60 * 1000
    ).toISOString(),
    actualDepartureUTC: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    departureCity: "San Francisco (SFO)",
    arrivalCity: "Seattle (SEA)",
    departureGate: "B2",
    arrivalGate: "A5",
    departureTerminal: "T2",
    arrivalTerminal: "T1",
    flightStatus: "Departed",
    statusCode: "DEP",
    equipmentModel: "Boeing 737",
    baggageClaim: "D7",
    blockchainTxHash: "0xabcdef987654321",
  },
  {
    flightNumber: 1004,
    flightOriginationDate: "2025-03-05",
    operatingAirline: "Southwest Airlines",
    estimatedDepartureUTC: new Date(
      Date.now() - 2 * 60 * 60 * 1000
    ).toISOString(),
    estimatedArrivalUTC: new Date(
      Date.now() + 1.5 * 60 * 60 * 1000
    ).toISOString(),
    actualDepartureUTC: new Date(
      Date.now() - 1.5 * 60 * 60 * 1000
    ).toISOString(),
    actualArrivalUTC: new Date(Date.now() + 1.5 * 60 * 60 * 1000).toISOString(),
    departureCity: "Dallas (DFW)",
    arrivalCity: "Denver (DEN)",
    flightStatus: "Landed",
    statusCode: "LAN",
    equipmentModel: "Boeing 737 Max",
    baggageClaim: "E3",
  },
  {
    flightNumber: 1005,
    flightOriginationDate: "2025-03-05",
    operatingAirline: "Alaska Airlines",
    estimatedDepartureUTC: new Date().toISOString(),
    estimatedArrivalUTC: new Date(
      Date.now() + 5 * 60 * 60 * 1000
    ).toISOString(),
    departureCity: "Portland (PDX)",
    arrivalCity: "Las Vegas (LAS)",
    departureGate: "D3",
    arrivalGate: "C8",
    flightStatus: "Scheduled",
    statusCode: "SCH",
    equipmentModel: "Airbus A320",
  },
  {
    flightNumber: 1006,
    flightOriginationDate: "2025-03-05",
    operatingAirline: "Spirit Airlines",
    estimatedDepartureUTC: new Date(
      Date.now() + 1 * 60 * 60 * 1000
    ).toISOString(),
    estimatedArrivalUTC: new Date(
      Date.now() + 3.5 * 60 * 60 * 1000
    ).toISOString(),
    departureCity: "Orlando (MCO)",
    arrivalCity: "Houston (IAH)",
    flightStatus: "Delayed",
    statusCode: "DL",
    departureDelayMinutes: 30,
    baggageClaim: "F2",
  },
  {
    flightNumber: 1007,
    flightOriginationDate: "2025-03-05",
    operatingAirline: "Frontier Airlines",
    estimatedDepartureUTC: new Date(
      Date.now() - 2 * 60 * 60 * 1000
    ).toISOString(),
    estimatedArrivalUTC: new Date(
      Date.now() + 2 * 60 * 60 * 1000
    ).toISOString(),
    actualDepartureUTC: new Date(
      Date.now() - 1.5 * 60 * 60 * 1000
    ).toISOString(),
    departureCity: "Atlanta (ATL)",
    arrivalCity: "Phoenix (PHX)",
    flightStatus: "Departed",
    statusCode: "DEP",
    equipmentModel: "Airbus A321",
  },
  {
    flightNumber: 1008,
    flightOriginationDate: "2025-03-05",
    operatingAirline: "JetBlue",
    estimatedDepartureUTC: new Date(
      Date.now() + 3 * 60 * 60 * 1000
    ).toISOString(),
    estimatedArrivalUTC: new Date(
      Date.now() + 6 * 60 * 60 * 1000
    ).toISOString(),
    departureCity: "Boston (BOS)",
    arrivalCity: "San Diego (SAN)",
    flightStatus: "Scheduled",
    statusCode: "SCH",
    baggageClaim: "G5",
  },
  {
    flightNumber: 1009,
    flightOriginationDate: "2025-03-05",
    operatingAirline: "Hawaiian Airlines",
    estimatedDepartureUTC: new Date().toISOString(),
    estimatedArrivalUTC: new Date(
      Date.now() + 7 * 60 * 60 * 1000
    ).toISOString(),
    departureCity: "Honolulu (HNL)",
    arrivalCity: "Los Angeles (LAX)",
    flightStatus: "Boarding",
    statusCode: "BRD",
    baggageClaim: "H2",
  },
  {
    flightNumber: 1010,
    flightOriginationDate: "2025-03-05",
    operatingAirline: "Allegiant Air",
    estimatedDepartureUTC: new Date(
      Date.now() + 4 * 60 * 60 * 1000
    ).toISOString(),
    estimatedArrivalUTC: new Date(
      Date.now() + 6 * 60 * 60 * 1000
    ).toISOString(),
    departureCity: "Nashville (BNA)",
    arrivalCity: "Salt Lake City (SLC)",
    flightStatus: "Scheduled",
    statusCode: "SCH",
    equipmentModel: "Airbus A319",
    baggageClaim: "J1",
  },
];

// Insert into the database
const seedDatabaseUSA = async () => {
  try {
    const connection = await mongoose.connect(
      `mongodb://localhost:27017/go-travel-x`
    );
    console.log(
      "Database connected successfully",
      connection.connection.host,
      connection.connection.name
    );

    await DataSource.deleteMany();
    await DataSource.insertMany(dummyFlightsUSA); // Inserts dummy data

    console.log("Dummy flight data for the USA inserted successfully!");
    mongoose.connection.close();
  } catch (error) {
    console.error("Error inserting dummy data:", error);
    mongoose.connection.close();
  }
};

seedDatabaseUSA();
