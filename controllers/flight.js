import FlightData from "../model/flight.js";
import dotenv from "dotenv";
import { fetchFlightStatusData } from "./api.js";
import blockchainService from "../utils/flightBlockchainService.js";
import FlightSubscription from "../model/flight-subscription.js";
import { prepareFlightDataForBlockchain } from "./encrypt.js";
import { startFlightStatusMonitoring } from "./cron-job.js";
import customLogger from "../utils/logger.js";

dotenv.config();
const encryptionKey = process.env.ENCRYPTION_KEY;
customLogger.warn(`[BLOCKCHAIN] Encryption Key ${encryptionKey}`);

const saveFlightDataToMongoDB = async (flightData, transactionHash) => {
  try {
    customLogger.info(
      `[MongoDB] Saving Flight Data ${{
        flightData: flightData.flightNumber,
        transactionHash: transactionHash,
      }} `
    );

    const flightNumber = flightData.flightNumber;
    const departureDelayMinutes = flightData.departureDelayMinutes || 0;
    const arrivalDelayMinutes = flightData.arrivalDelayMinutes || 0;

    const mongoData = new FlightData({
      flightNumber: flightNumber,
      scheduledDepartureDate: flightData.scheduledDepartureDate,
      carrierCode: flightData.carrierCode,
      operatingAirline: flightData.operatingAirline,
      estimatedArrivalUTC: flightData.estimatedArrivalUTC,
      estimatedDepartureUTC: flightData.estimatedDepartureUTC,
      actualDepartureUTC: flightData.actualDepartureUTC,
      actualArrivalUTC: flightData.actualArrivalUTC,
      scheduledArrivalUTCDateTime: flightData.scheduledArrivalUTCDateTime,
      scheduledDepartureUTCDateTime: flightData.scheduledDepartureUTCDateTime,
      outTimeUTC: flightData.outTimeUTC,
      offTimeUTC: flightData.offTimeUTC,
      onTimeUTC: flightData.onTimeUTC,
      inTimeUTC: flightData.inTimeUTC,
      arrivalCity: flightData.arrivalCity,
      departureCity: flightData.departureCity,
      arrivalState: flightData.arrivalState,
      departureState: flightData.departureState,
      arrivalAirport: flightData.arrivalAirport,
      departureAirport: flightData.departureAirport,
      departureGate: flightData.departureGate,
      arrivalGate: flightData.arrivalGate,
      equipmentModel: flightData.equipmentModel,
      statusCode: flightData.statusCode,
      flightStatusDescription: flightData.flightStatusDescription,
      currentFlightStatus: flightData.currentFlightStatus || "ndpt",
      bagClaim: flightData.bagClaim,
      departureDelayMinutes: Number(departureDelayMinutes),
      arrivalDelayMinutes: Number(arrivalDelayMinutes),
      marketedFlightSegment: flightData.MarketedFlightSegment
        ? flightData.MarketedFlightSegment.map((segment) => ({
            MarketingAirlineCode: segment.MarketingAirlineCode,
            FlightNumber: segment.FlightNumber,
          }))
        : [],
      departureTerminal: flightData.departureTerminal,
      arrivalTerminal: flightData.arrivalTerminal,
      boardingTime: flightData.boardingTime,
      isCanceled: flightData.isCanceled || false,
      isDiverted: flightData.isDiverted || false,
      isReturnedToGate: flightData.isReturnedToGate || false,
      isReturnedToAirport: flightData.isReturnedToAirport || false,
      isExtraStop: flightData.isExtraStop || false,
      isNoStop: flightData.isNoStop || false,
      hasMishap: flightData.hasMishap || false,
      decisionTimeUTC: flightData.decisionTimeUTC,
      blockchainUpdated: true,
      blockchainTxHash: transactionHash,
      isSubscribed: flightData.isSubscribed || false,
    });

    return await mongoData.save();
  } catch (error) {
    customLogger.error(
      `[MongoDB] Error Saving Flight Data ${{
        error: error.message,
        stack: error.stack,
        error: error,
      }} `
    );

    console.log(
      "[MongoDB] Error Saving Flight Data",
      error.message,
      error.stack
    );

    throw error;
  }
};

export const addFlightSubscription = async (req, res) => {
  try {
    console.log("[API] Flight Subscription Request Received:", {
      body: req.body,
      timestamp: new Date().toISOString(),
    });

    const {
      flightNumber,
      scheduledDepartureDate,
      departureAirport,
      carrierCode,
      walletAddress,
    } = req.body;

    if (
      !flightNumber ||
      !scheduledDepartureDate ||
      !carrierCode ||
      !departureAirport ||
      !walletAddress
    ) {
      console.log("[API] Validation Failed - Missing Parameters", {
        providedParams: Object.keys(req.body),
        missingParams: {
          flightNumber: !flightNumber,
          scheduledDepartureDate: !scheduledDepartureDate,
          carrierCode: !carrierCode,
          departureAirport: !departureAirport,
          walletAddress: !walletAddress,
        },
      });

      return res.status(400).json({
        error: "Missing required parameters",
        details: {
          flightNumber: !!flightNumber,
          scheduledDepartureDate: !!scheduledDepartureDate,
          carrierCode: !!carrierCode,
          departureAirport: !!departureAirport,
          walletAddress: !!walletAddress,
        },
      });
    }

    // 1. Fetch flight data from external source
    console.log("[API] Fetching Flight Status Data", {
      flightNumber,
      scheduledDepartureDate,
      departureAirport,
      walletAddress,
    });

    const flightData = await fetchFlightStatusData(
      flightNumber,
      scheduledDepartureDate,
      departureAirport
    );

    if (!flightData) {
      console.log("[API] Flight Data Not Found", {
        flightNumber,
        scheduledDepartureDate,
        departureAirport,
      });

      return res.status(404).json({
        error: "Flight data not found",
        details: {
          flightNumber,
          scheduledDepartureDate,
          departureAirport,
        },
      });
    }

    console.log("[API] Flight Data Retrieved Successfully", {
      flightNumber: flightData.flightNumber,
      carrierCode: flightData.carrierCode,
      flightData,
    });

    // 2. Check if flight exists in blockchain
    console.log("[BLOCKCHAIN] Checking Flight Existence", {
      flightNumber,
    });

    const isFlightExist = await blockchainService.checkFlightExistence(
      flightNumber
    );

    console.log("[BLOCKCHAIN] Flight Existence Check", {
      flightNumber,
      exists: isFlightExist,
    });

    // If flight does not exist in blockchain, insert flight details
    if (!isFlightExist) {
      console.log("[BLOCKCHAIN] Inserting Flight Details", {
        flightNumber: flightData.flightNumber,
        carrierCode: flightData.carrierCode,
      });

      try {
        const preparedData = prepareFlightDataForBlockchain(
          flightData,
          encryptionKey
        );

        // The blockchain service will receive data where only specific fields are unencrypted
        const blockchainInsertService =
          await blockchainService.insertFlightDetails(
            preparedData.blockchainFlightData, // Contains mix of encrypted and unencrypted data
            preparedData.blockchainUtcTimes, // Fully encrypted
            preparedData.blockchainStatusData, // Fully encrypted
            preparedData.marketingAirlineCodes, // Fully encrypted
            preparedData.marketingFlightNumbers // Fully encrypted
          );

        console.log("[BLOCKCHAIN] Flight Details Inserted Successfully", {
          flightNumber: flightData.flightNumber,
          transactionHash: blockchainInsertService.transactionHash,
        });

        // Use the original data for MongoDB to avoid validation errors
        const flightInsert = await saveFlightDataToMongoDB(
          flightData,
          blockchainInsertService.transactionHash
        );
        console.log("[API] Flight Details Inserted Successfully In Mongodb", {
          flightNumber: flightData.flightNumber,
          flightInsert,
        });
      } catch (insertError) {
        customLogger.error("[BLOCKCHAIN] Error Inserting Flight Details", {
          flightNumber: flightData.flightNumber,
          error: insertError.message,
        });
        console.log("[API] Error Inserting Flight Details In Mongodb", {
          flightNumber: flightData.flightNumber,
          error: insertError.message,
        });
        return res.status(500).json({
          error: "Failed to insert flight details in blockchain",
          details: insertError.message,
        });
      }
    }

    // Check if user is already subscribed to this flight
    console.log("[BLOCKCHAIN] Checking Flight Subscription", {
      walletAddress,
      flightNumber,
      carrierCode,
      departureAirport,
    });

    const isSubscribed = await blockchainService.checkFlightSubscription(
      walletAddress,
      flightNumber,
      carrierCode,
      departureAirport
    );

    console.log("[BLOCKCHAIN] Subscription Check Result", {
      walletAddress,
      flightNumber,
      isSubscribed,
    });

    if (isSubscribed) {
      console.log("[API] User Already Subscribed", {
        walletAddress,
        flightNumber,
      });

      return res.status(200).json({
        ...flightData,
        isSubscribed: true,
        message: "Already subscribed to this flight",
      });
    }

    // Add subscription to blockchain
    console.log("[BLOCKCHAIN] Attempting Flight Subscription", {
      flightNumber,
      carrierCode,
      departureAirport,
    });

    let blockchainSubscription;
    try {
      blockchainSubscription = await blockchainService.addFlightSubscription(
        flightNumber,
        carrierCode,
        departureAirport
      );

      console.log("[BLOCKCHAIN] Subscription Added Successfully", {
        flightNumber,
        transactionHash: blockchainSubscription.transactionHash,
      });
    } catch (subscriptionError) {
      customLogger.error("[BLOCKCHAIN] Subscription Error", {
        flightNumber,
        error: subscriptionError.message,
      });

      return res.status(500).json({
        error: "Failed to subscribe to flight",
        details: subscriptionError.message,
      });
    }

    // Save subscription details to MongoDB
    console.log("[API] Saving Subscription to Database", {
      walletAddress,
      flightNumber,
    });

    const newSubscription = new FlightSubscription({
      walletAddress,
      flightNumber,
      departureAirport,
      arrivalAirport: flightData.arrivalAirport,
      blockchainTxHash: blockchainSubscription.transactionHash,
      flightSubscriptionStatus: "subscribed", // Use this fixed value for subscriptions
      isSubscriptionActive: true,
    });

    await newSubscription.save();

    console.log("[API] Subscription Saved Successfully", {
      walletAddress,
      flightNumber,
      subscriptionId: newSubscription._id,
    });

    // Return full flight data with subscription status
    return res.status(200).json({
      ...flightData,
      isSubscribed: true,
      message: "Successfully subscribed to flight",
    });
  } catch (error) {
    customLogger.error("[API] Unexpected Error in Flight Subscription", {
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};

export const getSubscribedFlights = async (req, res) => {
  try {
    const { walletAddress } = req.params;

    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet address is required" });
    }

    // Get all subscribed flight numbers and their details
    const subscriptions = await FlightSubscription.find({
      walletAddress,
      isSubscriptionActive: true,
    });

    if (subscriptions.length === 0) {
      return res.status(200).json([]);
    }

    // Extract flight numbers and airports for precise matching
    const flightDetails = subscriptions.map((sub) => ({
      flightNumber: sub.flightNumber,
      departureAirport: sub.departureAirport,
      arrivalAirport: sub.arrivalAirport,
    }));

    // Create an array to hold all matching conditions
    const matchConditions = flightDetails.map((detail) => ({
      flightNumber: detail.flightNumber,
      departureAirport: detail.departureAirport,
      arrivalAirport: detail.arrivalAirport,
    }));

    // Find all flights matching the subscribed flight details using $or operator
    const flights = await FlightData.find({
      $or: matchConditions,
    }).lean();

    // Add subscription information to each flight
    const enhancedFlights = flights.map((flight) => {
      const subscription = subscriptions.find(
        (sub) =>
          sub.flightNumber === flight.flightNumber &&
          sub.departureAirport === flight.departureAirport &&
          sub.arrivalAirport === flight.arrivalAirport
      );

      return {
        ...flight,
        isSubscribed: Boolean(subscription),
        subscriptionId: subscription ? subscription._id : null,
        subscriptionDate: subscription ? subscription.subscriptionDate : null,
      };
    });

    // Log the match count for debugging
    customLogger.info(
      `Found ${enhancedFlights.length} flights for ${subscriptions.length} subscriptions`
    );

    res.status(200).json(enhancedFlights);
  } catch (error) {
    customLogger.error("Error fetching subscribed flights:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getAllSubscriptionOfUser = async (req, res) => {
  try {
    const { walletAddress } = req.params;

    // Validate input
    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet address is required" });
    }

    // Fetch all subscriptions for the user
    const subscriptions = await FlightSubscription.find({
      walletAddress,
      isSubscriptionActive: true,
    });

    // Check if subscriptions exist
    if (!subscriptions.length) {
      return res
        .status(200) // Changed from 404 to 200 for consistent empty responses
        .json({ message: "No subscriptions found for this user", data: [] });
    }

    // Create an array of query objects for each subscription
    const queryConditions = subscriptions.map((subscription) => ({
      flightNumber: subscription.flightNumber,
      departureAirport: subscription.departureAirport,
      arrivalAirport: subscription.arrivalAirport,
    }));

    // Fetch all matching flights in a single query
    const allFlights = await FlightData.find({ $or: queryConditions }).lean();

    // Map each subscription to its corresponding flight data
    const flightDetails = subscriptions.map((subscription) => {
      const matchingFlight = allFlights.find(
        (flight) =>
          flight.flightNumber === subscription.flightNumber &&
          flight.departureAirport === subscription.departureAirport &&
          flight.arrivalAirport === subscription.arrivalAirport
      );

      return {
        subscription: subscription.toObject
          ? subscription.toObject()
          : subscription,
        flight: matchingFlight || null,
      };
    });

    // Log the match count for debugging
    customLogger.info(
      `Found ${allFlights.length} flights for ${subscriptions.length} subscriptions`
    );

    // Return successful response
    res.status(200).json({
      success: true,
      count: flightDetails.length,
      data: flightDetails,
    });
  } catch (error) {
    // Handle errors
    customLogger.error(
      "Error fetching subscription and flight details:",
      error
    );
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getHistoricalData = async (req, res) => {
  try {
    const { flightNumber } = req.params;
    const { fromDate, toDate, carrierCode } = req.query;

    // Validate required parameters
    if (!flightNumber || !fromDate || !toDate || !carrierCode) {
      return res.status(400).json({
        error:
          "Missing required parameters. Need flightNumber, fromDate, toDate, and carrierCode",
      });
    }

    // Call blockchain service
    const flightDetails = await blockchainService.getFlightDetailsByDateRange(
      flightNumber,
      fromDate,
      toDate,
      carrierCode
    );

    // Return data
    res.json({
      flightNumber,
      fromDate,
      toDate,
      carrierCode,
      flightDetails,
    });
  } catch (error) {
    customLogger.error("Error fetching flight details:", error);
    res.status(500).json({
      error: "Failed to fetch flight details",
      message: error.message,
    });
  }
};

export const unsubscribeFlights = async (req, res) => {
  try {
    const { walletAddress, flightNumbers, carrierCodes, departureAirports } =
      req.body;

    // Step 2: Validate input
    if (
      !walletAddress ||
      !flightNumbers ||
      !carrierCodes ||
      !departureAirports ||
      flightNumbers.length !== carrierCodes.length ||
      flightNumbers.length !== departureAirports.length
    ) {
      return res
        .status(400)
        .json({ error: "Invalid or mismatched input arrays" });
    }

    // Step 3: Fetch matching subscriptions associated with the walletAddress
    const subscriptions = await FlightSubscription.find({
      walletAddress,
      $or: flightNumbers.map((flightNumber, index) => ({
        flightNumber,
        departureAirport: departureAirports[index],
      })),
    });

    // Step 4: If no subscriptions exist, return a 404 response
    if (!subscriptions.length) {
      return res.status(404).json({
        message: "No matching subscriptions found for this wallet address",
      });
    }

    // Step 5: Remove subscriptions from MongoDB
    await FlightSubscription.deleteMany({
      walletAddress,
      $or: flightNumbers.map((flightNumber, index) => ({
        flightNumber,
        departureAirport: departureAirports[index],
      })),
    });

    // Step 6: Remove subscriptions from blockchain
    const blockRes = await blockchainService.removeFlightSubscriptions(
      flightNumbers,
      carrierCodes,
      departureAirports
    );

    // Step 7: Return success response
    res.status(200).json({
      success: true,
      message: "Subscriptions removed successfully",
      blockRes,
    });
  } catch (error) {
    // Step 8: Handle errors
    customLogger.error("Error unsubscribing flights:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

startFlightStatusMonitoring();
