import ContractAbi from "./Abi.js";
import dotenv from "dotenv";
import { createFlightBlockchainService } from "./Contract.js";
import logger from "./Logger.js";
dotenv.config();


/* ================= BLOCKCHAIN ENVIRONMENT SETUP =================*/ 
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
  logger.error("Contract connectivity check failed");
} else logger.info("Blockchain service initialized successfully");

export default blockchainService;
