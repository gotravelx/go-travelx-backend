import * as ethers from "ethers";
import dotenv from "dotenv";

dotenv.config();

class FlightBlockchainService {
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

    // Optional: Create wallet if private key is provided
    if (privateKey) {
      this.wallet = new ethers.Wallet(privateKey, this.provider);
      this.contractWithSigner = this.contract.connect(this.wallet);
    }
  }

  /**
   * Check detailed flight status with enhanced error handling
   * @param {string} flightNumber
   * @param {string} flightOriginationDate
   * @param {string} carrierCode
   * @returns {Promise<Object>} Detailed flight status
   */
  async checkDetailedFlightStatus(
    flightNumber,
    flightOriginationDate,
    carrierCode
  ) {
    try {
      console.log("Attempting to check flight status with:", {
        flightNumber,
        flightOriginationDate,
        carrierCode,
      });

      if (!flightNumber || !flightOriginationDate || !carrierCode) {
        throw new Error("Missing required flight parameters");
      }

      // Convert inputs if necessary
      flightNumber = flightNumber.toString();
      flightOriginationDate = Math.floor(
        new Date(flightOriginationDate).getTime() / 1000
      );

      console.log("Formatted input values:", {
        flightNumber,
        flightOriginationDate,
        carrierCode,
      });

      // Ensure contract exists
      const contractCode = await this.provider.getCode(this.contract.address);
      if (contractCode === "0x") {
        throw new Error("Contract is not deployed at this address.");
      }

      try {
        const status = await this.contract.checkFlightStatus(
          flightNumber,
          flightOriginationDate,
          carrierCode
        );
        console.log("Received flight status:", status);

        return {
          flightStatusCode: status.flightStatusCode,
          flightStatusDescription: status.flightStatusDescription,
          outUtc: status.outUtc.toNumber(),
          offUtc: status.offUtc.toNumber(),
          onUtc: status.onUtc.toNumber(),
          inUtc: status.inUtc.toNumber(),
        };
      } catch (contractError) {
        console.error("Contract call error details:", {
          name: contractError.name,
          message: contractError.message,
          code: contractError.code,
          reason: contractError.reason,
          data: contractError.data,
        });

        if (contractError.code === "CALL_EXCEPTION") {
          throw new Error(`Contract call failed. Possible reasons:
          - Flight does not exist in the contract
          - Incorrect parameters
          - Contract method not found
          - Network connectivity issues`);
        }

        throw contractError;
      }
    } catch (error) {
      console.error("Comprehensive error in checkDetailedFlightStatus:", error);
      throw new Error(`Failed to check flight status: ${error.message}`);
    }
  }

  /**
   * Diagnostic method to check contract connectivity
   * @returns {Promise<boolean>} Contract connectivity status
   */
  async diagnosticContractCheck() {
    try {
      // Attempt to call a simple, read-only method to test connectivity
      const networkInfo = await this.provider.getNetwork();
      console.log("Connected to network:", networkInfo.name);
      console.log("Comino ", this.provider);

      // Check contract address validity
      const code = await this.provider.getCode(this.contractAddress);
      if (code === "0x") {
        throw new Error("No contract code found at the specified address");
      }
      console.log("Contract code found at address:", this.contractAddress);
      return true;
    } catch (error) {
      console.error("Diagnostic check failed:", error);
      return false;
    }
  }

  /**
   * Get flight details from blockchain
   * @param {string} flightNumber
   * @param {string} flightOriginationDate
   * @param {string} carrierCode
   * @returns {Promise<Object>} Flight details
   */
  async getFlightDetails(flightNumber, flightOriginationDate, carrierCode) {
    try {
      const flightDetails = await this.contract.getFlightDetails(
        flightNumber,
        flightOriginationDate,
        carrierCode
      );

      return {
        flightNumber: flightDetails[0],
        flightOriginationDate: flightDetails[1],
        carrierCode: flightDetails[2],
        arrivalCity: flightDetails[3],
        departureCity: flightDetails[4],
        operatingAirline: flightDetails[5],
        arrivalGate: flightDetails[6],
        departureGate: flightDetails[7],
        flightStatus: flightDetails[8],
        equipmentModel: flightDetails[9],
      };
    } catch (error) {
      console.error("Error fetching flight details:", error);
      throw new Error(`Failed to fetch flight details: ${error.message}`);
    }
  }

  /**
   * Get flight status from blockchain
   * @param {string} flightNumber
   * @param {string} flightOriginationDate
   * @param {string} carrierCode
   * @returns {Promise<string>} Flight status
   */
  async getFlightStatus(flightNumber, flightOriginationDate, carrierCode) {
    try {
      const status = await this.contract.getFlightStatus(
        flightNumber,
        flightOriginationDate,
        carrierCode
      );

      return status;
    } catch (error) {
      console.error("Error fetching flight status:", error);
      throw new Error(`Failed to fetch flight status: ${error.message}`);
    }
  }

  /**
   * Get UTC times for a flight
   * @param {string} flightNumber
   * @param {string} flightOriginationDate
   * @param {string} carrierCode
   * @returns {Promise<Object>} UTC times
   */
  async getFlightUTCTimes(flightNumber, flightOriginationDate, carrierCode) {
    try {
      const utcTimes = await this.contract.UtcTimes(
        flightNumber,
        flightOriginationDate,
        carrierCode
      );

      return {
        actualArrivalUTC: utcTimes.actualArrivalUTC.toNumber(),
        actualDepartureUTC: utcTimes.actualDepartureUTC.toNumber(),
        estimatedArrivalUTC: utcTimes.estimatedArrivalUTC.toNumber(),
        estimatedDepartureUTC: utcTimes.estimatedDepartureUTC.toNumber(),
        scheduledArrivalUTC: utcTimes.scheduledArrivalUTC.toNumber(),
        scheduledDepartureUTC: utcTimes.scheduledDepartureUTC.toNumber(),
      };
    } catch (error) {
      console.error("Error fetching UTC times:", error);
      throw new Error(`Failed to fetch UTC times: ${error.message}`);
    }
  }

  /**
   * Insert flight details into blockchain
   * @param {string[]} flightData
   * @param {string[]} utcTimes
   * @param {string[]} status
   * @returns {Promise<Object>} Transaction result
   */
  async insertFlightDetails(flightData, utcTimes, status) {
    try {
      // Ensure we have a wallet with signer capabilities
      if (!this.contractWithSigner) {
        throw new Error("No wallet configured for transactions");
      }

      // Send transaction to insert flight details
      const transaction = await this.contractWithSigner.insertFlightDetails(
        flightData,
        utcTimes,
        status
      );

      // Wait for transaction confirmation
      const receipt = await transaction.wait();

      return receipt;
    } catch (error) {
      console.error("Error inserting flight details:", error);
      throw new Error(`Failed to insert flight details: ${error.message}`);
    }
  }

  /**
   * Subscribe to flight updates
   * @param {string} flightNumber
   * @returns {Promise<Object>} Transaction result
   */
  async subscribeFlight(flightNumber) {
    try {
      // Ensure we have a wallet with signer capabilities
      if (!this.contractWithSigner) {
        throw new Error("No wallet configured for transactions");
      }

      // Send transaction to subscribe
      const transaction = await this.contractWithSigner.subscribe(
        flightNumber,
        {
          value: ethers.utils.parseEther("0.01"), // Example subscription fee
        }
      );

      // Wait for transaction confirmation
      const receipt = await transaction.wait();

      return receipt;
    } catch (error) {
      console.error("Error subscribing to flight:", error);
      throw new Error(`Failed to subscribe to flight: ${error.message}`);
    }
  }

  /**
   * Unsubscribe from flight updates
   * @param {string} flightNumber
   * @returns {Promise<Object>} Transaction result
   */
  async unsubscribeFlight(flightNumber) {
    try {
      // Ensure we have a wallet with signer capabilities
      if (!this.contractWithSigner) {
        throw new Error("No wallet configured for transactions");
      }

      // Send transaction to unsubscribe
      const transaction = await this.contractWithSigner.unSubscribe(
        flightNumber
      );

      // Wait for transaction confirmation
      const receipt = await transaction.wait();

      return receipt;
    } catch (error) {
      console.error("Error unsubscribing from flight:", error);
      throw new Error(`Failed to unsubscribe from flight: ${error.message}`);
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

export default FlightBlockchainService;
