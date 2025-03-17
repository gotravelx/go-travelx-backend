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
   * @param {string} scheduledDepartureDate
   * @param {string} carrierCode
   * @returns {Promise<Object>} Detailed flight status
   */
  async checkDetailedFlightStatus(
    flightNumber,
    scheduledDepartureDate,
    carrierCode
  ) {
    try {
      console.log("Checking detailed flight status for:", {
        flightNumber,
        scheduledDepartureDate,
        carrierCode,
      });

      if (!flightNumber || !scheduledDepartureDate || !carrierCode) {
        throw new Error("Missing required flight parameters");
      }

      // Convert inputs to strings
      flightNumber = flightNumber.toString();
      scheduledDepartureDate = scheduledDepartureDate.toString();
      carrierCode = carrierCode.toString();

      // This retrieves the status struct directly from the mapping
      const status = await this.contract.checkFlightStatus(
        flightNumber,
        scheduledDepartureDate,
        carrierCode
      );

      // Format the response with status details
      return {
        flightStatusCode: status.flightStatusCode,
        flightStatusDescription: status.flightStatusDescription,
        outUtc: status.outUtc,
        offUtc: status.offUtc,
        onUtc: status.onUtc,
        inUtc: status.inUtc,
        // Add human-readable timestamps where values exist
        timestamps: {
          outTime:
            status.outUtc && status.outUtc !== "0"
              ? new Date(parseInt(status.outUtc) * 1000).toISOString()
              : null,
          offTime:
            status.offUtc && status.offUtc !== "0"
              ? new Date(parseInt(status.offUtc) * 1000).toISOString()
              : null,
          onTime:
            status.onUtc && status.onUtc !== "0"
              ? new Date(parseInt(status.onUtc) * 1000).toISOString()
              : null,
          inTime:
            status.inUtc && status.inUtc !== "0"
              ? new Date(parseInt(status.inUtc) * 1000).toISOString()
              : null,
        },
      };
    } catch (error) {
      console.error("Detailed flight status error:", error);
      throw new Error(
        `Failed to check detailed flight status: ${error.message}`
      );
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
   * @param {string} scheduledDepartureDate
   * @param {string} carrierCode
   * @returns {Promise<Object>} Flight details
   */
  async getFlightDetails(flightNumber, scheduledDepartureDate, carrierCode) {
    try {
      // Validate required parameters
      if (!flightNumber || !scheduledDepartureDate || !carrierCode) {
        throw new Error("Missing required flight parameters");
      }

      console.log("Fetching flight details for:", {
        flightNumber,
        scheduledDepartureDate,
        carrierCode,
      });

      // Convert inputs to strings if they aren't already
      flightNumber = flightNumber.toString();
      scheduledDepartureDate = scheduledDepartureDate.toString();
      carrierCode = carrierCode.toString();

      // Get flight details from contract
      const flightData = await this.contract.getFlightDetails(
        flightNumber,
        scheduledDepartureDate,
        carrierCode
      );

      // Create structured return object
      return {
        flightNumber: flightData[0].flightNumber,
        flightDepartureDate: flightData[0].scheduledDepartureDate,
        carrierCode: flightData[0].carrierCode,
        arrivalCity: flightData[0].arrivalCity,
        departureCity: flightData[0].departureCity,
        arrivalAirport: flightData[0].arrivalAirport,
        departureAirport: flightData[0].departureAirport,
        operatingAirlineCode: flightData[0].operatingAirlineCode,
        arrivalGate: flightData[0].arrivalGate,
        departureGate: flightData[0].departureGate,
        flightStatus: flightData[0].flightStatus,
        equipmentModel: flightData[0].equipmentModel,
        estimatedDepartureUTC: flightData[1].estimatedDepartureUTC,
        estimatedArrivalUTC: flightData[1].actualArrivalUTC,
        actualDepartureUTC: flightData[1].actualDepartureUTC,
        actualDepartureUTC: flightData[1].estimatedArrivalUTC,
        actualArrivalUTC: flightData[1].actualArrivalUTC,
        scheduledArrivalUTCDateTime: flightData[1].scheduledArrivalUTC,
        scheduledDepartureUTCDateTime: flightData[1].scheduledDepartureUTC,
        statusCode: flightData[2].flightStatusCode,
        flightStatus: flightData[2].flightStatusDescription,
        outTimeUTC: flightData[2].outUtc,
        offTimeUTC: flightData[2].offUtc,
        onTimeUTC: flightData[2].onUtc,
        inTimeUTC: flightData[2].inUtc,
      };
      // return flightData;
    } catch (error) {
      console.error("Error fetching flight details:", error);

      // Provide more user-friendly error for the common 'not subscribed' error
      if (error.message.includes("You are not a subscribed user")) {
        throw new Error(
          "You must subscribe to this flight before accessing its details"
        );
      }

      throw new Error(`Failed to fetch flight details: ${error.message}`);
    }
  }

  /**
   * Get flight status from blockchain
   * @param {string} flightNumber
   * @param {string} scheduledDepartureDate
   * @param {string} carrierCode
   * @returns {Promise<Object>} Flight status details and history
   */
  async getFlightStatus(flightNumber, scheduledDepartureDate, carrierCode) {
    try {
      // Validate input
      if (!flightNumber || !scheduledDepartureDate || !carrierCode) {
        throw new Error("Missing required flight parameters");
      }

      console.log("Checking flight status for:", {
        flightNumber,
        scheduledDepartureDate,
        carrierCode,
      });

      // Convert to strings
      flightNumber = flightNumber.toString();
      scheduledDepartureDate = scheduledDepartureDate.toString();
      carrierCode = carrierCode.toString();

      // Call the smart contract function (assumes it's a view function)
      const statusString = await this.contractWithSigner.getFlightStatus(
        flightNumber,
        scheduledDepartureDate,
        carrierCode
      );

      console.log("Blockchain Response:", statusString);

      // Ensure the response is valid
      if (!statusString) {
        throw new Error("Invalid response from blockchain");
      }

      console.log(`Received flight status for ${flightNumber}:`, statusString);

      // If `getFlightStatus` is NOT a transaction, skip receipt fetching
      if (!statusString.hash) {
        return { currentStatus: statusString, statusHistory: [] };
      }

      // Fetch transaction receipt (only for write transactions)
      const tx = await this.provider.getTransaction(statusString.hash);
      const receipt = await tx.wait();

      console.log("Transaction Receipt:", JSON.stringify(receipt, null, 2));

      if (!receipt.events) {
        throw new Error("No events found in the transaction receipt.");
      }

      // Filter flight status events
      const statusEvents = receipt.events.filter(
        (event) => event.event === "currentFlightStatus" // Verify the event name
      );

      if (statusEvents.length === 0) {
        throw new Error("No matching flight status events found.");
      }

      const statusHistory = statusEvents.map((event) => {
        const {
          flightNumber,
          scheduledDepartureDate,
          flight_times,
          carrierCode,
          status,
          statusCode,
        } = event.args;

        return {
          time: flight_times,
          status,
          statusCode,
          timestamp: new Date(parseInt(flight_times) * 1000).toISOString(),
        };
      });

      return {
        currentStatus: statusString,
        statusHistory,
      };
    } catch (error) {
      console.error("Error fetching flight status:", error);

      if (error.message.includes("You are not a subscribed user")) {
        throw new Error(
          "You must subscribe to this flight before accessing its status"
        );
      }

      throw new Error(`Failed to fetch flight status: ${error.message}`);
    }
  }

  /**
   * Get UTC times for a flight
   * @param {string} flightNumber
   * @param {string} scheduledDepartureDate
   * @param {string} carrierCode
   * @returns {Promise<Object>} UTC times
   */
  async getFlightUTCTimes(flightNumber, scheduledDepartureDate, carrierCode) {
    try {
      // Validate inputs
      if (!flightNumber || !scheduledDepartureDate || !carrierCode) {
        throw new Error("Missing required flight parameters");
      }

      // Convert inputs to strings
      flightNumber = flightNumber.toString();
      scheduledDepartureDate = scheduledDepartureDate.toString();
      carrierCode = carrierCode.toString();

      // Call contract method
      const utcTimes = await this.contract.UtcTimes(
        flightNumber,
        scheduledDepartureDate,
        carrierCode
      );

      // Format the response
      return {
        actualArrivalUTC: utcTimes.actualArrivalUTC,
        actualDepartureUTC: utcTimes.actualDepartureUTC,
        estimatedArrivalUTC: utcTimes.estimatedArrivalUTC,
        estimatedDepartureUTC: utcTimes.estimatedDepartureUTC,
        scheduledArrivalUTC: utcTimes.scheduledArrivalUTC,
        scheduledDepartureUTC: utcTimes.scheduledDepartureUTC,
        // Add human-readable dates
        formattedTimes: {
          actualArrival:
            utcTimes.actualArrivalUTC !== "0"
              ? new Date(
                  parseInt(utcTimes.actualArrivalUTC) * 1000
                ).toISOString()
              : null,
          actualDeparture:
            utcTimes.actualDepartureUTC !== "0"
              ? new Date(
                  parseInt(utcTimes.actualDepartureUTC) * 1000
                ).toISOString()
              : null,
          estimatedArrival:
            utcTimes.estimatedArrivalUTC !== "0"
              ? new Date(
                  parseInt(utcTimes.estimatedArrivalUTC) * 1000
                ).toISOString()
              : null,
          estimatedDeparture:
            utcTimes.estimatedDepartureUTC !== "0"
              ? new Date(
                  parseInt(utcTimes.estimatedDepartureUTC) * 1000
                ).toISOString()
              : null,
          scheduledArrival:
            utcTimes.scheduledArrivalUTC !== "0"
              ? new Date(
                  parseInt(utcTimes.scheduledArrivalUTC) * 1000
                ).toISOString()
              : null,
          scheduledDeparture:
            utcTimes.scheduledDepartureUTC !== "0"
              ? new Date(
                  parseInt(utcTimes.scheduledDepartureUTC) * 1000
                ).toISOString()
              : null,
        },
      };
    } catch (error) {
      console.error("Error fetching UTC times:", error);
      throw new Error(`Failed to fetch UTC times: ${error.message}`);
    }
  }

  /**
   * Insert flight details into blockchain
   * @param {string[]} flightData - Array containing flight details in order:
   *   [flightNumber, scheduledDepartureDate, carrierCode, arrivalCity, departureCity,
   *    arrivalAirport, departureAirport, operatingAirlineCode, arrivalGate, departureGate,
   *    flightStatus, equipmentModel]
   * @param {string[]} utcTimes - Array containing UTC times in order:
   *   [actualArrivalUTC, actualDepartureUTC, estimatedArrivalUTC, estimatedDepartureUTC,
   *    scheduledArrivalUTC, scheduledDepartureUTC]
   * @param {string[]} status - Array containing status info in order:
   *   [flightStatusCode, flightStatusDescription, outUtc, offUtc, onUtc, inUtc]
   * @returns {Promise<Object>} Transaction result
   */
  async insertFlightDetails(flightData, utcTimes, status) {
    try {
      // Ensure we have a wallet with signer capabilities
      if (!this.contractWithSigner) {
        throw new Error("No wallet configured for transactions");
      }

      // Validate input arrays
      if (!flightData || flightData.length !== 12) {
        throw new Error("flightData array must contain exactly 12 elements");
      }
      if (!utcTimes || utcTimes.length !== 6) {
        throw new Error("utcTimes array must contain exactly 6 elements");
      }
      if (!status || status.length !== 6) {
        throw new Error("status array must contain exactly 6 elements");
      }

      console.log("Attempting to insert flight details:", {
        flightData,
        utcTimes,
        status,
      });

      // Convert any non-string values to strings since the contract expects strings
      const formattedFlightData = flightData.map((item) => item.toString());
      const formattedUtcTimes = utcTimes.map((item) => item.toString());
      const formattedStatus = status.map((item) => item.toString());

      // Send transaction to insert flight details
      const transaction = await this.contractWithSigner.insertFlightDetails(
        formattedFlightData,
        formattedUtcTimes,
        formattedStatus
      );

      // Wait for transaction confirmation
      const receipt = await transaction.wait();
      console.log(
        "Flight details inserted successfully:",
        receipt.transactionHash
      );

      return receipt;
    } catch (error) {
      console.error("Error inserting flight details:", error);
      throw new Error(`Failed to insert flight details: ${error.message}`);
    }
  }

  /**
   * Subscribe to flight updates
   * @param {string} flightNumber
   * @param {string} carrierCode
   * @param {string} departureAirport
   * @param {string} scheduledDepartureDate
   * @returns {Promise<Object>} Transaction result
   */
  async subscribeFlight(
    flightNumber,
    carrierCode,
    departureAirport,
    scheduledDepartureDate
  ) {
    try {
      // Ensure we have a wallet with signer capabilities
      if (!this.contractWithSigner) {
        throw new Error("No wallet configured for transactions");
      }

      // Validate parameters
      if (
        !flightNumber ||
        !carrierCode ||
        !departureAirport ||
        !scheduledDepartureDate
      ) {
        throw new Error("Missing required subscription parameters");
      }

      console.log("Subscribing to flight:", {
        flightNumber,
        carrierCode,
        departureAirport,
        scheduledDepartureDate,
      });

      // Convert inputs to strings
      flightNumber = flightNumber.toString();
      carrierCode = carrierCode.toString();
      departureAirport = departureAirport.toString();
      scheduledDepartureDate = scheduledDepartureDate.toString();

      // Send transaction to subscribe
      const transaction = await this.contractWithSigner.addFlightSubscription(
        flightNumber.toString(),
        carrierCode,
        departureAirport,
        scheduledDepartureDate,
        {
          value: ethers.utils.parseEther("0.01"), // Example subscription fee
        }
      );

      // Wait for transaction confirmation
      const receipt = await transaction.wait();
      console.log(
        "Successfully subscribed to flight:",
        receipt.transactionHash
      );

      // Check for subscription event
      const subscriptionEvent = receipt.events.find(
        (event) => event.event === "SubscriptionDetails"
      );

      if (subscriptionEvent) {
        console.log("Subscription confirmed:", subscriptionEvent.args);
      }

      return receipt;
    } catch (error) {
      console.error("Error subscribing to flight:", error);

      // Provide more specific errors for common issues
      if (error.message.includes("you are already Subscribed user")) {
        throw new Error("You are already subscribed to this flight");
      }
      if (error.message.includes("Flight is not Exist here")) {
        throw new Error("This flight does not exist in the system");
      }

      throw new Error(`Failed to subscribe to flight: ${error.message}`);
    }
  }

  /**
   * Unsubscribe from flight updates
   * @param {string} flightNumber
   * @param {string} carrierCode
   * @param {string} departureAirport
   * @param {string} scheduledDepartureDate
   * @returns {Promise<Object>} Transaction result
   */
  async unsubscribeFlight(
    flightNumber,
    carrierCode,
    departureAirport,
    scheduledDepartureDate
  ) {
    try {
      // Ensure we have a wallet with signer capabilities
      if (!this.contractWithSigner) {
        throw new Error("No wallet configured for transactions");
      }

      // Validate parameters
      if (
        !flightNumber ||
        !carrierCode ||
        !departureAirport ||
        !scheduledDepartureDate
      ) {
        throw new Error("Missing required unsubscription parameters");
      }

      console.log("Unsubscribing from flight:", {
        flightNumber,
        carrierCode,
        departureAirport,
        scheduledDepartureDate,
      });

      // Convert inputs to strings
      flightNumber = flightNumber.toString();
      carrierCode = carrierCode.toString();
      departureAirport = departureAirport.toString();
      scheduledDepartureDate = scheduledDepartureDate.toString();

      // Send transaction to unsubscribe
      const transaction =
        await this.contractWithSigner.removeFlightSubscription(
          flightNumber,
          carrierCode,
          departureAirport,
          scheduledDepartureDate
        );

      // Wait for transaction confirmation
      const receipt = await transaction.wait();
      console.log(
        "Successfully unsubscribed from flight:",
        receipt.transactionHash
      );

      // Check for unsubscription event
      const unsubscriptionEvent = receipt.events.find(
        (event) =>
          event.event === "SubscriptionDetails" && !event.args.isSubscribe
      );

      if (unsubscriptionEvent) {
        console.log("Unsubscription confirmed:", unsubscriptionEvent.args);
      }

      return receipt;
    } catch (error) {
      console.error("Error unsubscribing from flight:", error);

      // Provide more specific errors for common issues
      if (error.message.includes("You are not a subscribed user")) {
        throw new Error("You are not currently subscribed to this flight");
      }

      throw new Error(`Failed to unsubscribe from flight: ${error.message}`);
    }
  }

  /**
   * Check if a user is subscribed to a specific flight
   * @param {string} flightNumber
   * @param {string} carrierCode
   * @param {string} departureAirport
   * @param {string} scheduledDepartureDate
   * @returns {Promise<boolean>} Subscription status
   */
  async checkSubscriptionStatus(flightNumber) {
    try {
      // Validate parameters
      if (!flightNumber) {
        throw new Error("Missing required parameters for subscription check");
      }

      // Convert inputs to strings
      flightNumber = flightNumber.toString();
      // carrierCode = carrierCode.toString();
      // departureAirport = departureAirport.toString();
      // scheduledDepartureDate = scheduledDepartureDate.toString();

      // Call the subscriptions mapping directly
      // Note: This requires exposing the subscriptions mapping as public in the contract
      const isSubscribed = await this.contract.subscriptions(flightNumber);

      return isSubscribed;
    } catch (error) {
      console.error("Error checking subscription status:", error);
      throw new Error(`Failed to check subscription status: ${error.message}`);
    }
  }

  /**
   * List all available flight numbers in the system
   * @returns {Promise<string[]>} Array of flight numbers
   */
  async listAvailableFlights() {
    try {
      // Get the length of the flightNumbers array
      const length = await this.contract.flightNumbers.length();

      // Convert BigNumber to number
      const count = length.toNumber();

      // Fetch all flight numbers
      const flights = [];
      for (let i = 0; i < count; i++) {
        const flightNumber = await this.contract.flightNumbers(i);
        flights.push(flightNumber);
      }

      return flights;
    } catch (error) {
      console.error("Error listing available flights:", error);
      throw new Error(`Failed to list available flights: ${error.message}`);
    }
  }

  /**
   * Check if a specific flight exists in the system
   * @param {string} flightNumber
   * @returns {Promise<boolean>} Whether the flight exists
   */
  async checkFlightExists(flightNumber) {
    try {
      if (!flightNumber) {
        throw new Error("Flight number is required");
      }

      flightNumber = flightNumber.toString();

      const exists = await this.contract.isFlightExist(flightNumber);
      return exists;
    } catch (error) {
      console.error("Error checking if flight exists:", error);
      throw new Error(`Failed to check if flight exists: ${error.message}`);
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
