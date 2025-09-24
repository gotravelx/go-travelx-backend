import logger from "../utils/Logger.js";
import DynamoDbOp from "../services/DynamodbOperations.js";
import customLogger from "../utils/Logger.js";
import { getCompressedFlightData } from "./compress-decompress.js";
import dayjs from "dayjs";

const flightSubscription = new DynamoDbOp("FlightSubscriptions", [
  "walletAddress",
  "flightNumber",
]);

export function mapStatusToFlightPhase(statusCode) {
  switch (statusCode) {
    case "CNL":
    case "CNCL":
    case "Cancelled":
      return "CANCELLED";
    case "IN":
      return "ARRIVED";
    case "ERL":
      return "EARLY";
    case "DLY":
      return "DELAYED";
    case "ONT":
      return "ON-TIME";
    case "BRD":
      return "BOARDING";
    case "DEP":
      return "DEPARTED";
    case "ArrivedGateEarly":
      return "ARRIVED";
    default:
      return "SCHEDULED";
  }
}

export const getBlockchainData = async (flightStatusResp) => {
  try {
    let flightData;

    // Extract flight data first - handle different response structures
    if (flightStatusResp?.success && flightStatusResp?.flightData) {
      flightData = flightStatusResp.flightData;
    } else if (flightStatusResp?.flightStatusResp) {
      flightData = flightStatusResp.flightStatusResp;
    } else if (flightStatusResp?.Flight) {
      flightData = flightStatusResp;
    } else if (flightStatusResp?.flightStatusResp?.Flight) {
      // Handle the actual structure from your JSON
      flightData = flightStatusResp.flightStatusResp;
    } else {
      console.error(
        "Flight response structure:",
        JSON.stringify(flightStatusResp, null, 2)
      );
      throw new Error("Unable to locate flight data in response structure");
    }

    // Now log after flightData is assigned
    customLogger.info(
      `BlockChain Data Extraction - Flight found: ${!!flightData?.Flight}`
    );
    customLogger.info(
      `BlockChain Data Extraction - FlightLegs found: ${!!flightData?.FlightLegs}`
    );

    if (flightData?.FlightLegs?.[0]?.OperationalFlightSegments?.[0]) {
      customLogger.info(
        `BlockChain Data Extraction - OperationalSegment found: true`
      );
    } else {
      customLogger.info(
        `BlockChain Data Extraction - OperationalSegment found: false`
      );
      customLogger.info(
        `Available FlightLegs structure: ${JSON.stringify(
          flightData?.FlightLegs,
          null,
          2
        )}`
      );
    }

    // Navigate through the nested structure

    const flight = flightData?.Flight;
    const operationalSegment =
      flightData?.FlightLegs?.[0]?.OperationalFlightSegments?.[0];
    const scheduledSegment =
      flightData?.FlightLegs?.[0]?.ScheduledFlightSegments?.[0];

    if (!flight || !operationalSegment) {
      console.error("Missing required data:");
      console.error("Flight:", flight);
      console.error("OperationalSegment:", operationalSegment);
      console.error("Available FlightLegs:", flightData?.FlightLegs);
      throw new Error(
        "Invalid flight status response structure - missing Flight or OperationalSegment data"
      );
    }

    // Extract flight statuses
    const flightStatuses = operationalSegment.FlightStatuses || [];
    const legStatus = flightStatuses.find(
      (status) => status.StatusType === "LegStatus"
    );
    const flightStatus = flightStatuses.find(
      (status) => status.StatusType === "FlightStatus"
    );
    const departureStatus = flightStatuses.find(
      (status) => status.StatusType === "DepartureStatus"
    );
    const arrivalStatus = flightStatuses.find(
      (status) => status.StatusType === "ArrivalStatus"
    );

    // Determine current flight status from characteristics
    const characteristics = operationalSegment.Characteristic || [];
    let currentFlightStatus = "NDPT"; // Default to Not Departed

    if (characteristics.find((c) => c.Code === "FltInInd" && c.Value === "1")) {
      currentFlightStatus = "IN";
    } else if (
      characteristics.find((c) => c.Code === "FltOnInd" && c.Value === "1")
    ) {
      currentFlightStatus = "ON";
    } else if (
      characteristics.find((c) => c.Code === "FltOffInd" && c.Value === "1")
    ) {
      currentFlightStatus = "OFF";
    } else if (
      characteristics.find((c) => c.Code === "FltOutInd" && c.Value === "1")
    ) {
      currentFlightStatus = "OUT";
    }

    const carrierCode =
      operationalSegment.OperatingAirlineCode ||
      operationalSegment.OperatingAirline?.IATACode ||
      "";

    let compressedFlightData = "";
    try {
      compressedFlightData = await getCompressedFlightData(flightData);
    } catch (compressionError) {
      customLogger.warn(
        "Failed to compress flight data:",
        compressionError.message
      );
      
      compressedFlightData = "";
    }

    // Extract individual values with proper validation and sanitization
    const flightNumber = String(flight.FlightNumber || "").trim();
    const flightCarrierCode = "UA";
    const rawDate = flight.FlightOriginationDate || flight.DepartureDate || "";
    const originateDate = rawDate ? dayjs(rawDate).format("YYYY-MM-DD") : "";


    const arrivalCity = String(
      operationalSegment.ArrivalAirport?.Address?.City || operationalSegment.ArrivalAirport?.Name?.split(",")[0] || ""
    ).trim();
    const departureCity = String(
      operationalSegment.DepartureAirport?.Address?.City || operationalSegment.DepartureAirport?.Name?.split(",")[0] || ""
    ).trim();
    const arrivalAirport = String(
      operationalSegment.ArrivalAirport?.IATACode || ""
    ).trim();
    const departureAirport = String(
      operationalSegment.DepartureAirport?.IATACode || ""
    ).trim();

    const arrivalStatusStr = String(arrivalStatus?.Code || "").trim();
    const departureStatusStr = String(departureStatus?.Code || "").trim();
    const legStatusStr = String(legStatus?.Code || "").trim();

    customLogger.info("Extracted flight data:", {
      flightNumber,
      flightCarrierCode,
      originateDate,
      arrivalAirport,
      departureAirport,
      arrivalCity,
      departureCity,
      arrivalStatusStr,
      departureStatusStr,
      legStatusStr,
    });

    if (
      !flightNumber ||
      !flightCarrierCode ||
      !arrivalAirport ||
      !departureAirport
    ) {
      console.error("Missing required flight details:");
      console.error("Flight Number:", flightNumber);
      console.error("Carrier Code:", flightCarrierCode);
      console.error("Arrival Airport:", arrivalAirport);
      console.error("Departure Airport:", departureAirport);
      throw new Error(
        "Invalid input parameters - missing required flight details"
      );
    }

    // Validate flight number and carrier code format (basic validation)
    if (flightNumber.length === 0 || flightNumber.length > 10) {
      throw new Error("Flight number must be between 1-10 characters");
    }

    if (flightCarrierCode.length === 0 || flightCarrierCode.length > 5) {
      throw new Error("Carrier code must be between 1-5 characters");
    }

    if (arrivalAirport.length !== 3 || departureAirport.length !== 3) {
      throw new Error("Airport codes must be exactly 3 characters");
    }

    const flightDetailsArray = [
      flightCarrierCode,
      flightNumber,
      originateDate,
      arrivalAirport,
      departureAirport,
      arrivalCity,
      departureCity,
      arrivalStatusStr,
      departureStatusStr,
      legStatusStr,
    ];

    // Validate array length
    if (flightDetailsArray.length !== 10) {
      throw new Error(
        `Flight details array must have exactly 10 elements, got ${flightDetailsArray.length}`
      );
    }

    // Ensure no undefined values in the array
    const sanitizedArray = flightDetailsArray.map((item, index) => {
      const str = String(item || "").trim();
      customLogger.info(`Array[${index}]: "${str}" (length: ${str.length})`);
      return str;
    });

    // Also create an object version for easier access
    const flightDetailsObject = {
      flightNumber,
      carrierCode: flightCarrierCode,
      originateDate,
      arrivalCity,
      departureCity,
      arrivalAirport,
      departureAirport,
      arrivalStatus: arrivalStatusStr,
      departureStatus: departureStatusStr,
      legStatus: legStatusStr,
      currentFlightStatus: currentFlightStatus,
    };

    customLogger.info("Successfully prepared blockchain data", {
      flightNumber,
      carrierCode: flightCarrierCode,
      arrayLength: sanitizedArray.length,
      compressedDataLength: compressedFlightData.length,
    });

    return {
      success: true,
      flightDetails: flightDetailsObject, // Object format for easy access
      flightDetailsArray: sanitizedArray, // Array format for smart contract
      compressedFlightData: compressedFlightData,
    };
  } catch (error) {
    console.error("Error preparing blockchain data:", error.message);
    customLogger.error("Error preparing blockchain data:", error);
    return {
      success: false,
      error: error.message,
      data: null,
    };
  }
};

export const extractKeyFlightInfo = (flightData) => {
  try {
    const flight = flightData.flightData.Flight;
    const operationalSegment =
      flightData.flightData.FlightLegs?.[0]?.OperationalFlightSegments?.[0];
    const scheduledSegment =
      flightData.flightData.FlightLegs?.[0]?.ScheduledFlightSegments?.[0];

    if (!flight) {
      throw new Error("Invalid flight data structure");
    }

    // const carrierCode =
    //   operationalSegment.OperatingAirlineCode ||
    //   operationalSegment.OperatingAirline?.IATACode ||
    //   "";

    if (!operationalSegment) {
      logger.error(
        "[EXTRACT FLIGHT INFO] Operational segment not found for flight:",
        flight.FlightNumber
      );
      throw new Error(`${flight.FlightNumber} - Operational segment not found`);
    }

    logger.info(
      `[EXTRACT FLIGHT INFO] Extracting key flight information... ${flight.FlightNumber} ${operationalSegment?.FlightStatuses?.[0]?.Description} }`
    );

    // Helper function to determine if flight is canceled
    const isCanceled =
      operationalSegment?.FlightStatuses?.some(
        (status) =>
          status.Code === "CNL" ||
          status.Code === "CNCL" ||
          status.Code === "Cancelled"
      ) || false;

    return {
      // Basic Flight Info
      flightNumber: flight.FlightNumber,
      departureDate: flight.DepartureDate,
      carrierCode: "UA",
      // Airports
      departureAirport: {
        code: operationalSegment?.DepartureAirport?.IATACode,
        name: operationalSegment?.DepartureAirport?.Name,
        shortName: operationalSegment?.DepartureAirport?.ShortName,
        city: operationalSegment?.DepartureAirport?.Address?.City,
        state:
          operationalSegment?.DepartureAirport?.Address?.StateProvince?.Name,
        departureGate: operationalSegment?.DepartureGate || null,
        departureTerminal: operationalSegment?.DepartureTerminal || null,
      },
      arrivalAirport: {
        code: operationalSegment?.ArrivalAirport?.IATACode,
        name: operationalSegment?.ArrivalAirport?.Name,
        shortName: operationalSegment?.ArrivalAirport?.ShortName,
        city: operationalSegment?.ArrivalAirport?.Address?.City,
        state: operationalSegment?.ArrivalAirport?.Address?.StateProvince?.Name,
        arrivalGate: operationalSegment?.ArrivalGate || null,
        arrivalTerminal:
          operationalSegment?.ArrivalTermimal ||
          operationalSegment?.ArrivalTerminal ||
          null,
      },

      // Timing Information
      times: {
        // Scheduled Times
        scheduledDeparture: scheduledSegment?.DepartureDateTime || null,
        scheduledArrival: scheduledSegment?.ArrivalDateTime || null,

        // Estimated Times
        estimatedDeparture: operationalSegment?.EstimatedDepartureTime || null,
        estimatedArrival: operationalSegment?.EstimatedArrivalTime || null,

        // Actual Times
        actualDeparture: operationalSegment?.ActualDepartureTime || null,
        actualArrival: operationalSegment?.ActualArrivalTime || null,

        // Gate Times
        outTime: operationalSegment?.OutTime || null,
        offTime: operationalSegment?.OffTime || null,
        onTime: operationalSegment?.OnTime || null,
        inTime: operationalSegment?.InTime || null,

        // Board Time
        boardTime: operationalSegment.BoardTime || null,
      },

      // Delay Information
      delays: {
        arrivalDelayMinutes:
          parseInt(operationalSegment.ArrivalDelayMinutes) || 0,
        departureDelayMinutes:
          parseInt(operationalSegment.DepartureDelayMinutes) || 0,
        estimatedDepartureDelayMinutes:
          parseInt(operationalSegment.EstimatedDepartureDelayMinutes) || 0,
        estimatedArrivalDelayMinutes:
          parseInt(operationalSegment.EstimatedArrivalDelayMinutes) || 0,
      },

      // Aircraft Information
      aircraft: {
        model: operationalSegment.Equipment?.Model?.Description,
        tailNumber: operationalSegment.Equipment?.TailNumber,
        totalSeats: operationalSegment.Equipment?.Cabins?.find(
          (cabin) => cabin.Name === "TotalCabinCapacity"
        )?.TotalSeats,
      },

      // Flight Status
      status: {
        current: operationalSegment.FlightStatuses?.[0]?.Description,
        code: operationalSegment.FlightStatuses?.[0]?.Code,
        legStatus: operationalSegment.FlightStatuses?.find(
          (status) => status.StatusType === "LegStatus"
        )?.Code,
        departureStatus: operationalSegment.FlightStatuses?.find(
          (status) => status.StatusType === "DepartureStatus"
        )?.Code,
        arrivalStatus: operationalSegment.FlightStatuses?.find(
          (status) => status.StatusType === "ArrivalStatus"
        )?.Code,
      },

      // Operating Airline
      airline: {
        code: operationalSegment.OperatingAirlineCode || "",
        name: operationalSegment.OperatingAirline?.Name || "",
        website: operationalSegment.OperatingAirline?.WebSite || "",
        phone:
          operationalSegment.OperatingAirline?.Telephone?.[0]?.PhoneNumber ||
          "",
      },

      isCanceled: isCanceled,

      // Equipment
      equipmentModel: operationalSegment?.Equipment?.Model?.Description || "",

      // Flight Duration
      duration: {
        planned: operationalSegment.PlannedEnrouteTime || null,
        actual: operationalSegment.ActualEnrouteTime || null,
        scheduled: scheduledSegment?.ScheduledFlightDuration || null,
      },

      baggageClaim: operationalSegment?.ArrivalBagClaimUnit || "",

      // Marketing Flight Segment
      marketedFlightSegment: scheduledSegment?.MarketedFlightSegment,

      // Additional Info
      flightType: operationalSegment.FlightType,
      isInternational: operationalSegment.IsInternational === "True",
    };
  } catch (error) {
    console.error("[EXTRACT FLIGHT INFO] Error:", error);
    throw new Error("Failed to extract flight information");
  }
};

// Check if flight is subscribed by user
export const checkFlightSubscription = async (walletAddress, flightNumber) => {
  try {
    const subscription = await flightSubscription.findOne({
      walletAddress: String(walletAddress),
      flightNumber: String(flightNumber),
    });

    return subscription.isSubscriptionActive;
  } catch (error) {
    console.error("[SUBSCRIPTION CHECK] Error:", error);
    return false;
  }
};
