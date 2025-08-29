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

  // Store single flight details - matches ABI
  async storeFlightDetails(flightDetails, compressedFlightInformation) {
    if (!this.contractWithSigner) {
      throw new Error("Wallet not configured for transactions");
    }

    try {
      // Validate input
      if (!Array.isArray(flightDetails) || !compressedFlightInformation) {
        throw new Error("Invalid input parameters");
      }

      const sanitizedFlightDetails = flightDetails.map((item) =>
        item !== null && item !== undefined ? String(item) : ""
      );
      const sanitizedCompressedInfo = String(compressedFlightInformation);

      let estimatedGas;
      try {
        estimatedGas = await this.contractWithSigner.estimateGas.storeFlightDetails(
          sanitizedFlightDetails,
          sanitizedCompressedInfo
        );
      } catch (estimateError) {
        customLogger.error("Gas estimation failed:", estimateError);
        throw new Error(
          "Transaction would fail. Check contract requirements and input data."
        );
      }

      const gasLimit = estimatedGas.mul(120).div(100);

      const tx = await this.contractWithSigner.storeFlightDetails(
        sanitizedFlightDetails,
        sanitizedCompressedInfo,
        { gasLimit }
      );

      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error) {
      customLogger.error("Error storing flight details:", error.message);
      throw error;
    }
  }

  // Store multiple flight details - matches ABI
  async storeMultipleFlightDetails(flightInputs) {
    if (!this.contractWithSigner) {
      throw new Error("Wallet not configured for transactions");
    }

    try {
      // Validate input
      if (!Array.isArray(flightInputs) || flightInputs.length === 0) {
        throw new Error("Invalid flight inputs array");
      }

      // Sanitize flight inputs
      const sanitizedFlightInputs = flightInputs.map(input => ({
        flightDetails: input.flightDetails.map(detail => 
          detail !== null && detail !== undefined ? String(detail) : ""
        ),
        compressedFlightInformation: String(input.compressedFlightInformation || "")
      }));

      let estimatedGas;
      try {
        estimatedGas = await this.contractWithSigner.estimateGas.storeMultipleFlightDetails(
          sanitizedFlightInputs
        );
      } catch (estimateError) {
        customLogger.error("Gas estimation failed:", estimateError);
        throw new Error(
          "Transaction would fail. Check contract requirements and input data."
        );
      }

      const gasLimit = estimatedGas.mul(120).div(100);

      const tx = await this.contractWithSigner.storeMultipleFlightDetails(
        sanitizedFlightInputs,
        { gasLimit }
      );

      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        storedCount: sanitizedFlightInputs.length,
      };
    } catch (error) {
      customLogger.error("Error storing multiple flight details:", error.message);
      throw error;
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
        estimatedGas = await this.contractWithSigner.estimateGas.updateFlightStatus(
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
      if (!flightNumber || !fromDate || !toDate || !carrierCode || !arrivalAirport || !departureAirport) {
        throw new Error("Invalid input parameters");
      }

      const sanitizedFromDateInTimeStamp = typeof fromDateInTimeStamp === 'number' 
        ? fromDateInTimeStamp 
        : new Date(fromDate).getTime() / 1000; // Convert to Unix timestamp

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
      throw error;
    }
  }

  // Add flight subscription - matches ABI (payable function)
  async addFlightSubscription(flightNumber, carrierCode, arrivalAirport, departureAirport, value = 0) {
    if (!this.contractWithSigner) {
      throw new Error("Wallet not configured for transactions");
    }

    try {
      // Validate input parameters
      if (!flightNumber || !carrierCode || !arrivalAirport || !departureAirport) {
        throw new Error("Invalid input parameters");
      }

      const txOptions = { value: ethers.utils.parseEther(value.toString()) };

      const tx = await this.contractWithSigner.addFlightSubscription(
        String(flightNumber),
        String(carrierCode),
        String(arrivalAirport),
        String(departureAirport),
        txOptions
      );

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

  // Remove flight subscriptions - matches ABI
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
      const sanitizedFlightNumbers = flightNumbers.map(fn => String(fn || ""));
      const sanitizedCarrierCodes = carrierCodes.map(cc => String(cc || ""));
      const sanitizedArrivalAirports = arrivalAirports.map(aa => String(aa || ""));
      const sanitizedDepartureAirports = departureAirports.map(da => String(da || ""));

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

  // Check user subscription - matches ABI
  async isUserSubscribed(userAddress, flightNumber, carrierCode, arrivalAirport, departureAirport) {
    try {
      if (!userAddress || !flightNumber || !carrierCode || !arrivalAirport || !departureAirport) {
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