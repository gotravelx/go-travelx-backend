// Flight Status Oracle Client Implementation for Node.js
// Only includes get and set functions (no subscription)
const Web3 = require('web3');
const { ContractAbi } = require('./abi');

// Contract configuration
const contractAddress = process.env.CONTRACT_ADDRESS;

// Define the contract ABI

// Define the contract ABI
const contractABI = ContractAbi;

class FlightStatusClient {
    constructor(providerUrl = 'http://localhost:8545') {
        this.web3 = new Web3(new Web3.providers.HttpProvider(providerUrl));
        this.contract = new this.web3.eth.Contract(contractABI, contractAddress);
        this.account = null;
    }

    async setAccount(privateKey) {
        const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
        this.web3.eth.accounts.wallet.add(account);
        this.account = account.address;
        return this.account;
    }

    // Get all available flight numbers
    async getAllFlightNumbers() {
        try {
            const flightCount = await this.getFlightCount();
            const flightNumbers = [];

            for (let i = 0; i < flightCount; i++) {
                const flightNumber = await this.contract.methods.flightNumbers(i).call();
                flightNumbers.push(flightNumber);
            }

            return flightNumbers;
        } catch (error) {
            console.error('Error getting flight numbers:', error);
            throw error;
        }
    }

    // Get count of flights in the contract
    async getFlightCount() {
        try {
            let count = 0;
            let continueChecking = true;

            // Since there's no direct method to get the count, we iterate until we get an error
            while (continueChecking) {
                try {
                    await this.contract.methods.flightNumbers(count).call();
                    count++;
                } catch (error) {
                    continueChecking = false;
                }
            }

            return count;
        } catch (error) {
            console.error('Error getting flight count:', error);
            throw error;
        }
    }

    // Get flight data without subscription check
    async getFlightDataNoAuth(flightNumber) {
        try {
            const flightData = await this.contract.methods.flights(flightNumber).call();
            const utcTimes = await this.contract.methods.UtcTimes(flightNumber).call();
            const statusData = await this.contract.methods.checkFlightStatus(flightNumber).call();

            return {
                flightData,
                utcTimes,
                statusData
            };
        } catch (error) {
            console.error(`Error getting data for flight ${flightNumber}:`, error);
            throw error;
        }
    }

    // Set flight data in the contract
    async setFlightData(flightdata, utcTimes, status) {
        if (!this.account) {
            throw new Error('Account not set. Call setAccount first.');
        }

        try {
            const gasEstimate = await this.contract.methods.setFlightData(
                flightdata,
                utcTimes,
                status
            ).estimateGas({ from: this.account });

            const result = await this.contract.methods.setFlightData(
                flightdata,
                utcTimes,
                status
            ).send({
                from: this.account,
                gas: Math.floor(gasEstimate * 1.2) // Add 20% buffer to gas estimate
            });

            return result;
        } catch (error) {
            console.error('Error setting flight data:', error);
            throw error;
        }
    }
}

// Sample flight data example
const exampleUsage = async () => {
    const client = new FlightStatusClient('YOUR_ETHEREUM_NODE_URL');
    await client.setAccount('YOUR_PRIVATE_KEY');

    // Setting flight data example
    const flightData = [
        'UA123',         // flightNumber
        'Chicago',       // arrivalCity
        'New York',      // departureCity
        'United Airlines', // operatingAirline
        'A12',           // arrivalGate
        'B34',           // departureGate
        'On Time',       // flightStatus
        'Boeing 737'     // equipmentModel
    ];

    const utcTimes = [
        '2025-02-28T18:00:00Z', // ArrivalUTC
        '2025-02-28T15:00:00Z', // DepartureUTC
        '2025-02-28T18:10:00Z', // estimatedArrivalUTC
        '2025-02-28T15:05:00Z', // estimatedDepartureUTC
        '2025-02-28T18:00:00Z', // scheduledArrivalUTC
        '2025-02-28T15:00:00Z'  // scheduledDepartureUTC
    ];

    const statusInfo = [
        'OFF',                  // flightStatusCode
        'In Flight',            // flightStatusDescription
        '2025-02-28T15:10:00Z', // outUtc
        '2025-02-28T15:25:00Z', // offUtc
        '',                     // onUtc
        ''                      // inUtc
    ];

    // Set flight data
    await client.setFlightData(flightData, utcTimes, statusInfo);

    // Get flight numbers
    const flightNumbers = await client.getAllFlightNumbers();
    console.log('Available flights:', flightNumbers);

    // Get flight data
    if (flightNumbers.length > 0) {
        const flight = await client.getFlightDataNoAuth(flightNumbers[0]);
        console.log('Flight information:', flight);
    }
};


module.exports = FlightStatusClient;