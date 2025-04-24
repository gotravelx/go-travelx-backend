import ethers from "ethers";
import dotenv from "dotenv";

dotenv.config();

export class FlightBlockchainService {
  constructor(
    providerUrl,
    contractAddress,
    contractABI,
    privateKey,
    walletAddress
  ) {
    // Initialize ethers provider
    this.provider = new ethers.providers.JsonRpcProvider(providerUrl);

    // Create contract instance
    this.contract = new ethers.Contract(
      contractAddress,
      contractABI,
      this.provider
    );

    // Set up wallet for transactions
    this.privateKey = privateKey;
    this.walletAddress = walletAddress;
    this.contractAddress = contractAddress;

    // Create wallet if private key is provided
    if (privateKey) {
      this.wallet = new ethers.Wallet(privateKey, this.provider);
      this.contractWithSigner = this.contract.connect(this.wallet);
    }
  }

  async diagnosticContractCheck() {
    try {
      // Perform a simple read-only contract interaction to check connectivity
      const checkMethod = async () => {
        try {
          // Use isFlightExist with an empty string as a safe test
          await this.contract.isFlightExist("");
          return true;
        } catch (error) {
          console.error("Contract connectivity check failed:", error);
          return false;
        }
      };

      // Add a timeout to prevent hanging
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
      console.error("Diagnostic check error:", error);
      return false;
    }
  }

  // Insert flight details into the blockchain
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
      // Validate and sanitize input
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

      // First try to estimate gas
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
        console.error("Gas estimation failed:", estimateError);
        throw new Error(
          "Transaction would fail. Check contract requirements and input data."
        );
      }

      // Add a buffer to the estimated gas (e.g., 20% more)
      const gasLimit = estimatedGas.mul(120).div(100);

      // Perform the transaction with manual gas limit
      const tx = await this.contractWithSigner.insertFlightDetails(
        sanitizedFlightData,
        sanitizedUtcTimes,
        sanitizedStatusData,
        sanitizedMarketingAirlineCodes,
        sanitizedMarketingFlightNumbers,
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
      console.error("Error inserting flight details:", error);
      throw error;
    }
  }

  // New function to update flight status
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
        console.error("Gas estimation failed:", estimateError);
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
      console.error("Error updating flight status:", error);
      throw error;
    }
  }

  // Retrieve flight details
  async getFlightDetails(flightNumber, scheduledDepartureDate, carrierCode) {
    try {
      // Validate input parameters
      if (!flightNumber || !scheduledDepartureDate || !carrierCode) {
        throw new Error("Invalid input parameters");
      }

      // Fetch flight details
      const details = await this.contract.getFlightDetails(
        flightNumber,
        scheduledDepartureDate,
        carrierCode
      );

      return {
        flightData: details[0],
        utcTime: details[1],
        status: details[2],
        marketedFlightSegments: details[3],
        currentStatus: details[4],
      };
    } catch (error) {
      console.error("Error fetching flight details:", error);
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
      console.error("Error adding flight subscription:", error);
      throw error;
    }
  }

  // Remove flight subscriptions
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
      console.error("Error removing flight subscriptions:", error);
      throw error;
    }
  }

  // Check if a flight exists
  async checkFlightExistence(flightNumber) {
    try {
      // Validate input parameter
      if (!flightNumber || typeof flightNumber !== "string") {
        throw new Error("Invalid flight number");
      }

      // Check flight existence
      return await this.contract.isFlightExist(flightNumber);
    } catch (error) {
      console.error("Error checking flight existence:", error);
      throw error;
    }
  }

  // Check flight subscription status
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
      console.error("Error checking flight subscription:", error);
      throw error;
    }
  }
}

// Export a function to create the service with configuration
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
