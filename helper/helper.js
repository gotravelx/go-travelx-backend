import logger from "../utils/Logger.js";
import { prepareFlightDataForBlockchain } from "../controllers/EncryptController.js";
import DynamoDbOp from "../services/DynamodbOperations.js";
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

export const getBlockchainData = async (flightStatusResp, encryptionKey) => {
  try {
    let flightData;

    if (flightStatusResp?.success && flightStatusResp?.flightData) {
      flightData = flightStatusResp.flightData;
    }

    else if (flightStatusResp?.flightStatusResp) {
      flightData = flightStatusResp.flightStatusResp;
    }

    else if (flightStatusResp?.Flight) {
      flightData = flightStatusResp;
    } else {
      throw new Error("Unable to locate flight data in response structure");
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

    // Extract marketing segments
    const marketedFlightSegment = scheduledSegment?.MarketedFlightSegment || [];

    // Extract and validate useful keys from flight data
    const extractedFlightData = {
      // Required fields
      flightNumber: flight.FlightNumber || "",
      carrierCode:
        operationalSegment.OperatingAirline?.IATACode ||
        scheduledSegment?.OperatingAirlineCode ||
        "",
      scheduledDepartureDate: flight.FlightOriginationDate || flight.DepartureDate || "",

      // Basic flight information
      arrivalCity: operationalSegment.ArrivalAirport?.Address?.City || "",
      departureCity: operationalSegment.DepartureAirport?.Address?.City || "",
      arrivalAirport: operationalSegment.ArrivalAirport?.IATACode || "",
      departureAirport: operationalSegment.DepartureAirport?.IATACode || "",
      operatingAirline:
        operationalSegment.OperatingAirline?.Name ||
        operationalSegment.OperatingAirline?.IATACode ||
        "",

      // Gate information
      arrivalGate: operationalSegment.ArrivalGate || "",
      departureGate: operationalSegment.DepartureGate || "",

      // Aircraft information
      equipmentModel:
        operationalSegment.Equipment?.Model?.Description ||
        scheduledSegment?.Equipment?.Model?.Description ||
        "",

      // Current flight status
      currentFlightStatus: currentFlightStatus,
      flightStatusDescription:
        legStatus?.Description || flightStatus?.Description || "",
      statusCode: legStatus?.Code || flightStatus?.Code || "",

      // UTC Time fields
      actualArrivalUTC: operationalSegment.ActualArrivalUTCTime || "",
      actualDepartureUTC: operationalSegment.ActualDepartureUTCTime || "",
      estimatedArrivalUTC: operationalSegment.EstimatedArrivalUTCTime || "",
      estimatedDepartureUTC: operationalSegment.EstimatedDepartureUTCTime || "",
      scheduledArrivalUTCDateTime:
        operationalSegment.ArrivalUTCDateTime ||
        scheduledSegment?.ArrivalUTCDateTime ||
        "",
      scheduledDepartureUTCDateTime:
        operationalSegment.DepartureUTCDateTime ||
        scheduledSegment?.DepartureUTCDateTime ||
        "",

      // Status transition timestamps (these may not be available in this response format)
      outTimeUTC: "", // Would need to be tracked separately
      offTimeUTC: "", // Would need to be tracked separately
      onTimeUTC: "", // Would need to be tracked separately
      inTimeUTC: "", // Would need to be tracked separately

      // Delay information
      arrivalDelayMinutes: parseInt(
        operationalSegment.EstimatedArrivalDelayMinutes || "0"
      ),
      departureDelayMinutes: parseInt(
        operationalSegment.EstimatedDepartureDelayMinutes || "0"
      ),

      // Location states
      arrivalState:
        operationalSegment.ArrivalAirport?.StateProvince?.StateProvinceCode ||
        operationalSegment.ArrivalAirport?.Address?.StateProvince?.Name ||
        "",
      departureState:
        operationalSegment.DepartureAirport?.StateProvince?.StateProvinceCode ||
        operationalSegment.DepartureAirport?.Address?.StateProvince?.Name ||
        "",

      // Baggage information
      bagClaim: operationalSegment.BagClaim || "",

      // Marketing segments (codeshare flights)
      marketedFlightSegment: marketedFlightSegment,
    };

    // Validate that we have the minimum required fields
    if (!extractedFlightData.flightNumber) {
      throw new Error("Flight number is required");
    }
    if (!extractedFlightData.carrierCode) {
      throw new Error("Carrier code is required");
    }
    if (!extractedFlightData.scheduledDepartureDate) {
      throw new Error("Scheduled departure date is required");
    }

    const blockchainData = prepareFlightDataForBlockchain(
      extractedFlightData,
      encryptionKey
    );

    // Validate that blockchain data contains the expected arrays
    if (
      !blockchainData.blockchainFlightData ||
      !Array.isArray(blockchainData.blockchainFlightData)
    ) {
      console.error("Missing or invalid blockchainFlightData array");
    }
    if (
      !blockchainData.marketingAirlineCodes ||
      !Array.isArray(blockchainData.marketingAirlineCodes)
    ) {
      console.error("Missing or invalid marketingAirlineCodes array");
    }

    return blockchainData;
  } catch (error) {
    console.error("Error preparing blockchain data:", error.message);
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

    return !!subscription;
  } catch (error) {
    console.error("[SUBSCRIPTION CHECK] Error:", error);
    return false;
  }
};
