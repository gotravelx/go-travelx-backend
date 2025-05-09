import fetch from "node-fetch";
import https from "https";
import dotenv from "dotenv";
import FlightSubscription from "../model/flight-subscription.js";
import DataSource from "../model/data-source.js";
import customLogger from "../utils/logger.js";
const agent = new https.Agent({
  rejectUnauthorized: false,
});

dotenv.config();

export const fetchFlightData = async (flightNumber, options = {}) => {
  try {
    console.log(
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

    console.log(`[API] Fetching flight data from: ${url}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      agent: agent,
      timeout: 30000, // 30 second timeout
    });

    const data = await response.json();

    if (data.info && data.info[0].cd === "200") {
      if (data.flightStatusResp.Error) {
        const errorCode = data.flightStatusResp.Error[0].Code;
        const errorDescription = data.flightStatusResp.Error[0].Description;
        console.log(`[API] Flight not found: ${errorDescription}`);
        return {
          success: false,
          errorMessage: `Sorry, we couldn't find flight ${flightNumber}. Please verify the flight number and try again.`,
          errorDetails: {
            code: errorCode,
            description: errorDescription,
          },
        };
      } else {
        console.log(`[API] Successfully fetched flight ${flightNumber} data`);
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
      console.log(
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
    console.log("[API] Error fetching flight data:", error);
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
    const { departureDate, departure } = req.query;

    const walletAddress =
      req.headers["wallet-address"] || req.query.walletAddress;

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        errorMessage: "Wallet address is required",
      });
    }

    const flightData = await fetchFlightData(flightNumber, {
      departureDate,
      departure,
    });

    const subscription = await FlightSubscription.findOne({
      walletAddress,
      flightNumber,
      departureAirport: departure,
    });

    const isSubscribed = !!subscription;

    const updatedFlightData = {
      ...flightData,
      isSubscribed: isSubscribed,
    };

    if (flightData.success) {
      return res.status(200).json({
        flightData: updatedFlightData,
      });
    } else {
      return res.status(404).json({
        errorMessage: "Flight data not found.",
        flightData: updatedFlightData,
      });
    }
  } catch (error) {
    customLogger.error("Error fetching flight details:", error);
    return res.status(500).json({
      success: false,
      errorMessage: "Server error while fetching flight details",
      errorDetails: {
        description: error.message,
      },
    });
  }
};

export const fetchFlightStatus = async (req, res) => {
  try {
    const { flightNumber } = req.params;
    const { departureDate, departure } = req.query;

    // Assuming walletAddress is sent via request headers or query
    const walletAddress =
      req.headers["wallet-address"] || req.query.walletAddress;

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        errorMessage: "Wallet address is required",
      });
    }

    // Fetch flight data using Mongoose query
    const flightData = await DataSource.findOne({
      flightNumber: flightNumber,
      scheduledDepartureDate: departureDate,
      departureAirport: departure,
    });

    // If no flight data found
    if (!flightData) {
      return res.status(404).json({
        success: false,
        errorMessage: "Flight data not found.",
      });
    }

    // Check if the user is subscribed to the flight
    const subscription = await FlightSubscription.findOne({
      walletAddress,
      flightNumber,
      departureAirport: departure,
    });

    const isSubscribed = !!subscription; // Check if subscription exists

    // Create a new flight data object, adding isSubscribed
    const updatedFlightData = {
      ...flightData.toObject(), // Convert Mongoose document to plain object
      isSubscribed: isSubscribed,
    };

    // Send the response with updated flight data
    return res.status(200).json({
      success: true,
      flightData: updatedFlightData,
    });
  } catch (error) {
    customLogger.error("Error fetching flight details:", error);
    return res.status(500).json({
      success: false,
      errorMessage: "Server error while fetching flight details",
      errorDetails: {
        description: error.message,
      },
    });
  }
};

export const fetchFlightStatusData = async (
  flightNumber,
  scheduledDepartureDate,
  departureAirport
) => {
  try {
    customLogger.info(
      "Fetch Flight Status Data ",
      flightNumber,
      scheduledDepartureDate,
      departureAirport
    );

    // Fetch flight data using Mongoose query
    const flightData = await DataSource.findOne({
      flightNumber,
      scheduledDepartureDate,
      departureAirport,
    });

    // console.log(">---------------- flightData", flightData);

    // If no flight data found
    if (!flightData) {
      return null;
    }

    // Convert to plain object and remove _id
    const flightDataObj = flightData.toObject();
    delete flightDataObj._id;

    return flightDataObj;
  } catch (error) {
    customLogger.error("Error fetching flight data:", error.message);
    return null;
  }
};
