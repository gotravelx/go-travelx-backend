import scheduleJob from "node-schedule";
import nodemailer from "nodemailer";
import customLogger from "../utils/Logger.js";
import { fetchFlightData } from "./UnitedApiController.js";

// Environment variables
const HEALTH_ENDPOINT = process.env.API;
const RTE_EMAIL = process.env.RTE_APP_SUPPORT_EMAIL;
const SUPPORT_EMAIL = process.env.GOTRAVELX_APP_SUPPORT_EMAIL;
const HEALTH_ENV = process.env.HEALTH_ENV || "dev";


// Configuration based on environment
const IS_PROD = HEALTH_ENV === "prod";
const IS_LOCAL = HEALTH_ENV === "local";

const POLLING_CRON =
    IS_PROD
        ? "* * * * *"        // PROD: every 1 minute
        : IS_LOCAL
            ? "*/3 * * * *"  // LOCAL: every 3 minutes
            : "*/10 * * * *"; // DEV / QA / TEST: every 10 minutes

const ALERT_INTERVAL_MS = IS_PROD
    ? 3 * 60 * 1000      // PROD: alert every 3 minutes
    : IS_LOCAL
        ? 3 * 60 * 1000  // LOCAL: alert every 3 minutes
        : 30 * 60 * 1000; // DEV / QA / TEST: alert every 30 minutes



// State tracking
let consecutiveFailures = 0;
let lastAlertTime = 0;

// Email Transporter (Aligned with Zoho configuration)
const transporter = nodemailer.createTransport({
    // host: "smtp.zoho.com",
    // port: 465,
    // secure: true,
    service: "gmail",
    auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSCODE,
    },
});

const sendAlertEmail = async (errorDetails) => {
    if (!RTE_EMAIL || !SUPPORT_EMAIL) {
        customLogger.error("[HEALTH-CHECK] Missing alert email recipients in env vars.");
        return;
    }

    const subject = `[ALERT] Flight Status Service DOWN - ${HEALTH_ENV.toUpperCase()}`;
    const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #d32f2f;">CRITICAL ALERT: Flight Status Service Unreachable</h2>
      <p><strong>Environment:</strong> ${HEALTH_ENV.toUpperCase()}</p>
      <p><strong>Endpoint:</strong> ${HEALTH_ENDPOINT}</p>
      <p><strong>Time:</strong> ${new Date().toISOString()}</p>
      <p><strong>Consecutive Failures:</strong> ${consecutiveFailures}</p>
      <div style="background-color: #f5f5f5; padding: 10px; margin-top: 10px; border-left: 4px solid #d32f2f;">
        <strong>Error Details:</strong>
        <pre>${errorDetails}</pre>
      </div>
      <p style="margin-top: 20px; font-size: 0.9em; color: #666;">
        This is an automated alert. Please investigate immediately.
      </p>
    </div>
  `;

    const mailOptions = {
        from: `"GoTravelX Monitor" <${process.env.SMTP_EMAIL}>`,
        to: RTE_EMAIL,
        cc: SUPPORT_EMAIL,
        subject: subject,
        html: htmlContent,
    };

    try {
        await transporter.sendMail(mailOptions);
        customLogger.info(`[HEALTH-CHECK] Alert email sent to ${RTE_EMAIL} and ${SUPPORT_EMAIL}`);
    } catch (error) {
        customLogger.error(`[HEALTH-CHECK] Failed to send alert email: ${error.message}`);
    }
};

const isCriticalError = (error) => {
    // HTTP status errors
    if (error.status) {
        // Only alert on Gateway/Proxy errors
        if ([502, 503, 504].includes(error.status)) return true;
    }

    // Network / timeout / DNS
    const criticalCodes = [
        "ECONNABORTED",
        "ECONNREFUSED",
        "ENOTFOUND",
        "ETIMEDOUT",
    ];
    if (criticalCodes.includes(error.code)) return true;

    // TLS / SSL issues
    const sslCodes = [
        "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
        "CERT_HAS_EXPIRED",
        "DEPTH_ZERO_SELF_SIGNED_CERT",
        "ERR_TLS_CERT_ALTNAME_INVALID",
    ];
    if (sslCodes.includes(error.code)) return true;

    // Fallback: timeout text
    if (typeof error.message === "string") {
        const lowerMsg = error.message.toLowerCase();
        if (lowerMsg.includes("timeout")) {
            return true;
        }
    }

    return false;
};

// ================= HEALTH MONITOR =================
export const startHealthCheckMonitoring = () => {
    if (!HEALTH_ENDPOINT) {
        customLogger.warn("[HEALTH-CHECK] Health monitoring disabled - HEALTH_ENDPOINT not configured");
        return;
    }

    customLogger.info(`[HEALTH-CHECK] Health monitoring started - Polling: ${POLLING_CRON}, Environment: ${HEALTH_ENV}`);

    scheduleJob.scheduleJob(POLLING_CRON, async () => {
        try {
            customLogger.info("[HEALTH-CHECK] ----------------------------------------");
            customLogger.info("[HEALTH-CHECK] Starting scheduled health check...");
            await processFlightsHealthCheck();

            if (consecutiveFailures > 0) {
                customLogger.info(`[HEALTH-CHECK] Service recovered after ${consecutiveFailures} failures`);
                consecutiveFailures = 0;
                lastAlertTime = 0;
            }
        } catch (error) {
            customLogger.error(`[HEALTH-CHECK] Health check failed: ${error.message}`, {
                status: error.status,
                code: error.code,
                stack: error.stack
            });

            if (!isCriticalError(error)) {
                customLogger.info("[HEALTH-CHECK] Non-critical error, skipping alert");
                return;
            }

            consecutiveFailures++;
            const now = Date.now();

            if (
                consecutiveFailures >= 3 &&
                now - lastAlertTime >= ALERT_INTERVAL_MS
            ) {
                customLogger.error(`[HEALTH-CHECK] Alerting due to ${consecutiveFailures} consecutive failures`);
                await sendAlertEmail(error.message || error.toString());
                lastAlertTime = now;
            } else {
                customLogger.warn(`[HEALTH-CHECK] Failure ${consecutiveFailures}/3 - Not alerting yet`);
            }
        }
    });
};


const processFlightsHealthCheck = async () => {

    const today = new Date().toISOString().split("T")[0];
    const response = await fetchFlightData(2053, {
        departureDate: today,
        carrier: "UA",
        throwOnError: true,
    });


    customLogger.info(`[HEALTH-CHECK] Probe response received. Success: ${response?.success}`);

    if (!response || typeof response !== "object") {
        throw new Error("No valid response from Flight Status service");
    }

    if (response.success === false) {
        customLogger.warn(
            `[HEALTH] Probe flight business failure ignored: ${response.errorMessage}`
        );
        return true;
    }

    return true;
};