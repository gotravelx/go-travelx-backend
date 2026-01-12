import zlib from "zlib";
import logger from "../utils/Logger.js";

export const getCompressedFlightData = async (flightData) => {
  try {
    if (!flightData) {
      throw new Error("No flight data provided for compression");
    }

    const flightDataJsonString = JSON.stringify(flightData);
    const compressed = zlib.gzipSync(flightDataJsonString);
    return compressed.toString("base64");
  } catch (error) {
    logger.error(`Error compressing flight data: ${error.message}`,);
  }
};


export const getDecompressedFlightData = async (compressedData) => {
  try {
    if (!compressedData) {
      throw new Error("No compressed data provided for decompression");
    }

    let hexData = compressedData.startsWith("0x") ? compressedData.slice(2) : compressedData;
    const base64String = Buffer.from(hexData, "hex").toString("utf-8");
    const compressedBuffer = Buffer.from(base64String, "base64");

    return new Promise((resolve, reject) => {
      zlib.gunzip(compressedBuffer, (err, decompressed) => {
        if (err) {
          logger.error(`Error decompressing flight data: ${err.message}`);
          return resolve(null);
        }
        try {
          const jsonString = decompressed.toString("utf-8");
          resolve(JSON.parse(jsonString));
        } catch (parseError) {
          logger.error(`Error parsing decompressed JSON: ${parseError.message}`);
          resolve(null);
        }
      });
    });
  } catch (error) {
    logger.error(`Error in getDecompressedFlightData: ${error.message}`);
    return null;
  }
};