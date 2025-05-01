import { addFlightSubscription } from "../../controllers/flight.js";
import blockchainService from "../../utils/flightBlockchainService.js";
import request from "supertest";
import app from "../../app.js";

jest.mock("../../model/flight.js");
jest.mock("../../model/flight-subscription.js");
jest.mock("../../utils/flightBlockchainService.js");

describe("addFlightSubscription", () => {
  it("should return 400 if required parameters are missing", async () => {
    const req = { body: {} };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await addFlightSubscription(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Missing required parameters",
      details: expect.any(Object),
    });
  });

  it("should return 404 if flight data is not found", async () => {
    const req = {
      body: {
        flightNumber: "123",
        scheduledDepartureDate: "2023-10-01",
        departureAirport: "JFK",
        carrierCode: "UA",
        walletAddress: "0x123",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    jest
      .spyOn(blockchainService, "checkFlightExistence")
      .mockResolvedValue(false);

    await addFlightSubscription(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: "Flight data not found",
      details: expect.any(Object),
    });
  });
});

describe("Flight Routes", () => {
  it("should return 400 for missing parameters in /add-flight-subscription", async () => {
    const response = await request(app)
      .post("/v1/flights/add-flight-subscription")
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty(
      "error",
      "Missing required parameters"
    );
  });

  it("should return 404 for non-existent flight in /get-flight-status", async () => {
    const response = await request(app).get(
      "/v1/flights/get-flight-status/123"
    );

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty(
      "errorMessage",
      "Flight data not found."
    );
  });
});
