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
     logger.error(`Error compressing flight data: ${error.message}`, );
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
    const decompressed = zlib.gunzipSync(compressedBuffer);
    const jsonString = decompressed.toString("utf-8");
    return JSON.parse(jsonString);
    
  } catch (error) {
    logger.error(`Error decompressing flight data: ${error.message}`, );
    return null;
  }
};