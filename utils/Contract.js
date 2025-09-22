import ethers from "ethers";
import dotenv from "dotenv";
import customLogger from "./Logger.js";
import { getBlockchainData } from "../helper/helper.js";

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
    fromDateInTimeStamp,
    toDate,
    carrierCode,
    arrivalAirport,
    departureAirport
  ) {
    try {
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

     const sanitizedFromDateInTimeStamp = Number(fromDateInTimeStamp);

      const flightHistory = await this.contract.getFlightHistory(
        String(flightNumber),
        String(fromDate),
        sanitizedFromDateInTimeStamp,
        String(toDate),
        String(carrierCode),
        String(arrivalAirport),
        String(departureAirport)
      );

      return flightHistory.map((flight) => ({
        identifiers: {
          carrierCode: flight.identifiers.carrierCode,
          flightNumber: flight.identifiers.flightNumber,
          flightOriginateDate: flight.identifiers.flightOriginateDate,
        },
        airports: {
          arrivalAirport: flight.airports.arrivalAirport,
          departureAirport: flight.airports.departureAirport,
          arrivalCity: flight.airports.arrivalCity,
          departureCity: flight.airports.departureCity,
        },
        statuses: {
          arrivalStatus: flight.statuses.arrivalStatus,
          departureStatus: flight.statuses.departureStatus,
          legStatus: flight.statuses.legStatus,
        },
        compressedFlightInformation: flight.compressedFlightInformation,
      }));
    } catch (error) {
      customLogger.error("Error fetching flight history:", error);
      console.log("Error", error);
      
      throw error;
    }
  }

  // Store single flight details - matches ABI with enhanced error handling
  async storeFlightInBlockchain(flightStatusResp) {
    if (!this.contractWithSigner) {
      throw new Error("Wallet not configured for transactions");
    }

    console.log(
      this.contractWithSigner.interface.getFunction("storeFlightDetails").inputs
    );

    try {
      // Get blockchain data
      const blockchainData = await getBlockchainData(flightStatusResp);

      if (!blockchainData.success) {
        throw new Error(`Data preparation failed: ${blockchainData.error}`);
      }

      // Validate the prepared data
      const { flightDetailsArray, compressedFlightData } = blockchainData;

      console.log(
        "compressedFlightData",
        typeof compressedFlightData,
        compressedFlightData.substring(0, 1000)
      );

      console.log("compressedFlightData", compressedFlightData);

      if (!flightDetailsArray || !Array.isArray(flightDetailsArray)) {
        throw new Error("Invalid flight details array");
      }

      if (flightDetailsArray.length !== 10) {
        throw new Error(
          `Expected 10 flight details, got ${flightDetailsArray.length}`
        );
      }

      // Check for empty required fields
      const requiredFields = [0, 1, 2, 3, 4]; // flightNumber, carrierCode, arrivalAirport, departureAirport
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

    console.log(
      "Params:",
      typeof flightNumber,
      typeof carrierCode,
      typeof departureAirport,
      typeof arrivalAirport
    );


    console.log("Params:", flightNumber, carrierCode, departureAirport, arrivalAirport);
    
    console.log("add flight subscription called");
    this.isFlightExist(flightNumber, carrierCode).then((exists) => {
      console.log("Flight exists:", exists);
      
    });

    try {
      const tx = await this.contractWithSigner.addFlightSubscription(
        flightNumber,
        carrierCode,
        arrivalAirport,
        departureAirport,
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
        sanitizedArrivalAirports,
        sanitizedDepartureAirports
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
