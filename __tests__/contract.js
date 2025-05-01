import { FlightBlockchainService } from "../../utils/contract.js";
import ethers from "ethers";

jest.mock("ethers");

describe("FlightBlockchainService", () => {
  it("should initialize with correct parameters", () => {
    const providerUrl = "http://localhost:8545";
    const contractAddress = "0x123";
    const contractABI = [];
    const privateKey = "0xabc";
    const walletAddress = "0x456";

    const service = new FlightBlockchainService(
      providerUrl,
      contractAddress,
      contractABI,
      privateKey,
      walletAddress
    );

    expect(service.provider).toBeInstanceOf(ethers.providers.JsonRpcProvider);
    expect(service.contract).toBeInstanceOf(ethers.Contract);
    expect(service.wallet).toBeInstanceOf(ethers.Wallet);
  });

  it("should throw an error if wallet is not configured for transactions", async () => {
    const service = new FlightBlockchainService(
      "http://localhost:8545",
      "0x123",
      [],
      null,
      "0x456"
    );

    await expect(
      service.insertFlightDetails([], [], [], [], [])
    ).rejects.toThrow("Wallet not configured for transactions");
  });
});
