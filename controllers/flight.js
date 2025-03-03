import Web3 from 'web3';
import schedule from 'node-schedule';
import FlightData from '../model/flight.js';
import https from 'https';
import fetch from 'node-fetch';
import ContractAbi from '../utils/abi.js';
import dotenv from 'dotenv';
dotenv.config();

// Create HTTPS agent to disable certificate validation
const agent = new https.Agent({
    rejectUnauthorized: false
});

// Configure retry settings from environment or use defaults
const MAX_BLOCKCHAIN_RETRIES = parseInt(process.env.MAX_BLOCKCHAIN_RETRIES || '3', 10);
const RETRY_DELAY_MS = parseInt(process.env.RETRY_DELAY_MS || '5000', 10);
const ALLOW_NON_BLOCKCHAIN_SAVES = process.env.ALLOW_NON_BLOCKCHAIN_SAVES === 'true';
const BLOCKCHAIN_TIMEOUT_MS = parseInt(process.env.BLOCKCHAIN_TIMEOUT_MS || '30000', 10);

// Add fallback RPC providers - use environment variables or defaults




const RPC_PROVIDERS = [
    process.env.PRIMARY_CAMINO_PROVIDER || 'https://columbus.camino.network/ext/bc/C/rpc',
];



// Track current provider index
let currentProviderIndex = 0;



// Create Web3 instance with the current provider
//let web3 = new Web3(RPC_PROVIDERS[currentProviderIndex]);

// Function to find a working RPC provider



// Load contract ABI and address from environment variables
const contractABI = ContractAbi;
const contractAddress = process.env.CONTRACT_ADDRESS;

// Initialize the contract
//let flightContract = new web3.eth.Contract(contractABI, contractAddress);

// Get wallet address from environment
const walletAddress = process.env.WALLET_ADDRESS;
const privateKey = process.env.PRIVATE_KEY;

console.log(walletAddress, privateKey);

// Queue to track pending blockchain transactions for retry
const pendingBlockchainTransactions = [];

// Function to switch to next provider if current one fails



async function getWorkingWeb3Instance() {
    for (const providerUrl of RPC_PROVIDERS) {
        try {
            console.log(`[BLOCKCHAIN] Trying RPC provider: ${providerUrl}`);

            const httpProvider = new Web3.providers.HttpProvider(
                providerUrl,
                {
                    timeout: 30000,
                    agent: new https.Agent({ rejectUnauthorized: false })
                }
            );

            const web3 = new Web3(httpProvider);

            await web3.eth.getBlockNumber();
            console.log(`[BLOCKCHAIN] Successfully connected to ${providerUrl}`);
            const flightContract = new web3.eth.Contract(contractABI, contractAddress);

            return { web3, flightContract };
        } catch (error) {
            console.log(`[BLOCKCHAIN] Failed to connect to ${providerUrl}: ${error.message}`);
        }
    }

    throw new Error("[BLOCKCHAIN] Could not connect to any RPC providers");
}

/*
const switchToNextProvider = () => {
    currentProviderIndex = (currentProviderIndex + 1) % RPC_PROVIDERS.length;
    const newProvider = RPC_PROVIDERS[currentProviderIndex];
    console.log(`[BLOCKCHAIN] Switching to next RPC provider: ${newProvider}`);

    // Re-initialize web3 and contract with new provider
    web3 = new Web3(newProvider);
    flightContract = new web3.eth.Contract(contractABI, contractAddress);

    return newProvider;
};

*/
// Retry function with exponential backoff
const retryWithBackoff = async (fn, maxRetries, initialDelay, label) => {
    let retries = 0;
    let delay = initialDelay;

    while (retries < maxRetries) {
        try {
            return await fn();
        } catch (error) {
            retries++;
            if (retries >= maxRetries) {
                console.error(`[RETRY ERROR] ${label}: All ${maxRetries} attempts failed. Last error: ${error.message}`);
                throw error;
            }

            // Switch provider on network errors
            // if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED' ||
            //   error.message.includes('timeout') || error.message.includes('connection')) {
            switchToNextProvider();
            //}

            // Calculate backoff with jitter
            const jitter = Math.random() * 0.3 + 0.85; // 0.85-1.15
            delay = Math.min(delay * 2 * jitter, 60000); // Cap at 1 minute

            console.log(`[RETRY] ${label}: Attempt ${retries}/${maxRetries} failed. Retrying in ${Math.round(delay / 1000)}s. Error: ${error.message}`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
};

// Function to update blockchain with flight data - returns promise with success status
const updateBlockchain = async (flightData) => {
    console.log(`[BLOCKCHAIN] Attempting to update blockchain for flight ${flightData.flightNumber}...`);

    try {
        const { web3, flightContract } = await getWorkingWeb3Instance();
        // Check if we have the necessary credentials
        if (!walletAddress || !privateKey) {
            console.log("[BLOCKCHAIN] Skipping blockchain update: Missing wallet credentials");
            throw new Error("Missing wallet credentials");
        }

        // Format the data for the smart contract
        const flightDataArray = [
            flightData.flightNumber.toString(),
            flightData.arrivalCity || "",
            flightData.departureCity || "",
            flightData.operatingAirline || "",
            flightData.arrivalGate || "",
            flightData.departureGate || "",
            flightData.flightStatus || "",
            flightData.equipmentModel || "Unknown"
        ];

        const utcTimesArray = [
            flightData.actualArrivalUTC || "",
            flightData.actualDepartureUTC || "",
            flightData.estimatedArrivalUTC || "",
            flightData.estimatedDepartureUTC || "",
            flightData.scheduledArrivalUTCDateTime || "",
            flightData.scheduledDepartureUTCDateTime || ""
        ];

        // Determine the status code and description
        let statusCode = flightData.statusCode || "NDPT";
        let statusDescription = flightData.flightStatus || "Unknown";

        const statusArray = [
            statusCode,
            statusDescription,
            flightData.outTimeUTC || "",
            flightData.offTimeUTC || "",
            flightData.onTimeUTC || "",
            flightData.inTimeUTC || ""
        ];

        // Log the data being sent to blockchain
        console.log(`[BLOCKCHAIN] Preparing blockchain update for flight ${flightData.flightNumber}`);

        // Create transaction data
        const txData = flightContract.methods.setFlightData(
            flightDataArray,
            utcTimesArray,
            statusArray
        ).encodeABI();

        // Get the nonce with retry
        const getNonce = async () => {
            return await Promise.race([
                web3.eth.getTransactionCount(walletAddress),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Nonce request timeout')), BLOCKCHAIN_TIMEOUT_MS)
                )
            ]);
        };

        const nonce = await retryWithBackoff(getNonce, MAX_BLOCKCHAIN_RETRIES, RETRY_DELAY_MS, 'Get nonce');
        console.log(`[BLOCKCHAIN] Got nonce: ${nonce}`);

        // Create the transaction object
        const txObject = {
            from: walletAddress,
            to: contractAddress,
            data: txData,
            gas: web3.utils.toHex(500000),
            gasPrice: web3.utils.toHex(web3.utils.toWei('10', 'gwei')),
            nonce: web3.utils.toHex(nonce)
        };

        // Sign the transaction
        console.log(`[BLOCKCHAIN] Signing transaction...`);
        const signTransaction = async () => {
            return await Promise.race([
                web3.eth.accounts.signTransaction(txObject, privateKey),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Signing request timeout')), BLOCKCHAIN_TIMEOUT_MS)
                )
            ]);
        };

        const signedTx = await retryWithBackoff(signTransaction, MAX_BLOCKCHAIN_RETRIES, RETRY_DELAY_MS, 'Sign transaction');

        // Send the transaction
        console.log(`[BLOCKCHAIN] Sending transaction...`);
        const sendTransaction = async () => {
            return await Promise.race([
                web3.eth.sendSignedTransaction(signedTx.rawTransaction),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Transaction send timeout')), BLOCKCHAIN_TIMEOUT_MS)
                )
            ]);
        };

        const receipt = await retryWithBackoff(sendTransaction, MAX_BLOCKCHAIN_RETRIES, RETRY_DELAY_MS, 'Send transaction');
        console.log(`[BLOCKCHAIN] Transaction successful: ${receipt.transactionHash}`);

        return {
            success: true,
            transactionHash: receipt.transactionHash
        };

    } catch (error) {
        console.error(`[BLOCKCHAIN ERROR] Failed to update blockchain: ${error.message}`);

        // Add to pending transactions queue for background retry if appropriate
        if (process.env.ENABLE_BACKGROUND_RETRIES === 'true') {
            pendingBlockchainTransactions.push({
                flightData,
                timestamp: Date.now(),
                retryCount: 0
            });
            console.log(`[BLOCKCHAIN] Added transaction to background retry queue (${pendingBlockchainTransactions.length} pending)`);
        }

        return {
            success: false,
            error: error.message
        };
    }
};

// Function to save flight data to MongoDB
const saveToMongoDB = async (flightData, blockchainResult, saveEvenIfBlockchainFailed = false) => {
    // Skip MongoDB save if blockchain failed and saveEvenIfBlockchainFailed is false
    if (!blockchainResult.success && !saveEvenIfBlockchainFailed && !ALLOW_NON_BLOCKCHAIN_SAVES) {
        console.log(`[MONGODB] Skipping MongoDB save for flight ${flightData.flightNumber} due to blockchain failure`);
        return {
            success: false,
            error: "Blockchain transaction required but failed"
        };
    }

    console.log(`[MONGODB] Saving flight ${flightData.flightNumber} data to MongoDB...`);

    try {
        // Add blockchain transaction info to flight data
        const enrichedFlightData = {
            ...flightData,
            blockchainStatus: blockchainResult.success ? 'success' : 'failed',
            blockchainTxHash: blockchainResult.transactionHash || null,
            blockchainError: blockchainResult.error || null,
            lastUpdated: new Date()
        };

        // Find existing record or create new one
        const filter = {
            flightNumber: flightData.flightNumber,
            flightOriginationDate: flightData.flightOriginationDate
        };

        const options = {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
        };

        // Use findOneAndUpdate to avoid race conditions
        const savedFlight = await FlightData.findOneAndUpdate(
            filter,
            { $set: enrichedFlightData },
            options
        );

        console.log(`[MONGODB] Successfully saved flight ${flightData.flightNumber} to MongoDB`);

        return {
            success: true,
            savedFlight
        };
    } catch (error) {
        console.error(`[MONGODB ERROR] Failed to save to MongoDB: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
};

// Background job to retry pending blockchain transactions
const startPendingTransactionsProcessor = () => {
    const job = schedule.scheduleJob('*/15 * * * *', async () => {
        if (pendingBlockchainTransactions.length === 0) {
            return;
        }

        console.log(`[BACKGROUND] Processing ${pendingBlockchainTransactions.length} pending blockchain transactions`);

        // Process oldest transactions first
        pendingBlockchainTransactions.sort((a, b) => a.timestamp - b.timestamp);

        const maxProcessPerRun = parseInt(process.env.MAX_PENDING_PROCESS_PER_RUN || '5', 10);
        const transactionsToProcess = pendingBlockchainTransactions.slice(0, maxProcessPerRun);

        for (const pendingTx of transactionsToProcess) {
            try {
                console.log(`[BACKGROUND] Retrying blockchain transaction for flight ${pendingTx.flightData.flightNumber}`);

                // Try blockchain update again
                const blockchainResult = await updateBlockchain(pendingTx.flightData);

                if (blockchainResult.success) {
                    console.log(`[BACKGROUND] Successfully processed pending transaction for flight ${pendingTx.flightData.flightNumber}`);

                    // Update MongoDB with successful blockchain result
                    await saveToMongoDB(pendingTx.flightData, blockchainResult, true);

                    // Remove from pending queue
                    const index = pendingBlockchainTransactions.indexOf(pendingTx);
                    if (index > -1) {
                        pendingBlockchainTransactions.splice(index, 1);
                    }
                } else {
                    // Increment retry count
                    pendingTx.retryCount++;

                    // If max retries reached, remove from queue
                    const maxRetries = parseInt(process.env.MAX_BACKGROUND_RETRIES || '10', 10);
                    if (pendingTx.retryCount >= maxRetries) {
                        console.log(`[BACKGROUND] Max retries (${maxRetries}) reached for flight ${pendingTx.flightData.flightNumber}, removing from queue`);

                        // Option: save to MongoDB anyway as a last resort if configured
                        if (process.env.SAVE_AFTER_MAX_RETRIES === 'true') {
                            await saveToMongoDB(pendingTx.flightData, blockchainResult, true);
                        }

                        // Remove from pending queue
                        const index = pendingBlockchainTransactions.indexOf(pendingTx);
                        if (index > -1) {
                            pendingBlockchainTransactions.splice(index, 1);
                        }
                    }
                }
            } catch (error) {
                console.error(`[BACKGROUND ERROR] Error processing pending transaction: ${error.message}`);
            }
        }

        console.log(`[BACKGROUND] Finished processing pending transactions. ${pendingBlockchainTransactions.length} remaining`);
    });

    console.log("[BACKGROUND] Started pending transactions processor - runs every 15 minutes");
    return job;
};

// Function to fetch from external API with blockchain-first approach
const fetchFromExternalAPI = async (flightNumber) => {
    console.log(`[API] Fetching flight ${flightNumber} data from external API...`);

    try {
        const response = await fetch(`https://rte.qa.asx.aws.ual.com/rte/flifo-dashboard/v1/flifo/getFlightStatus?fltNbr=${flightNumber}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
            agent: agent,
            timeout: 30000 // 30 second timeout
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch flight data. Status code: ${response.status}`);
        }

        const data = await response.json();
        console.log(`[API] Successfully fetched flight ${flightNumber} data`);

        // Process the data similar to your original implementation
        const segment = data.FlightLegs?.[0]?.OperationalFlightSegments?.[0];
        const scheduledSegment = data.FlightLegs?.[0]?.ScheduledFlightSegments?.[0];

        if (!segment || !scheduledSegment) {
            throw new Error("No flight data found");
        }

        // Flight Status logic
        const flightStatusData = segment.FlightStatuses?.find((status) => status.StatusType === "LegStatus");
        const flightStatus = flightStatusData?.Description || "Unknown";
        const statusCode = flightStatusData?.Code || "Unknown";
        const isCanceled = statusCode === "CNCL";

        const operatingAirline = segment.OperatingAirline?.IATACode || "Unknown";
        const flightOriginationDate = data.Flight?.FlightOriginationDate || new Date().toISOString().split('T')[0];

        // Flight phase logic
        const flightIndicators = segment.Characteristic?.reduce((acc, char) => {
            if (["FltOutInd", "FltOffInd", "FltOnInd", "FltInInd", "FltCnclInd"].includes(char.Code)) {
                acc[char.Code] = char.Value === "1";
            }
            return acc;
        }, {});

        let phase = "not_departed";
        if (flightIndicators?.FltInInd) phase = "in";
        else if (flightIndicators?.FltOnInd) phase = "on";
        else if (flightIndicators?.FltOffInd) phase = "off";
        else if (flightIndicators?.FltOutInd) phase = "out";

        // Prepare flight data
        const flightData = {
            flightNumber: data.Flight.FlightNumber,
            flightOriginationDate,
            operatingAirline,
            estimatedArrivalUTC: segment.EstimatedArrivalUTCTime,
            estimatedDepartureUTC: segment.EstimatedDepartureUTCTime,
            actualDepartureUTC: segment.ActualDepartureUTCTime || "",
            actualArrivalUTC: segment.ActualArrivalUTCTime || "",
            outTimeUTC: segment.OutUTCTime,
            offTimeUTC: segment.OffUTCTime,
            onTimeUTC: segment.OnUTCTime,
            inTimeUTC: segment.InUTCTime,
            arrivalCity: segment.ArrivalAirport.Address.City,
            departureCity: segment.DepartureAirport.Address.City,
            departureGate: segment.DepartureGate || "TBD",
            arrivalGate: segment.ArrivalGate || "TBD",
            departureTerminal: segment.DepartureTerminal || "TBD",
            arrivalTerminal: segment.ArrivalTerminal || "TBD",
            flightStatus,
            statusCode,
            equipmentModel: segment.Equipment.Model.Description,
            phase,
            baggageClaim: segment.ArrivalBagClaimUnit?.trim() || "TBD",
            departureDelayMinutes: segment.DepartureDelayMinutes ? parseInt(segment.DepartureDelayMinutes, 10) : 0,
            arrivalDelayMinutes: segment.ArrivalDelayMinutes ? parseInt(segment.ArrivalDelayMinutes, 10) : 0,
            boardingTime: segment.BoardTime,
            isCanceled,
            scheduledArrivalUTCDateTime: scheduledSegment?.ArrivalUTCDateTime,
            scheduledDepartureUTCDateTime: scheduledSegment?.DepartureUTCDateTime,
        };

        // Blockchain-first approach: Update blockchain
        console.log(`[PROCESS] Starting blockchain-first approach for flight ${flightNumber}`);
        const blockchainResult = await updateBlockchain(flightData);

        // Save to MongoDB based on configuration
        const mongoResult = await saveToMongoDB(
            flightData,
            blockchainResult,
            ALLOW_NON_BLOCKCHAIN_SAVES
        );

        // Return the combined result
        return {
            ...flightData,
            blockchainStatus: blockchainResult.success ? 'success' : 'failed',
            blockchainTxHash: blockchainResult.transactionHash || null,
            blockchainError: blockchainResult.error || null,
            mongoDBStatus: mongoResult.success ? 'success' : 'failed',
            dataSource: 'external_api'
        };

    } catch (error) {
        console.error(`[API ERROR] Error in fetchFromExternalAPI for flight ${flightNumber}: ${error.message}`);
        throw error;
    }
};

// Search flight data from both blockchain and MongoDB
export const searchFlight = async (req, res) => {
    try {
        const { flightNumber, flightDate } = req.body;
        console.log(`[REQUEST] Search request for flight ${flightNumber} on date ${flightDate}`);

        // Format date if provided, otherwise use current date
        const searchDate = flightDate ? new Date(flightDate) : new Date();
        const formattedDate = searchDate.toISOString().split('T')[0];

        // Try to get data from MongoDB first (faster)
        const dbFlight = await FlightData.findOne({
            flightNumber: parseInt(flightNumber),
            flightOriginationDate: { $regex: formattedDate }
        }).sort({ updatedAt: -1 });

        // If found in MongoDB, return the data
        if (dbFlight) {
            console.log(`[SEARCH] Found flight ${flightNumber} in MongoDB`);
            return res.status(200).json({
                source: 'mongodb',
                data: dbFlight
            });
        }

        // If not in MongoDB, try to get from blockchain
        try {
            console.log(`[SEARCH] Flight ${flightNumber} not found in MongoDB, checking blockchain...`);
            // Check if user has a valid subscription
            const checkSubscription = async () => {
                return await Promise.race([
                    flightContract.methods.subscriptions(walletAddress).call(),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Subscription check timeout')), BLOCKCHAIN_TIMEOUT_MS)
                    )
                ]);
            };

            const subscription = await retryWithBackoff(
                checkSubscription,
                MAX_BLOCKCHAIN_RETRIES,
                RETRY_DELAY_MS,
                'Check subscription'
            );

            const currentTimestamp = Math.floor(Date.now() / 1000);

            if (subscription > currentTimestamp) {
                // Get flight data from blockchain
                console.log(`[BLOCKCHAIN] Retrieving flight ${flightNumber} data from blockchain...`);

                const getBlockchainFlight = async () => {
                    return await Promise.race([
                        flightContract.methods.getFlightData(flightNumber.toString()).call({
                            from: walletAddress
                        }),
                        new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('Blockchain data fetch timeout')), BLOCKCHAIN_TIMEOUT_MS)
                        )
                    ]);
                };

                const blockchainFlight = await retryWithBackoff(
                    getBlockchainFlight,
                    MAX_BLOCKCHAIN_RETRIES,
                    RETRY_DELAY_MS,
                    'Get blockchain flight data'
                );

                if (blockchainFlight && blockchainFlight.flightNumber) {
                    console.log(`[BLOCKCHAIN] Successfully retrieved flight ${flightNumber} from blockchain`);

                    // Get UTC times
                    const getUtcTimes = async () => {
                        return await Promise.race([
                            flightContract.methods.UtcTimes(flightNumber.toString()).call(),
                            new Promise((_, reject) =>
                                setTimeout(() => reject(new Error('UTC times fetch timeout')), BLOCKCHAIN_TIMEOUT_MS)
                            )
                        ]);
                    };

                    const utcTimes = await retryWithBackoff(
                        getUtcTimes,
                        MAX_BLOCKCHAIN_RETRIES,
                        RETRY_DELAY_MS,
                        'Get UTC times'
                    );

                    // Get status
                    const getStatus = async () => {
                        return await Promise.race([
                            flightContract.methods.getFlightStatus(flightNumber.toString()).call({
                                from: walletAddress
                            }),
                            new Promise((_, reject) =>
                                setTimeout(() => reject(new Error('Flight status fetch timeout')), BLOCKCHAIN_TIMEOUT_MS)
                            )
                        ]);
                    };

                    const status = await retryWithBackoff(
                        getStatus,
                        MAX_BLOCKCHAIN_RETRIES,
                        RETRY_DELAY_MS,
                        'Get flight status'
                    );

                    // Format data
                    const flightData = {
                        flightNumber: parseInt(blockchainFlight.flightNumber),
                        flightOriginationDate: formattedDate,
                        operatingAirline: blockchainFlight.operatingAirline,
                        departureCity: blockchainFlight.departureCity,
                        arrivalCity: blockchainFlight.arrivalCity,
                        departureGate: blockchainFlight.departureGate,
                        arrivalGate: blockchainFlight.arrivalGate,
                        flightStatus: status,
                        equipmentModel: blockchainFlight.equipmentModel,
                        estimatedArrivalUTC: utcTimes.estimatedArrivalUTC,
                        estimatedDepartureUTC: utcTimes.estimatedDepartureUTC,
                        actualArrivalUTC: utcTimes.ArrivalUTC,
                        actualDepartureUTC: utcTimes.DepartureUTC,
                        scheduledArrivalUTCDateTime: utcTimes.scheduledArrivalUTC,
                        scheduledDepartureUTCDateTime: utcTimes.scheduledDepartureUTC,
                        blockchainStatus: 'success',
                        retrievedFrom: 'blockchain'
                    };

                    // Save to MongoDB for future queries with blockchain info
                    console.log(`[MONGODB] Saving blockchain-retrieved flight ${flightNumber} to MongoDB`);
                    const newFlight = new FlightData(flightData);
                    await newFlight.save();

                    return res.status(200).json({
                        source: 'blockchain',
                        data: flightData
                    });
                }
            } else {
                // If no subscription, note this in the response
                console.log(`[BLOCKCHAIN] No valid blockchain subscription for accessing flight ${flightNumber}`);
            }
        } catch (blockchainError) {
            console.error(`[BLOCKCHAIN ERROR] Error fetching flight ${flightNumber} from blockchain:`, blockchainError.message);
            // Continue to external API if blockchain fails
        }

        // If not found in either database, fetch from external API
        console.log(`[SEARCH] Flight ${flightNumber} not found in local sources, fetching from external API...`);
        try {
            const apiResponse = await fetchFromExternalAPI(parseInt(flightNumber));
            return res.status(200).json({
                source: 'external_api',
                data: apiResponse
            });
        } catch (apiError) {
            console.error(`[API ERROR] Failed to fetch flight ${flightNumber} from external API:`, apiError.message);
            throw apiError;
        }

    } catch (error) {
        console.error(`[ERROR] Error searching flight data for ${req.body?.flightNumber}:`, error.message);
        if (error.response) {
            console.error('[ERROR] Error response:', error.response.data);
        }
        res.status(502).json({
            error: "Failed to fetch flight data",
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

// Get  flight data by date range
export const getHistoricalFlights = async (req, res) => {
    try {
        const { startDate, endDate, flightNumber } = req.query;
        console.log(`[HISTORY] Historical flight data request: ${flightNumber || 'all flights'} from ${startDate || 'any'} to ${endDate || 'any'}`);

        const query = {};

        // Add date range if provided
        if (startDate && endDate) {
            query.flightOriginationDate = {
                $gte: new Date(startDate).toISOString().split('T')[0],
                $lte: new Date(endDate).toISOString().split('T')[0]
            };
        } else if (startDate) {
            query.flightOriginationDate = {
                $gte: new Date(startDate).toISOString().split('T')[0]
            };
        } else if (endDate) {
            query.flightOriginationDate = {
                $lte: new Date(endDate).toISOString().split('T')[0]
            };
        }

        // Add flight number if provided
        if (flightNumber) {
            query.flightNumber = parseInt(flightNumber);
        }

        // Query MongoDB for historical data
        const flights = await FlightData.find(query)
            .sort({ flightOriginationDate: -1, updatedAt: -1 })
            .limit(100); // Limit to 100 results

        console.log(`[HISTORY] Found ${flights.length} historical flights matching criteria`);
        res.status(200).json(flights);

    } catch (error) {
        console.error(`[HISTORY ERROR] Error fetching historical flight data:`, error.message);
        res.status(500).json({
            error: "Failed to fetch historical flight data",
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
};


// Schedule periodic flight status updates
export const startFlightStatusMonitoring = () => {
    // Run every 5 minutes
    const job = schedule.scheduleJob('*/5 * * * *', async () => {
        try {
            console.log("[SCHEDULER] Running scheduled flight status update check...");

            // Get flights updated in the last 24 hours
            const oneDayAgo = new Date();
            oneDayAgo.setDate(oneDayAgo.getDate() - 1);

            const recentFlights = await FlightData.find({
                updatedAt: { $gte: oneDayAgo }
            }).sort({ updatedAt: -1 });

            console.log(`[SCHEDULER] Found ${recentFlights.length} recent flights to check for updates`);

            // Track results
            const results = {
                total: recentFlights.length,
                updated: 0,
                failed: 0,
                skipped: 0
            };

            // Check each flight for updates
            for (const flight of recentFlights) {
                try {
                    // Skip already arrived flights
                    if (flight.phase === "in" || flight.statusCode === "IN") {
                        console.log(`[SCHEDULER] Skipping already arrived flight ${flight.flightNumber} for ${flight.flightOriginationDate}`);
                        results.skipped++;
                        continue;
                    }

                    // Fetch latest data with blockchain-first approach
                    console.log(`[SCHEDULER] Updating flight ${flight.flightNumber} for ${flight.flightOriginationDate}`);
                    await fetchFromExternalAPI(flight.flightNumber);
                    console.log(`[SCHEDULER] Successfully updated flight ${flight.flightNumber} for ${flight.flightOriginationDate}`);
                    results.updated++;

                } catch (flightError) {
                    console.error(`[SCHEDULER ERROR] Error updating flight ${flight.flightNumber}:`, flightError.message);
                    results.failed++;
                }
            }

            console.log(`[SCHEDULER] Scheduled flight status update completed. Results: ${JSON.stringify(results)}`, new Date());

        } catch (error) {
            console.error(`[SCHEDULER ERROR] Error in scheduled flight status update:`, error.message);
        }
    });

    console.log("[SCHEDULER] Flight status monitoring started - checking every 5 minutes");
    return job;
};

// Initialize and start monitoring
startFlightStatusMonitoring();

export default {
    searchFlight,
    getHistoricalFlights,
    updateBlockchain,
    fetchFromExternalAPI,
};