import { startHealthCheckMonitoring } from "../controllers/HealthCheckController.js";
import scheduleJob from "node-schedule";
import axios from "axios";
import nodemailer from "nodemailer";

// Mock dependencies
jest.mock("node-schedule");
jest.mock("axios");
jest.mock("nodemailer");

describe("HealthCheckController", () => {
    let mockSendMail;
    let mockScheduleJob;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mocks
        mockSendMail = jest.fn().mockResolvedValue({ messageId: "test-id" });
        nodemailer.createTransport.mockReturnValue({ sendMail: mockSendMail });

        mockScheduleJob = jest.fn();
        scheduleJob.scheduleJob.mockImplementation((cron, callback) => {
            mockScheduleJob = callback; // Capture the callback to run it manually
        });

        // Mock Env Vars
        process.env.FLIGHT_STATUS_HEALTH_ENDPOINT = "http://test-health.com";
        process.env.RTE_APP_SUPPORT_EMAIL = "rte@test.com";
        process.env.GOTRAVELX_APP_SUPPORT_EMAIL = "support@test.com";
        process.env.HEALTH_ENV = "dev";
    });

    test("should schedule a job on start", () => {
        startHealthCheckMonitoring();
        expect(scheduleJob.scheduleJob).toHaveBeenCalled();
    });

    test("should not alert on success", async () => {
        axios.get.mockResolvedValue({ status: 200 });
        startHealthCheckMonitoring();

        // Run the job
        await mockScheduleJob();

        expect(axios.get).toHaveBeenCalledWith("http://test-health.com", expect.any(Object));
        expect(mockSendMail).not.toHaveBeenCalled();
    });

    test("should alert after 3 consecutive failures", async () => {
        axios.get.mockRejectedValue(new Error("Service Unavailable"));
        startHealthCheckMonitoring();

        // Fail 1
        await mockScheduleJob();
        expect(mockSendMail).not.toHaveBeenCalled();

        // Fail 2
        await mockScheduleJob();
        expect(mockSendMail).not.toHaveBeenCalled();

        // Fail 3 -> Should Alert
        await mockScheduleJob();
        expect(mockSendMail).toHaveBeenCalledTimes(1);
        expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
            to: "rte@test.com",
            subject: expect.stringContaining("[ALERT]")
        }));
    });

    test("should throttle alerts", async () => {
        axios.get.mockRejectedValue(new Error("Service Unavailable"));
        startHealthCheckMonitoring();

        // Trigger first alert (3 failures)
        await mockScheduleJob();
        await mockScheduleJob();
        await mockScheduleJob();
        expect(mockSendMail).toHaveBeenCalledTimes(1);

        // Next failure immediately -> Should NOT alert (throttled)
        await mockScheduleJob();
        expect(mockSendMail).toHaveBeenCalledTimes(1);
    });
});
