import ethers, { logger } from "ethers";
import dotenv from "dotenv";
import customLogger from "./Logger.js";
import { extractKeyFlightInfo, getBlockchainData } from "../helper/helper.js";
import { getDecompressedFlightData } from "../helper/compress-decompress.js";

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
          const contractCode = await this.provider.getCode(
            this.contractAddress
          );

          if (contractCode === "0x") {
            throw new Error("No contract found at the specified address");
          }

          return true;
        } catch (error) {
          customLogger.error("Contract connectivity check failed:", error);
          console.log("Contract", error);
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
      customLogger.error(`Diagnostic check error:, ${error}`);
      return false;
    }
  }

  // Update flight status - matches ABI
  async updateFlightStatus(
    flightNumber,
    flightOriginateDate,
    carrierCode,
    arrivalStatus,
    departureStatus,
    legStatus
  ) {
    if (!this.contractWithSigner) {
      throw new Error("Wallet not configured for transactions");
    }

    try {
      // Validate input parameters
      if (
        !flightNumber ||
        !flightOriginateDate ||
        !carrierCode ||
        !arrivalStatus ||
        !departureStatus ||
        !legStatus
      ) {
        throw new Error("Invalid input parameters");
      }

      // Sanitize inputs
      const sanitizedFlightNumber = String(flightNumber);
      const sanitizedFlightOriginateDate = String(flightOriginateDate);
      const sanitizedCarrierCode = String(carrierCode);
      const sanitizedArrivalStatus = String(arrivalStatus);
      const sanitizedDepartureStatus = String(departureStatus);
      const sanitizedLegStatus = String(legStatus);

      let estimatedGas;
      try {
        estimatedGas =
          await this.contractWithSigner.estimateGas.updateFlightStatus(
            sanitizedFlightNumber,
            sanitizedFlightOriginateDate,
            sanitizedCarrierCode,
            sanitizedArrivalStatus,
            sanitizedDepartureStatus,
            sanitizedLegStatus
          );
      } catch (estimateError) {
        customLogger.error("Gas estimation failed:", estimateError);
        throw new Error(
          "Transaction would fail. Check contract requirements and input data."
        );
      }

      const gasLimit = estimatedGas.mul(120).div(100);

      const tx = await this.contractWithSigner.updateFlightStatus(
        sanitizedFlightNumber,
        sanitizedFlightOriginateDate,
        sanitizedCarrierCode,
        sanitizedArrivalStatus,
        sanitizedDepartureStatus,
        sanitizedLegStatus,
        { gasLimit }
      );

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

  // Get flight history - matches ABI
  async getFlightHistory(
    flightNumber,
    fromDate,
    toDate,
    carrierCode,
    arrivalAirport,
    departureAirport
  ) {
    try {
      // Validate input
      if (
        !flightNumber ||
        !fromDate ||
        !toDate ||
        !carrierCode ||
        !arrivalAirport ||
        !departureAirport
      ) {
        throw new Error("Invalid input parameters");
      }

      console.log(
        "Contract file function parameters",
        "FlightNumber:",
        flightNumber,
        "FromDate:",
        fromDate,
        "ToDate:",
        toDate,
        "CarrierCode:",
        carrierCode,
        "DepartureAirport:",
        departureAirport,
        "ArrivalAirport:",
        arrivalAirport
      );

      let isAlreadySubscribedBlockchain = await this.isUserSubscribed(
        this.walletAddress,
        String(flightNumber),
        String(carrierCode),
        String(arrivalAirport),
        String(departureAirport)
      );

      // If subscription check says true but contract call fails, there's a mismatch
      if (!isAlreadySubscribedBlockchain) {
        throw new Error(
          `Wallet ${this.walletAddress} is not subscribed to flight ${flightNumber} (${carrierCode}) from ${departureAirport} to ${arrivalAirport}`
        );
      }

      // Convert dates to seconds timestamps for the contract
      const sanitizedFromDateInTimeStamp = Math.floor(
        new Date(fromDate).getTime() / 1000
      );

      const flightHistory = await this.contractWithSigner.getFlightHistory(
        String(flightNumber),
        String(fromDate),
        sanitizedFromDateInTimeStamp,
        String(toDate),
        String(carrierCode),
        String(arrivalAirport),
        String(departureAirport)
      );

      const decompressedFlightDataArray = await Promise.all(
        flightHistory.map(async (flight) => {
          return await getDecompressedFlightData(
            flight.compressedFlightInformation
          );
        })
      );

      const flightDataArray = decompressedFlightDataArray.map((flightInfo) => {
        return extractKeyFlightInfo({ flightData: flightInfo });
      });

      return flightDataArray;
    } catch (error) {
      console.error("Full error details:", {
        message: error.message,
        errorName: error.errorName,
        args: error.args,
        contractAddress: error.address,
      });

      if (error.errorName === "NotSubscribed") {
        // Log the exact parameters that failed
        console.error("NotSubscribed error with parameters:", {
          flightNumber: String(flightNumber),
          carrierCode: String(carrierCode),
          arrivalAirport: String(arrivalAirport),
          departureAirport: String(departureAirport),
          walletAddress: this.walletAddress,
        });

        throw new Error(
          `Wallet ${this.walletAddress} is not subscribed to flight ${flightNumber} (${carrierCode}) from ${departureAirport} to ${arrivalAirport} (on-chain check)`
        );
      } else if (error.errorName === "FlightNotFound") {
        throw new Error("Flight not found on-chain");
      } else if (error.errorName === "DateRangeExceeded") {
        throw new Error("Date range exceeds allowed limit");
      }

      customLogger.error("Error fetching flight history:", error);
      throw error;
    }
  }
  // Store single flight details - matches ABI with enhanced error handling
  async storeFlightInBlockchain(flightStatusResp) {
    if (!this.contractWithSigner) {
      throw new Error("Wallet not configured for transactions");
    }

    try {
      const blockchainData = await getBlockchainData(flightStatusResp);
      if (!blockchainData.success) {
        throw new Error(`Data preparation failed: ${blockchainData.error}`);
      }

      const { flightDetailsArray, compressedFlightData } = blockchainData;

      if (!flightDetailsArray || !Array.isArray(flightDetailsArray)) {
        throw new Error("Invalid flight details array");
      }

      if (flightDetailsArray.length !== 10) {
        throw new Error(
          `Expected 10 flight details, got ${flightDetailsArray.length}`
        );
      }

      const requiredFields = [0, 1, 2, 3, 4];
      for (const index of requiredFields) {
        if (
          !flightDetailsArray[index] ||
          flightDetailsArray[index].trim() === ""
        ) {
          const fieldNames = [
            "flightNumber",
            "carrierCode",
            "flightOriginateDate",
            "arrivalAirport",
            "departureAirport",
          ];
          throw new Error(
            `Required field ${fieldNames[index] || `index ${index}`} is empty`
          );
        }
      }

      customLogger.info("Flight details for blockchain:", {
        flightNumber: flightDetailsArray[0],
        carrierCode: flightDetailsArray[1],
        originateDate: flightDetailsArray[2],
        arrivalAirport: flightDetailsArray[3],
        departureAirport: flightDetailsArray[4],
        compressedDataLength: compressedFlightData?.length || 0,
      });

      const tx = await this.contractWithSigner.storeFlightDetails(
        flightDetailsArray,
        compressedFlightData
      );

      customLogger.info(`Transaction sent: ${tx.hash}`);

      const receipt = await tx.wait();

      customLogger.info(
        `Transaction confirmed in block ${receipt.blockNumber}`
      );

      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
      };
    } catch (error) {
      customLogger.error("Error storing flight details:", error);
      console.log("Error", error);

      let errorMessage = error.message || "Unknown error";

      if (errorMessage.includes("insufficient funds")) {
        errorMessage = "Insufficient funds to pay for gas";
      } else if (errorMessage.includes("nonce too low")) {
        errorMessage = "Transaction nonce too low - please try again";
      } else if (errorMessage.includes("replacement transaction underpriced")) {
        errorMessage = "Transaction underpriced - increase gas price";
      } else if (errorMessage.includes("execution reverted")) {
        errorMessage = `Smart contract reverted: ${errorMessage}`;
      }

      throw new Error(errorMessage);
    }
  }

  // Add flight subscription - matches ABI (payable function)
  async addSubscription(
    flightNumber,
    carrierCode,
    departureAirport,
    arrivalAirport
  ) {
    if (!this.contractWithSigner) {
      throw new Error("Wallet not configured for transactions");
    }

    try {
      const tx = await this.contractWithSigner.addFlightSubscription(
        flightNumber,
        carrierCode,
        arrivalAirport,
        departureAirport
      );

      const receipt = await tx.wait();
      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error) {
      customLogger.error("Error adding flight subscription:", error);
      console.log(error);
      throw error;
    }
  }

  async removeFlightSubscription(
    flightNumbers,
    carrierCodes,
    arrivalAirports,
    departureAirports
  ) {
    if (!this.contractWithSigner) {
      throw new Error("Wallet not configured for transactions");
    }

    try {
      // Validate input arrays
      if (
        !Array.isArray(flightNumbers) ||
        !Array.isArray(carrierCodes) ||
        !Array.isArray(arrivalAirports) ||
        !Array.isArray(departureAirports) ||
        flightNumbers.length !== carrierCodes.length ||
        flightNumbers.length !== arrivalAirports.length ||
        flightNumbers.length !== departureAirports.length
      ) {
        throw new Error("Invalid or mismatched input arrays");
      }

      customLogger.info(
        `Unsubscribing from ${flightNumbers.length} flights for wallet ${this.walletAddress}`
      );

      flightNumbers.map((flight) => {
        customLogger.info(`Flight Numbers: ${flight}`);
      });


      departureAirports.map((flight) => {
        customLogger.info(`DepartureAirports: ${flight}`);
      });

      arrivalAirports.map((flight) => {
        customLogger.info(`ArrivalAirports: ${flight}`);
      });


      // Sanitize inputs
      const sanitizedFlightNumbers = flightNumbers.map((fn) =>
        String(fn || "")
      );
      const sanitizedCarrierCodes = carrierCodes.map((cc) => String(cc || ""));
      const sanitizedArrivalAirports = arrivalAirports.map((aa) =>
        String(aa || "")
      );
      const sanitizedDepartureAirports = departureAirports.map((da) =>
        String(da || "")
      );

      const tx = await this.contractWithSigner.removeFlightSubscription(
        sanitizedFlightNumbers,
        sanitizedCarrierCodes,
        sanitizedDepartureAirports,
        sanitizedArrivalAirports,
      );

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

  // Check flight existence - matches ABI
  async isFlightExist(flightNumber, carrierCode) {
    try {
      if (!flightNumber || !carrierCode) {
        throw new Error("Invalid input parameters");
      }

      return await this.contract.isFlightExist(
        String(flightNumber),
        String(carrierCode)
      );
    } catch (error) {
      customLogger.error("Error checking flight existence:", error);
      throw error;
    }
  }

  async waitForTransaction(txHash, confirmations = 1, timeoutMs = 120000) {
    try {
      if (!txHash) throw new Error("Missing txHash");
      const start = Date.now();
      // provider.waitForTransaction resolves to receipt or null on timeout
      const receipt = await this.provider.waitForTransaction(
        txHash,
        confirmations,
        timeoutMs
      );
      if (!receipt) {
        throw new Error(
          `Transaction ${txHash} not mined within ${timeoutMs}ms`
        );
      }
      return receipt;
    } catch (error) {
      customLogger.error(`waitForTransaction error for ${txHash}:`, error);
      throw error;
    }
  }

  // Check user subscription - matches ABI
  async isUserSubscribed(
    userAddress,
    flightNumber,
    carrierCode,
    arrivalAirport,
    departureAirport
  ) {
    try {
      if (
        !userAddress ||
        !flightNumber ||
        !carrierCode ||
        !arrivalAirport ||
        !departureAirport
      ) {
        throw new Error("Invalid input parameters");
      }

      return await this.contract.isUserSubscribed(
        userAddress,
        String(flightNumber),
        String(carrierCode),
        String(arrivalAirport),
        String(departureAirport)
      );
    } catch (error) {
      customLogger.error("Error checking user subscription:", error);
      throw error;
    }
  }

  // Get current flight status - matches ABI
  async getCurrentFlightStatus(flightNumber, carrierCode) {
    try {
      if (!flightNumber || !carrierCode) {
        throw new Error("Invalid input parameters");
      }

      return await this.contract.getCurrentFlightStatus(
        String(flightNumber),
        String(carrierCode)
      );
    } catch (error) {
      customLogger.error("Error getting current flight status:", error);
      throw error;
    }
  }

  // Get flight dates - matches ABI
  async getFlightDates(flightNumber, carrierCode) {
    try {
      if (!flightNumber || !carrierCode) {
        throw new Error("Invalid input parameters");
      }

      return await this.contract.getFlightDates(
        String(flightNumber),
        String(carrierCode)
      );
    } catch (error) {
      customLogger.error("Error getting flight dates:", error);
      throw error;
    }
  }

  // Get all flight numbers - matches ABI
  async getAllFlightNumbers() {
    try {
      return await this.contract.getAllFlightNumbers();
    } catch (error) {
      customLogger.error("Error getting all flight numbers:", error);
      throw error;
    }
  }

  // Owner functions - matches ABI
  async getOwner() {
    try {
      return await this.contract.getOwner();
    } catch (error) {
      customLogger.error("Error getting owner:", error);
      throw error;
    }
  }

  async transferOwnership(newOwner) {
    if (!this.contractWithSigner) {
      throw new Error("Wallet not configured for transactions");
    }

    try {
      if (!newOwner || !ethers.utils.isAddress(newOwner)) {
        throw new Error("Invalid new owner address");
      }

      const tx = await this.contractWithSigner.transferOwnership(newOwner);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error) {
      customLogger.error("Error transferring ownership:", error);
      throw error;
    }
  }

  // Oracle management functions - matches ABI
  async authorizeOracle(oracleAddress) {
    if (!this.contractWithSigner) {
      throw new Error("Wallet not configured for transactions");
    }

    try {
      if (!oracleAddress || !ethers.utils.isAddress(oracleAddress)) {
        throw new Error("Invalid oracle address");
      }

      const tx = await this.contractWithSigner.authorizeOracle(oracleAddress);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error) {
      customLogger.error("Error authorizing oracle:", error);
      throw error;
    }
  }

  async revokeOracle(oracleAddress) {
    if (!this.contractWithSigner) {
      throw new Error("Wallet not configured for transactions");
    }

    try {
      if (!oracleAddress || !ethers.utils.isAddress(oracleAddress)) {
        throw new Error("Invalid oracle address");
      }

      const tx = await this.contractWithSigner.revokeOracle(oracleAddress);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error) {
      customLogger.error("Error revoking oracle:", error);
      throw error;
    }
  }

  async isAuthorizedOracle(oracleAddress) {
    try {
      if (!oracleAddress || !ethers.utils.isAddress(oracleAddress)) {
        throw new Error("Invalid oracle address");
      }

      return await this.contract.isAuthorizedOracle(oracleAddress);
    } catch (error) {
      customLogger.error("Error checking oracle authorization:", error);
      throw error;
    }
  }

  async storeMultipleFlightDetails(flightInputs) {
    if (!this.contractWithSigner) {
      throw new Error("Wallet not configured for transactions");
    }

    try {
      if (!Array.isArray(flightInputs) || flightInputs.length === 0) {
        throw new Error("No flight data provided for batch insert");
      }

      if (flightInputs.length > 100) {
        throw new Error("Too many flights in batch (max 100 allowed)");
      }

      // Validate each flight input
      for (const input of flightInputs) {
        if (
          !input.flightDetails ||
          !Array.isArray(input.flightDetails) ||
          input.flightDetails.length !== 10
        ) {
          throw new Error(
            `Invalid flightDetails array, expected 10 elements, got ${input.flightDetails?.length}`
          );
        }

        // Ensure required fields are not empty
        const requiredFields = [0, 1, 2, 3, 4]; // carrierCode, flightNumber, originateDate, arrivalAirport, departureAirport
        for (const idx of requiredFields) {
          if (!input.flightDetails[idx] || input.flightDetails[idx].trim() === "") {
            throw new Error(`Required flight field at index ${idx} is empty`);
          }
        }

        if (typeof input.compressedFlightInformation !== "string") {
          throw new Error("Invalid compressedFlightInformation");
        }
      }

      customLogger.info(`Preparing to store batch of ${flightInputs.length} flights`);

      // Estimate gas
      let estimatedGas;
      try {
        estimatedGas = await this.contractWithSigner.estimateGas.storeMultipleFlightDetails(
          flightInputs
        );
        customLogger.info(`Estimated gas for batch: ${estimatedGas.toString()}`);
      } catch (estimateError) {
        customLogger.error("Gas estimation failed for batch:", estimateError);
        // We'll continue without explicit gas limit if estimation fails, 
        // but it's likely the transaction will fail too.
      }

      const gasLimit = estimatedGas ? estimatedGas.mul(120).div(100) : undefined;
      if (gasLimit) {
        customLogger.info(`Using gas limit with 20% buffer: ${gasLimit.toString()}`);
      }

      // Send batch transaction
      const tx = await this.contractWithSigner.storeMultipleFlightDetails(
        flightInputs,
        gasLimit ? { gasLimit } : {}
      );

      customLogger.info(`Batch transaction sent: ${tx.hash}`);

      const receipt = await tx.wait();

      customLogger.info(
        `Batch transaction confirmed in block ${receipt.blockNumber}. Gas used: ${receipt.gasUsed?.toString()}`
      );

      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
        flightsInBatch: flightInputs.length,
      };
    } catch (error) {
      customLogger.error("Error storing multiple flight details:", error);

      // Enhanced error reporting for gas issues
      if (
        error.message?.includes("gas limit") ||
        error.code === "UNPREDICTABLE_GAS_LIMIT" ||
        error.message?.includes("out of gas")
      ) {
        customLogger.error("Potential gas limit issue detected in batch storage");
        customLogger.error(
          `Exact Blockchain Error: ${JSON.stringify(
            {
              message: error.message,
              data: error.data,
              transaction: error.transaction,
              receipt: error.receipt,
            },
            null,
            2
          )}`
        );
      }

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

