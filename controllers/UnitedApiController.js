import fetch from "node-fetch";
import https from "https";
import dotenv from "dotenv";
import logger from "../utils/Logger.js";
import TokenRefresher from "../helper/0authTokenManager.js";
import tokenConfig from "../config/0authTokenConfig.js";
import {
  checkFlightSubscription,
  extractKeyFlightInfo,
} from "../helper/helper.js";

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

    let url = `${process.env.API}?fltNbr=${flightNumber}`;

    if (options.departureDate) {
      url += `&fltLegSchedDepDt=${options.departureDate}`;
    }

    if (options.departure) {
      url += `&departure=${options.departure}`;
    }

    if (options.arrival) {
      url += `&arrival=${options.arrival}`;
    }

    logger.info(`[API] Fetching flight data from: [United API]`);

    let token = await tokenRefresher.getToken();

    if (!token) {
      throw new Error("Unable to obtain access token");
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      agent: agent, // Uncomment if you need this
      timeout: 30000, // Note: fetch doesn't support timeout directly
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    logger.info(`Response status: ${response.status}`);

    if (data.info && data.info[0].cd === "200") {
      const legs = data.flightStatusResp?.FlightLegs;
      const hasOperationalSegments =
        Array.isArray(legs) &&
        legs.length > 0 &&
        Array.isArray(legs[0].OperationalFlightSegments) &&
        legs[0].OperationalFlightSegments.length > 0;

      if (!hasOperationalSegments) {
        logger.warn("[UNITED API] No flight legs found in response");
        return {
          success: false,
          errorMessage: "Flight legs are not defined or empty",
        };
      }
      const flightNumber = data.flightStatusResp?.Flight?.FlightNumber || "N/A";
      const from =
        data.flightStatusResp?.FlightLegs?.[0]?.OperationalFlightSegments?.[0]
          ?.DepartureAirport?.Name || "N/A";
      const to =
        data.flightStatusResp?.FlightLegs?.[0]?.OperationalFlightSegments?.[0]
          ?.ArrivalAirport?.Name || "N/A";


      logger.info(
        `[UNITED API] Flight data fetched successfully Flight Number: ${flightNumber} From: ${from} To: ${to}`
      );
      return {
        success: true,
        flightData: data?.flightStatusResp,
      };
    }

    if (data.info && data.info[0].cd === "404") {
      logger.warn("[UNITED API] Flight not found");
      return {
        success: false,
        errorMessage: "Flight not found",
      };
    }

    if (data.info && data.info[0].cd === "500") {
      logger.error("[UNITED API] Internal server error");
      return {
        success: false,
        errorMessage: "Internal server error",
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
    const { departureDate, departure, arrival, includeFullData } = req.query;

    const walletAddress = process.env.WALLET_ADDRESS;

    const flightData = await fetchFlightData(flightNumber, {
      departureDate,
      departure,
      arrival,
    });

    console.log('flightData:', flightData);
    

    const keyFlightInfo = extractKeyFlightInfo(flightData);

    let isSubscribed = false;
    if (walletAddress) {
      isSubscribed = await checkFlightSubscription(walletAddress, flightNumber);
    }

    const response = {
      success: true,
      flightInfo: {
        ...keyFlightInfo,
        isSubscribed,
      },
    };

    if (includeFullData === "true" || includeFullData === true) {
      response.fullFlightData = flightData;
    }

    return res.status(200).json(response);
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
