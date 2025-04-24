import crypto from "crypto";
import dotenv from "dotenv";
// Function to encrypt a string
dotenv.config();

export const encryptString = (str, encryptionKey) => {
  // Ensure we have a string
  const dataStr = String(str || "");

  // If empty string, don't encrypt
  if (!dataStr) return "";

  // Generate a random initialization vector
  const iv = crypto.randomBytes(16);

  // Create cipher using AES-256-CBC with the key and iv
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(encryptionKey),
    iv
  );

  // Encrypt the data
  let encrypted = cipher.update(dataStr, "utf8", "base64");
  encrypted += cipher.final("base64");

  // Return the IV and encrypted data as a combined string
  return iv.toString("hex") + ":" + encrypted;
};

// Function to selectively encrypt array data - some fields remain unencrypted
export const selectiveEncrypt = (
  dataArray,
  encryptionKey,
  skipIndices = []
) => {
  return dataArray.map((item, index) => {
    // Don't encrypt if the index is in the skipIndices array
    if (skipIndices.includes(index)) {
      return item;
    }
    return encryptString(item, encryptionKey);
  });
};

export const prepareFlightDataForBlockchain = (flightData, encryptionKey) => {
  // Validate required fields
  if (
    !flightData.flightNumber ||
    !flightData.carrierCode ||
    !flightData.scheduledDepartureDate
  ) {
    throw new Error("Missing required flight data fields");
  }

  // Validate encryption key if provided
  if (encryptionKey && encryptionKey.length !== 32) {
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

  // If we have previous status, check for transitions and update timestamps
  // ndpt -> out
  if (currentFlightStatus === "out") {
    outTimeUTC = flightData.outTimeUTC || currentUTCTime;
    console.log(
      `Flight ${flightData.flightNumber} OUT time recorded: ${outTimeUTC}`
    );
  }
  // out -> off
  else if (currentFlightStatus === "off") {
    offTimeUTC = flightData.offTimeUTC || currentUTCTime;
    console.log(
      `Flight ${flightData.flightNumber} OFF time recorded: ${offTimeUTC}`
    );
  }
  // off -> on
  else if (currentFlightStatus === "on") {
    onTimeUTC = flightData.onTimeUTC || currentUTCTime;
    console.log(
      `Flight ${flightData.flightNumber} ON time recorded: ${onTimeUTC}`
    );
  }
  // on -> in
  else if (currentFlightStatus === "in") {
    inTimeUTC = flightData.inTimeUTC || currentUTCTime;
    console.log(
      `Flight ${flightData.flightNumber} IN time recorded: ${inTimeUTC}`
    );
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

  // Determine currentFlightTime based on status
  let currentFlightTime =
    inTimeUTC || onTimeUTC || offTimeUTC || outTimeUTC || currentUTCTime;

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

  const blockchainUtcTimes = [
    flightData.actualArrivalUTC || "",
    flightData.actualDepartureUTC || "",
    flightData.estimatedArrivalUTC || "",
    flightData.estimatedDepartureUTC || "",
    flightData.scheduledArrivalUTCDateTime || "",
    flightData.scheduledDepartureUTCDateTime || "",
    String(flightData.arrivalDelayMinutes || "0"),
    String(flightData.departureDelayMinutes || "0"),
    flightData.baggageClaim || "",
  ];

  const blockchainStatusData = [
    statusCode, // index 0 - status code
    flightStatus, // index 1 - flight status description
    flightData.arrivalStatus || "",
    flightData.departureStatus || "",
    outTimeUTC, // index 4 - outTimeUTC
    offTimeUTC, // index 5 - offTimeUTC
    onTimeUTC, // index 6 - onTimeUTC
    currentFlightTime, // index 7 - currentFlightTime (used for event)
  ];

  // Handle marketing segments - ensure at least one empty entry if empty
  const marketingSegments = flightData.marketedFlightSegment || [{}];
  const marketingAirlineCodes = marketingSegments.map(
    (segment) => segment.MarketingAirlineCode || ""
  );
  const marketingFlightNumbers = marketingSegments.map(
    (segment) => segment.FlightNumber || ""
  );

  // If encryption key is provided, encrypt selectively
  if (encryptionKey) {
    // Indices to keep unencrypted: flight number (0), departure date (1), carrier code (2), departure airport (6)
    const unencryptedFlightDataIndices = [0, 1, 2, 6];

    return {
      blockchainFlightData: selectiveEncrypt(
        blockchainFlightData,
        encryptionKey,
        unencryptedFlightDataIndices
      ),
      blockchainUtcTimes: selectiveEncrypt(blockchainUtcTimes, encryptionKey),
      blockchainStatusData: selectiveEncrypt(
        blockchainStatusData,
        encryptionKey
      ),
      marketingAirlineCodes: selectiveEncrypt(
        marketingAirlineCodes,
        encryptionKey,
        []
      ),
      marketingFlightNumbers: selectiveEncrypt(
        marketingFlightNumbers,
        encryptionKey,
        []
      ),
    };
  }

  // If no encryption key, return arrays as-is
  return {
    blockchainFlightData,
    blockchainUtcTimes,
    blockchainStatusData,
    marketingAirlineCodes,
    marketingFlightNumbers,
  };
};
// Function for decryption when retrieving data
export const decryptData = (encryptedData, encryptionKey) => {
  if (Array.isArray(encryptedData)) {
    return encryptedData.map((item) => decryptString(item, encryptionKey));
  }
  return decryptString(encryptedData, encryptionKey);
};

// Helper function to decrypt a single string
const decryptString = (encryptedStr, encryptionKey) => {
  try {
    if (!encryptedStr || !encryptedStr.includes(":")) return encryptedStr;

    const [ivHex, encryptedText] = encryptedStr.split(":");
    const iv = Buffer.from(ivHex, "hex");

    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(encryptionKey),
      iv
    );
    let decrypted = decipher.update(encryptedText, "base64", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error(`Decryption failed: ${error.message}`);
    return encryptedStr;
  }
};

export const decryptFlightData = (req, res) => {
  const { encryptedData } = req.body;

  if (!encryptedData) {
    return res.status(400).json({ error: "Missing encryptedData" });
  }

  const result = decryptData(encryptedData, process.env.ENCRYPTION_KEY);
  if (!result) {
    return res.status(500).json({ error: "Decryption failed" });
  }
  res.json({ decryptedData: result });
};
