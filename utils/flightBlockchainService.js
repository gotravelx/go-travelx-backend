import ContractAbi from "./abi.js";
import dotenv from "dotenv";
import { createFlightBlockchainService } from "./contract.js";
import customLogger from "./logger.js";
dotenv.config();
// Environment configuration
const contractABI = ContractAbi;
const contractAddress = process.env.CONTRACT_ADDRESS;
const walletAddress = process.env.WALLET_ADDRESS;
const privateKey = process.env.PRIVATE_KEY;
const blockchainProvider = process.env.PRIMARY_CAMINO_PROVIDER;

const blockchainService = createFlightBlockchainService(
  blockchainProvider,
  contractAddress,
  contractABI,
  privateKey,
  walletAddress
);

const isConnected = await blockchainService.diagnosticContractCheck();

if (!isConnected) {
  customLogger.error("Contract connectivity check failed");
} else customLogger.info("✅ Blockchain service initialized successfully");

export default blockchainService;
