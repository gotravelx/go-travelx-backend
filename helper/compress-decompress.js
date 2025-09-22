import zlib from "zlib";

export const getCompressedFlightData = async (flightData) => {
  try {
    if (!flightData) {
      throw new Error("No flight data provided for compression");
    }

    const flightDataJsonString = JSON.stringify(flightData);
    const compressed = zlib.gzipSync(flightDataJsonString);
    return compressed.toString("base64"); // <-- encode as base64
  } catch (error) {
    console.error("Error compressing flight data:", error);
  }
};

export const getDecompressedFlightData = async (compressedData) => {
  try {
    if (!compressedData) {
      throw new Error("No compressed data provided for decompression");
    }

    const buffer = Buffer.from(compressedData, "base64");
    const decompressed = zlib.gunzipSync(buffer).toString("utf-8");
    return JSON.parse(decompressed);
  } catch (error) {
    console.error("Error decompressing flight data:", error);
  }
};