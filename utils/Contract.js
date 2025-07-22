import ethers from "ethers";
import dotenv from "dotenv";
import customLogger from "./Logger.js";

dotenv.config();

export class FlightBlockchainService {
  constructor(
    providerUrl,
    contractAddress,
    contractABI,
    privateKey,
    walletAddress
  ) {
    this.provider = new ethers.providers.JsonRpcProvider(providerUrl);

    this.contract = new ethers.Contract(
      contractAddress,
      contractABI,
      this.provider
    );

    this.privateKey = privateKey;
    this.walletAddress = walletAddress;
    this.contractAddress = contractAddress;

    if (privateKey) {
      this.wallet = new ethers.Wallet(privateKey, this.provider);
      this.contractWithSigner = this.contract.connect(this.wallet);
    }
  }

  async diagnosticContractCheck() {
    try {
      const checkMethod = async () => {
        try {
          await this.contract.isFlightExist("");
          return true;
        } catch (error) {
          customLogger.error("Contract connectivity check failed:", error);
          return false;
        }
      };

      return await Promise.race([
        checkMethod(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Connectivity check timed out")),
            5000
          )
        ),
      ]);
    } catch (error) {
      customLogger.error("Diagnostic check error:", error);
      return false;
    }
  }

  async insertFlightDetails(
    flightData,
    utcTimes,
    statusData,
    marketingAirlineCodes = [],
    marketingFlightNumbers = []
  ) {
    if (!this.contractWithSigner) {
      throw new Error("Wallet not configured for transactions");
    }

    try {
      console.log("flightData:", flightData);

      const sanitizedFlightData = flightData.map((item) =>
        item !== null && item !== undefined ? String(item) : ""
      );
      const sanitizedUtcTimes = utcTimes.map((item) =>
        item !== null && item !== undefined ? String(item) : ""
      );
      const sanitizedStatusData = statusData.map((item) =>
        item !== null && item !== undefined ? String(item) : ""
      );
      const sanitizedMarketingAirlineCodes = marketingAirlineCodes.map((item) =>
        item !== null && item !== undefined ? String(item) : ""
      );
      const sanitizedMarketingFlightNumbers = marketingFlightNumbers.map(
        (item) => (item !== null && item !== undefined ? String(item) : "")
      );

      let estimatedGas;
      try {
        estimatedGas =
          await this.contractWithSigner.estimateGas.insertFlightDetails(
            sanitizedFlightData,
            sanitizedUtcTimes,
            sanitizedStatusData,
            sanitizedMarketingAirlineCodes,
            sanitizedMarketingFlightNumbers
          );
      } catch (estimateError) {
        customLogger.error("Gas estimation failed:", estimateError);
        throw new Error(
          "Transaction would fail. Check contract requirements and input data."
        );
      }

      const gasLimit = estimatedGas.mul(120).div(100);

      const tx = await this.contractWithSigner.insertFlightDetails(
        sanitizedFlightData,
        sanitizedUtcTimes,
        sanitizedStatusData,
        sanitizedMarketingAirlineCodes,
        sanitizedMarketingFlightNumbers,
        { gasLimit }
      );

      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error) {
      customLogger.error("Error inserting flight details:", error.message);
      console.log(error);

      throw error;
    }
  }

  async updateFlightStatus(
    flightNumber,
    scheduledDepartureDate,
    carrierCode,
    currentTime,
    flightStatus,
    flightStatusCode
  ) {
    if (!this.contractWithSigner) {
      throw new Error("Wallet not configured for transactions");
    }

    try {
      // Validate input parameters
      if (
        !flightNumber ||
        !scheduledDepartureDate ||
        !carrierCode ||
        !currentTime ||
        !flightStatus ||
        !flightStatusCode
      ) {
        throw new Error("Invalid input parameters");
      }

      // Sanitize inputs
      const sanitizedFlightNumber = String(flightNumber);
      const sanitizedScheduledDepartureDate = String(scheduledDepartureDate);
      const sanitizedCarrierCode = String(carrierCode);
      const sanitizedCurrentTime = String(currentTime);
      const sanitizedFlightStatus = String(flightStatus);
      const sanitizedFlightStatusCode = String(flightStatusCode);

      // First try to estimate gas
      let estimatedGas;
      try {
        estimatedGas =
          await this.contractWithSigner.estimateGas.updateFlightStatus(
            sanitizedFlightNumber,
            sanitizedScheduledDepartureDate,
            sanitizedCarrierCode,
            sanitizedCurrentTime,
            sanitizedFlightStatus,
            sanitizedFlightStatusCode
          );
      } catch (estimateError) {
        customLogger.error("Gas estimation failed:", estimateError);
        throw new Error(
          "Transaction would fail. Check contract requirements and input data."
        );
      }

      // Add a buffer to the estimated gas (e.g., 20% more)
      const gasLimit = estimatedGas.mul(120).div(100);

      // Perform the transaction with manual gas limit
      const tx = await this.contractWithSigner.updateFlightStatus(
        sanitizedFlightNumber,
        sanitizedScheduledDepartureDate,
        sanitizedCarrierCode,
        sanitizedCurrentTime,
        sanitizedFlightStatus,
        sanitizedFlightStatusCode,
        { gasLimit }
      );

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error) {
      customLogger.error("Error updating flight status:", error);
      throw error;
    }
  }

  async getFlightDetailsByDateRange(
    flightNumber,
    fromDate,
    toDate,
    carrierCode
  ) {
    try {
      if (!flightNumber || !fromDate || !toDate || !carrierCode) {
        throw new Error("Invalid input parameters");
      }

      const fromTimestamp = new Date(fromDate).getTime();
      console.log(fromTimestamp);

      const detailsArray = await this.contract.getFlightDetails(
        flightNumber,
        fromDate,
        fromTimestamp,
        toDate,
        carrierCode
      );

      // console.log(detailsArray.flightData);
      // console.log(detailsArray.utcTime);
      // console.log(detailsArray.status);

      return detailsArray.map((detail) => {
        const marketedSegments = detail.marketedSegments.map((segment) => ({
          marketingAirlineCode: segment.MarketingAirlineCode,
          flightNumber: segment.FlightNumber,
        }));

        return {
          flightNumber: detail.flightData.flightNumber,
          scheduledDepartureDate: detail.scheduledDepartureDate,
          carrierCode: detail.flightData.carrierCode,
          arrivalCity: detail.flightData.arrivalCity,
          departureCity: detail.flightData.departureCity,
          arrivalAirport: detail.flightData.arrivalAirport,
          departureAirport: detail.flightData.departureAirport,
          operatingAirlineCode: detail.flightData.operatingAirlineCode,
          arrivalGate: detail.flightData.arrivalGate,
          departureGate: detail.flightData.departureGate,
          flightStatus: detail.flightData.flightStatus,
          equipmentModel: detail.flightData.equipmentModel,
          utcTimes: {
            actualArrival: detail.utcTime.actualArrivalUTC,
            actualDeparture: detail.utcTime.actualDepartureUTC,
            estimatedArrival: detail.utcTime.estimatedArrivalUTC,
            estimatedDeparture: detail.utcTime.estimatedDepartureUTC,
            scheduledArrival: detail.utcTime.scheduledArrivalUTC,
            scheduledDeparture: detail.utcTime.scheduledDepartureUTC,
            arrivalDelayMinutes: detail.utcTime.arrivalDelayMinutes,
            departureDelayMinutes: detail.utcTime.departureDelayMinutes,
            bagClaim: detail.utcTime.bagClaim,
          },
          status: {
            statusCode: detail.status.flightStatusCode,
            statusDescription: detail.status.flightStatusDescription,
            arrivalState: detail.status.ArrivalState,
            departureState: detail.status.DepartureState,
            outUtc: detail.status.outUtc,
            offUtc: detail.status.offUtc,
            onUtc: detail.status.onUtc,
            inUtc: detail.status.inUtc,
          },
          marketedFlightSegments: marketedSegments,
          currentStatus: detail.currentStatus,
        };
      });
    } catch (error) {
      customLogger.error("Error fetching flight details by date range:", error);

      if (error.message && error.message.includes("Flight does not exist")) {
        return "Flight does not exist";
      }
      throw error;
    }
  }

  async addFlightSubscription(flightNumber, carrierCode, departureAirport) {
    if (!this.contractWithSigner) {
      throw new Error("Wallet not configured for transactions");
    }

    try {
      // Validate input parameters
      if (!flightNumber || !carrierCode || !departureAirport) {
        throw new Error("Invalid input parameters");
      }

      // Perform the transaction
      const tx = await this.contractWithSigner.addFlightSubscription(
        flightNumber,
        carrierCode,
        departureAirport
      );

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error) {
      customLogger.error("Error adding flight subscription:", error);
      throw error;
    }
  }

  async removeFlightSubscriptions(
    flightNumbers,
    carrierCodes,
    departureAirports
  ) {
    if (!this.contractWithSigner) {
      throw new Error("Wallet not configured for transactions");
    }

    try {
      // Validate input arrays
      if (
        !flightNumbers.length ||
        !carrierCodes.length ||
        !departureAirports.length ||
        flightNumbers.length !== carrierCodes.length ||
        flightNumbers.length !== departureAirports.length
      ) {
        throw new Error("Invalid or mismatched input arrays");
      }

      // Sanitize inputs
      const sanitizedFlightNumbers = flightNumbers.map((fn) =>
        fn && typeof fn === "string" ? fn : ""
      );
      const sanitizedCarrierCodes = carrierCodes.map((cc) =>
        cc && typeof cc === "string" ? cc : ""
      );
      const sanitizedDepartureAirports = departureAirports.map((da) =>
        da && typeof da === "string" ? da : ""
      );

      // Perform the transaction
      const tx = await this.contractWithSigner.removeFlightSubscription(
        sanitizedFlightNumbers,
        sanitizedCarrierCodes,
        sanitizedDepartureAirports
      );

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        unsubscribedCount: sanitizedFlightNumbers.length,
      };
    } catch (error) {
      customLogger.error("Error removing flight subscriptions:", error);
      throw error;
    }
  }

  async checkFlightExistence(flightNumber) {
    try {
      // Validate input parameter
      if (!flightNumber || typeof flightNumber !== "string") {
        throw new Error("Invalid flight number");
      }

      // Check flight existence
      return await this.contract.isFlightExist(flightNumber);
    } catch (error) {
      customLogger.error("Error checking flight existence:", error);
      throw error;
    }
  }

  async checkFlightSubscription(
    userAddress,
    flightNumber,
    carrierCode,
    departureAirport
  ) {
    try {
      // Validate input parameters
      if (!userAddress || !flightNumber || !carrierCode || !departureAirport) {
        throw new Error("Invalid input parameters");
      }

      // Check subscription status
      return await this.contract.isFlightSubscribed(
        userAddress,
        flightNumber,
        carrierCode,
        departureAirport
      );
    } catch (error) {
      customLogger.error("Error checking flight subscription:", error);
      throw error;
    }
  }
}

export const createFlightBlockchainService = (
  providerUrl,
  contractAddress,
  contractABI,
  privateKey,
  walletAddress
) => {
  return new FlightBlockchainService(
    providerUrl,
    contractAddress,
    contractABI,
    privateKey,
    walletAddress
  );
};
