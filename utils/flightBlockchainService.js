import ContractAbi from "./abi.js";
import dotenv from "dotenv";
import { createFlightBlockchainService } from "./contract.js";
dotenv.config();
// Environment configuration
const contractABI = ContractAbi;
const contractAddress = process.env.CONTRACT_ADDRESS;
const walletAddress = process.env.WALLET_ADDRESS;
const privateKey = process.env.PRIVATE_KEY;
const blockchainProvider = process.env.PRIMARY_CAMINO_PROVIDER;

//Create blockchain service instance
const blockchainService = createFlightBlockchainService(
  blockchainProvider,
  contractAddress,
  contractABI,
  privateKey,
  walletAddress
);

// Optional: Check connectivity before operations
const isConnected = await blockchainService.diagnosticContractCheck();

if (!isConnected) {
  console.error("Contract connectivity check failed");
} else console.log("Blockchain service initialized successfully");

export default blockchainService;
