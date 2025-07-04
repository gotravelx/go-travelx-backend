import crypto from "crypto";
import dotenv from "dotenv";
import customLogger from "../utils/Logger.js";

// Function to encrypt a string
dotenv.config();
customLogger.info("Dotenv configured successfully");

export const encryptString = (str, encryptionKey) => {
  // customLogger.info("Starting encryptString function");
  const dataStr = String(str || "");
  if (!dataStr) {
    // customLogger.warn("Empty string provided, returning empty string without encryption");
    return "";
  }

  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      "aes-256-cbc",
      Buffer.from(encryptionKey),
      iv
    );
    // customLogger.info("Cipher created successfully");
    let encrypted = cipher.update(dataStr, "utf8", "base64");
    encrypted += cipher.final("base64");
    const result = iv.toString("hex") + ":" + encrypted;
    return result;
  } catch (error) {
    customLogger.error(`Encryption failed: ${error.message}`);
    throw error;
  }
};

export const selectiveEncrypt = (
  dataArray,
  encryptionKey,
  skipIndices = []
) => {
  if (!Array.isArray(dataArray)) {
    customLogger.error("Invalid input: dataArray is not an array");
    throw new Error("dataArray must be an array");
  }

  return dataArray.map((item, index) => {
    if (skipIndices.includes(index)) {
      return item;
    }
    
    const encrypted = encryptString(item, encryptionKey);
    return encrypted;
  });
};

export const prepareFlightDataForBlockchain = (flightData, encryptionKey) => {
  customLogger.info("Starting prepareFlightDataForBlockchain function");

  // Validate required fields
  if (
    !flightData.flightNumber ||
    !flightData.carrierCode ||
    !flightData.scheduledDepartureDate
  ) {
    customLogger.error("Missing required flight data fields");
    customLogger.error(`Flight number: ${flightData.flightNumber}`);
    customLogger.error(`Carrier code: ${flightData.carrierCode}`);
    customLogger.error(`Scheduled departure date: ${flightData.scheduledDepartureDate}`);
    throw new Error("Missing required flight data fields");
  }

  if (encryptionKey && encryptionKey.length !== 32) {
    customLogger.error(`Invalid encryption key length: ${encryptionKey.length}, expected 32`);
    throw new Error("Encryption key must be 32 bytes");
  }

  // Normalize current flight status
  const currentFlightStatus = flightData.currentFlightStatus
    ? flightData.currentFlightStatus.toString().toLowerCase()
    : "";

  // Handle status transition timestamps
  let outTimeUTC = flightData.outTimeUTC || "";
  let offTimeUTC = flightData.offTimeUTC || "";
  let onTimeUTC = flightData.onTimeUTC || "";
  let inTimeUTC = flightData.inTimeUTC || "";


  // Get current UTC time for any missing timestamps
  const currentUTCTime = new Date().toISOString();

  // ndpt -> out
  if (currentFlightStatus === "out") {
    outTimeUTC = flightData.outTimeUTC || currentUTCTime;
    customLogger.info(`Flight ${flightData.flightNumber} OUT time recorded: ${outTimeUTC}`);
  }
  // out -> off
  else if (currentFlightStatus === "off") {
    offTimeUTC = flightData.offTimeUTC || currentUTCTime;
    customLogger.info(`Flight ${flightData.flightNumber} OFF time recorded: ${offTimeUTC}`);
  }
  // off -> on
  else if (currentFlightStatus === "on") {
    onTimeUTC = flightData.onTimeUTC || currentUTCTime;
    customLogger.info(`Flight ${flightData.flightNumber} ON time recorded: ${onTimeUTC}`);
  }
  // on -> in
  else if (currentFlightStatus === "in") {
    inTimeUTC = flightData.inTimeUTC || currentUTCTime;
    customLogger.info(`Flight ${flightData.flightNumber} IN time recorded: ${inTimeUTC}`);
  }

  // Get status code based on current flight status
  let statusCode = flightData.statusCode || "";
  if (!statusCode) {
    if (currentFlightStatus === "out") statusCode = "OUT";
    else if (currentFlightStatus === "off") statusCode = "OFF";
    else if (currentFlightStatus === "on") statusCode = "ON";
    else if (currentFlightStatus === "in") statusCode = "IN";
    else statusCode = "NDPT"; // Default to Not Departed
  }
  customLogger.info(`Status code determined: ${statusCode}`);

  // Ensure flightStatus has a value
  const flightStatus =
    flightData.flightStatusDescription ||
    (currentFlightStatus.toUpperCase() === "NDPT"
      ? "Not Departed"
      : currentFlightStatus.toUpperCase() === "OUT"
      ? "Departed"
      : currentFlightStatus.toUpperCase() === "OFF"
      ? "In Air"
      : currentFlightStatus.toUpperCase() === "ON"
      ? "Landed"
      : currentFlightStatus.toUpperCase() === "IN"
      ? "Arrived"
      : "Scheduled");
  customLogger.info(`Flight status description: ${flightStatus}`);

  // Determine currentFlightTime based on status
  let currentFlightTime =
    inTimeUTC || onTimeUTC || offTimeUTC || outTimeUTC || currentUTCTime;
  customLogger.info(`Current flight time determined: ${currentFlightTime}`);

  const blockchainFlightData = [
    flightData.flightNumber, // index 0 - flight number (keep unencrypted)
    flightData.scheduledDepartureDate, // index 1 - departure date (keep unencrypted)
    flightData.carrierCode, // index 2 - carrier code (keep unencrypted)
    flightData.arrivalCity || "",
    flightData.departureCity || "",
    flightData.arrivalAirport || "",
    flightData.departureAirport || "", // index 6 - departure airport (keep unencrypted)
    flightData.operatingAirline || flightData.carrierCode || "",
    flightData.arrivalGate || "",
    flightData.departureGate || "",
    currentFlightStatus.toUpperCase() || "",
    flightData.equipmentModel || "",
  ];

  // Ensure bagClaim is defined by using null coalescing operator
  const blockchainUtcTimes = [
    flightData.actualArrivalUTC || "",
    flightData.actualDepartureUTC || "",
    flightData.estimatedArrivalUTC || "",
    flightData.estimatedDepartureUTC || "",
    flightData.scheduledArrivalUTCDateTime || "",
    flightData.scheduledDepartureUTCDateTime || "",
    String(flightData.arrivalDelayMinutes || "0"),
    String(flightData.departureDelayMinutes || "0"),
    flightData.bagClaim || "", // Ensure bagClaim is properly defined with a default value
  ];

  const blockchainStatusData = [
    statusCode, // index 0 - status code
    flightStatus, // index 1 - flight status description
    flightData.arrivalState || "",
    flightData.departureState || "",
    outTimeUTC, // index 4 - outTimeUTC
    offTimeUTC, // index 5 - offTimeUTC
    onTimeUTC, // index 6 - onTimeUTC
    inTimeUTC || currentFlightTime, // index 7 - inTimeUTC (used for event) - also ensure this has a value
  ];

  // Handle marketing segments - ensure at least one empty entry if empty
  const marketingSegments = flightData.marketedFlightSegment || [];
  
  const marketingAirlineCodes = marketingSegments.map(
    (segment) => segment.MarketingAirlineCode || ""
  );
  const marketingFlightNumbers = marketingSegments.map(
    (segment) => segment.FlightNumber || ""
  );

  // If encryption key is provided, encrypt selectively
  if (encryptionKey) {
    customLogger.info("Starting selective encryption process");
    // Indices to keep unencrypted: flight number (0), departure date (1), carrier code (2), departure airport (6)
    const unencryptedFlightDataIndices = [0, 1, 2, 5, 6];

    try {
      const encryptedFlightData = selectiveEncrypt(
        blockchainFlightData,
        encryptionKey,
        unencryptedFlightDataIndices
      );

      const encryptedUtcTimes = selectiveEncrypt(blockchainUtcTimes, encryptionKey);

      const encryptedStatusData = selectiveEncrypt(
        blockchainStatusData,
        encryptionKey
      );

      const encryptedMarketingAirlineCodes = selectiveEncrypt(
        marketingAirlineCodes,
        encryptionKey,
        []
      );

      const encryptedMarketingFlightNumbers = selectiveEncrypt(
        marketingFlightNumbers,
        encryptionKey,
        []
      );

      const result = {
        blockchainFlightData: encryptedFlightData,
        blockchainUtcTimes: encryptedUtcTimes,
        blockchainStatusData: encryptedStatusData,
        marketingAirlineCodes: encryptedMarketingAirlineCodes,
        marketingFlightNumbers: encryptedMarketingFlightNumbers,
      };
      customLogger.info("Encrypted result object created successfully");
      return result;
    } catch (error) {
      customLogger.error(`Encryption process failed: ${error.message}`);
      throw error;
    }
  }

  // If no encryption key, return arrays as-is
  customLogger.info("No encryption key provided, returning unencrypted data");
  const result = {
    blockchainFlightData,
    blockchainUtcTimes,
    blockchainStatusData,
    marketingAirlineCodes,
    marketingFlightNumbers,
  };
  customLogger.info("Unencrypted result object created successfully");
  return result;
};

export const decryptData = (encryptedData, encryptionKey) => {
  customLogger.info("Starting decryptData function");
  customLogger.info(`Input is array: ${Array.isArray(encryptedData)}`);
  
  if (!encryptionKey) {
    customLogger.error("No encryption key provided for decryption");
    throw new Error("Encryption key is required for decryption");
  }

  try {
    if (Array.isArray(encryptedData)) {
      const result = encryptedData.map((item, index) => {
        customLogger.info(`Decrypting item at index ${index}`);
        return decryptString(item, encryptionKey);
      });
      customLogger.info("Array decryption completed successfully");
      return result;
    }
    
    customLogger.info("Decrypting single string");
    const result = decryptString(encryptedData, encryptionKey);
    customLogger.info("Single string decryption completed successfully");
    return result;
  } catch (error) {
    customLogger.error(`Decryption process failed: ${error.message}`);
    throw error;
  }
};

export const decryptString = (encryptedStr, encryptionKey) => {
  customLogger.info("Starting decryptString function",JSON.stringify({ encryptedStr }));
  
  try {
    if (!encryptedStr || !encryptedStr.includes(":")) {
      customLogger.warn("String doesn't appear to be encrypted, returning as-is");
      return encryptedStr;
    }

    const [ivHex, encryptedText] = encryptedStr.split(":");
    
    const iv = Buffer.from(ivHex, "hex");
    customLogger.info("IV buffer created successfully");

    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(encryptionKey),
      iv
    );
    customLogger.info("Decipher created successfully");

    let decrypted = decipher.update(encryptedText, "base64", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    customLogger.error(`Decryption failed: ${error.message}`);
    customLogger.error(`Stack trace: ${error.stack}`);

    return encryptedStr;
  }
};

export const decryptFlightData = (req, res) => {
  customLogger.info("Starting decryptFlightData endpoint");
  customLogger.info(`Request method: ${req.method}`);
  customLogger.info(`Request headers: ${JSON.stringify(req.headers)}`);
  
  const { encryptedData } = req.body;
  customLogger.info(`Encrypted data provided: ${!!encryptedData}`);

  if (!encryptedData) {
    customLogger.error("Missing encryptedData in request body");
    return res.status(400).json({ error: "Missing encryptedData" });
  }

  if (!process.env.ENCRYPTION_KEY) {
    customLogger.error("ENCRYPTION_KEY environment variable not set");
    return res.status(500).json({ error: "Server configuration error" });
  }
  customLogger.info("Encryption key found in environment variables");

  try {
    const result = decryptData(encryptedData, process.env.ENCRYPTION_KEY);
    if (!result) {
      customLogger.error("Decryption returned null or undefined result");
      return res.status(500).json({ error: "Decryption failed" });
    }
    
    customLogger.info("Decryption successful, sending response");
    res.json({ decryptedData: result });
  } catch (error) {
    customLogger.error(`Decryption endpoint failed: ${error.message}`);
    customLogger.error(`Stack trace: ${error.stack}`);
    return res.status(500).json({ error: "Decryption failed" });
  }
};