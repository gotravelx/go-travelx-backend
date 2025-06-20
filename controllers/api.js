import fetch from "node-fetch";
import https from "https";
import dotenv from "dotenv";
import logger from "../utils/logger.js";
import TokenRefresher from "../helper/0authTokenManager.js";
import tokenConfig from "../config/0authTokenConfig.js";

const agent = new https.Agent({
  rejectUnauthorized: false,
});

dotenv.config();

const tokenRefresher = new TokenRefresher(tokenConfig);

export const fetchFlightData = async (flightNumber, options = {}) => {
  try {
    logger.info(
      `[API] Fetching flight ${flightNumber} , data from external API...`
    );

    if (!flightNumber) {
      throw new Error("Flight number is required");
    }
    
    console.log("--------------------------------->", process.env.API);
    let url = `${process.env.API}?fltNbr=${flightNumber}`;

    // Add optional parameters if provided
    if (options.departureDate) {
      url += `&fltLegSchedDepDt=${options.departureDate}`;
    }

    if (options.departure) {
      url += `&departure=${options.departure}`;
    }

    logger.info(`[API] Fetching flight data from: ${url}`);

    // Use the singleton instance and await the token
    let token = await tokenRefresher.getToken();
    console.log("--------------------->", token ? `${token.substring(0, 50)}...` : 'null');
    
    if (!token) {
      throw new Error("Unable to obtain access token");
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      // agent: agent, // Uncomment if you need this
      // timeout: 30000, // Note: fetch doesn't support timeout directly
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    logger.info(`Response status: ${response.status}`);

    if (data.info && data.info[0].cd === "200") {
      if (data.flightStatusResp.Error) {
        const errorCode = data.flightStatusResp.Error[0].Code;
        const errorDescription = data.flightStatusResp.Error[0].Description;
        logger.info(`[API] Flight not found: ${errorDescription}`);
        return {
          success: false,
          errorMessage: `Sorry, we couldn't find flight ${flightNumber}. Please verify the flight number and try again.`,
          errorDetails: {
            code: errorCode,
            description: errorDescription,
          },
        };
      } else {
        logger.info(`[API] Successfully fetched flight ${flightNumber} data`);
        const segment =
          data.flightStatusResp.FlightLegs?.[0]?.OperationalFlightSegments?.[0];
        const scheduledSegment =
          data.flightStatusResp.FlightLegs?.[0]?.ScheduledFlightSegments?.[0];
        if (!segment || !scheduledSegment) {
          throw new Error("No flight segment data found");
        }
        const flightStatusData = segment.FlightStatuses?.find(
          (status) => status.StatusType === "LegStatus"
        );
        const flightStatus = flightStatusData?.Description || "Unknown";
        const statusCode = flightStatusData?.Code || "Unknown";
        const isCanceled = statusCode === "CNCL";

        const arrivalFlightStatusData = segment.FlightStatuses?.find(
          (status) => status.StatusType === "arrivalState"
        );
        const arrivalState = arrivalFlightStatusData?.Description || "Unknown";

        const departureFlightStatusData = segment.FlightStatuses?.find(
          (status) => status.StatusType === "departureState"
        );
        const departureState =
          departureFlightStatusData?.Description || "Unknown";

        const marketedFlightSegment = scheduledSegment?.MarketedFlightSegment;

        const operatingAirline =
          segment.OperatingAirline?.IATACode || "Unknown";

        const flightIndicators = segment.Characteristic?.reduce((acc, char) => {
          if (
            [
              "FltOutInd",
              "FltOffInd",
              "FltOnInd",
              "FltInInd",
              "FltCnclInd",
            ].includes(char.Code)
          ) {
            acc[char.Code] = char.Value === "1";
          }
          return acc;
        }, {});

        let currentFlightStatus = "ndpt";
        if (flightIndicators?.FltInInd) currentFlightStatus = "in";
        else if (flightIndicators?.FltOnInd) currentFlightStatus = "on";
        else if (flightIndicators?.FltOffInd) currentFlightStatus = "off";
        else if (flightIndicators?.FltOutInd) currentFlightStatus = "out";
        else if (flightIndicators?.FltCnclInd) currentFlightStatus = "canceled";

        const flightData = {
          success: true,
          flightNumber: data.flightStatusResp.Flight.FlightNumber,
          flightDepartureDate:
            data.flightStatusResp.Flight.FlightOriginationDate,
          carrierCode: "UA",
          operatingAirline,
          estimatedArrivalUTC: segment.EstimatedArrivalUTCTime,
          estimatedDepartureUTC: segment.EstimatedDepartureUTCTime,
          actualDepartureUTC: segment.ActualDepartureUTCTime || "",
          actualArrivalUTC: segment.ActualArrivalUTCTime || "",
          outTimeUTC: segment.OutUTCTime || "",
          offTimeUTC: segment.OffUTCTime || "",
          onTimeUTC: segment.OnUTCTime || "",
          inTimeUTC: segment.InUTCTime || "",
          arrivalCity: segment.ArrivalAirport.Address.City,
          departureCity: segment.DepartureAirport.Address.City,
          arrivalState,
          departureState,
          arrivalAirport: segment.ArrivalAirport.IATACode,
          departureAirport: segment.DepartureAirport.IATACode,
          departureGate: segment.DepartureGate || "TBD",
          arrivalGate: segment.ArrivalGate || "TBD",
          departureTerminal: segment.DepartureTerminal || "TBD",
          arrivalTerminal:
            segment.ArrivalTermimal || segment.ArrivalTerminal || "TBD",
          flightStatus,
          statusCode,
          equipmentModel: segment.Equipment.Model.Description,
          currentFlightStatus,
          baggageClaim: segment.ArrivalBagClaimUnit?.trim() || "TBD",
          departureDelayMinutes: segment.DepartureDelayMinutes
            ? parseInt(segment.DepartureDelayMinutes, 10)
            : segment.EstimatedDepartureDelayMinutes
            ? parseInt(segment.EstimatedDepartureDelayMinutes, 10)
            : 0,
          arrivalDelayMinutes: segment.ArrivalDelayMinutes
            ? parseInt(segment.ArrivalDelayMinutes, 10)
            : segment.EstimatedArrivalDelayMinutes
            ? parseInt(segment.EstimatedArrivalDelayMinutes, 10)
            : 0,
          boardingTime: segment.BoardTime,
          isCanceled,
          scheduledArrivalUTCDateTime: scheduledSegment?.ArrivalUTCDateTime,
          scheduledDepartureUTCDateTime: scheduledSegment?.DepartureUTCDateTime,
          marketedFlightSegment,
        };

        return flightData;
      }
    } else {
      logger.info(
        `[API] API call failed: ${data.info?.[0]?.msg || "Unknown error"}`
      );
      return {
        success: false,
        errorMessage:
          "Unable to check flight status at this time. Please try again later.",
        errorDetails: {
          code: data.info?.[0]?.cd || "Unknown",
          description: data.info?.[0]?.msg || "Unknown error",
        },
      };
    }
  } catch (error) {
    logger.error("[API] Error fetching flight data:", error);
    return {
      success: false,
      errorMessage:
        "An error occurred while checking flight status. Please try again later.",
      errorDetails: {
        description: error.message,
      },
    };
  }
};

export const fetchFlightDetails = async (req, res) => {
  try {
    const { flightNumber } = req.params;
    const { departureDate, departure, arrival } = req.query;

    const flightData = await fetchFlightData(flightNumber, {
      departureDate,
      departure,
      arrival
    });

    console.log(flightData);
    
    return res.status(200).json(flightData);
  } catch (error) {
    logger.error("Error fetching flight details:", error);
    return res.status(500).json({
      success: false,
      errorMessage: "Server error while fetching flight details",
      errorDetails: {
        description: error.message,
      },
    });
  }
};

