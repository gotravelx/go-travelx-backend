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

  const currentFlightStatus = flightData.currentFlightStatus
    .toString()
    .toUpperCase();

  const blockchainFlightData = [
    flightData.flightNumber, // index 0 - flight number (keep unencrypted)
    flightData.scheduledDepartureDate, // index 1 - departure date (keep unencrypted)
    flightData.carrierCode,
    flightData.arrivalCity || "",
    flightData.departureCity || "",
    flightData.arrivalAirport || "",
    flightData.departureAirport || "", // index 6 - departure airport (keep unencrypted)
    flightData.operatingAirline || flightData.carrierCode || "",
    flightData.arrivalGate || "",
    flightData.departureGate || "",
    currentFlightStatus || "",
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
    flightData.statusCode || "",
    flightData.flightStatus || "",
    flightData.arrivalStatus || "",
    flightData.departureStatus || "",
    flightData.outTimeUTC || "",
    flightData.offTimeUTC || "",
    flightData.onTimeUTC || "",
    flightData.inTimeUTC || "",
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
    // Indices to keep unencrypted: flight number (0), departure date (1), departure airport (6)
    const unencryptedFlightDataIndices = [0, 1, 6];

    return {
      blockchainFlightData: selectiveEncrypt(
        blockchainFlightData,
        encryptionKey,
        unencryptedFlightDataIndices
      ),
      blockchainUtcTimes: selectiveEncrypt(
        blockchainUtcTimes,
        encryptionKey,
        []
      ),
      blockchainStatusData: selectiveEncrypt(
        blockchainStatusData,
        encryptionKey,
        []
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
    // If empty or not encrypted, return as is
    if (!encryptedStr || !encryptedStr.includes(":")) return encryptedStr;

    const parts = encryptedStr.split(":");
    const iv = Buffer.from(parts[0], "hex");
    const encryptedText = parts[1];

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
    return encryptedStr; // Return original string if decryption fails
  }
};
