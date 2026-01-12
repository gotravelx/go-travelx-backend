import fetch from "node-fetch";
import https from "https";
import logger from "../utils/Logger.js";

const agent = new https.Agent({
    rejectUnauthorized: false,
});

class TokenRefresher {
    constructor(config) {
        this.tokenUrl = config.tokenUrl;
        this.credentials = config.credentials;
        this.currentToken = null;
        this.tokenExpiry = null;
        this.refreshInterval = null;
        this.isRefreshing = false;
        this.refreshPromise = null;
        this.maxRetries = config.maxRetries || 5;
        this.retryDelayMs = config.retryDelayMs || 3000;
        this.timeoutMs = config.timeoutMs || 60000;

        // Start token refresh immediately
        this.startTokenRefresh();
    }

    async refreshToken() {
        // Prevent multiple simultaneous refresh attempts
        if (this.isRefreshing) {
            return this.refreshPromise;
        }

        this.isRefreshing = true;
        this.refreshPromise = this._doRefreshTokenWithRetry();

        try {
            const token = await this.refreshPromise;
            return token;
        } finally {
            this.isRefreshing = false;
            this.refreshPromise = null;
        }
    }

    async _doRefreshTokenWithRetry() {
        let lastError = null;

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

            try {
                logger.info(`Refreshing token... (attempt ${attempt}/${this.maxRetries})`);

                const response = await fetch(this.tokenUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams(this.credentials),
                    signal: controller.signal,
                    agent: agent
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Token refresh failed: ${response.status} - ${errorText}`);
                }

                const tokenData = await response.json();

                if (!tokenData.access_token) {
                    throw new Error('No access_token in response');
                }

                this.currentToken = tokenData.access_token;
                this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000);

                logger.info(`Token refreshed successfully. Expires in ${tokenData.expires_in} seconds`);

                return this.currentToken;
            } catch (error) {
                lastError = error;
                const isTimeout = error.name === 'AbortError' || error.code === 'ETIMEDOUT' || error.message.includes('timeout');
                const errorMsg = isTimeout ? 'Timeout' : error.message;

                logger.error(`Error refreshing token (attempt ${attempt}/${this.maxRetries}): ${errorMsg}`);

                if (attempt < this.maxRetries) {
                    const delay = this.retryDelayMs * Math.pow(2, attempt - 1);
                    logger.info(`Retrying in ${delay}ms...`);
                    await this._sleep(delay);
                }
            } finally {
                clearTimeout(timeoutId);
            }
        }

        logger.error(`Token refresh failed after ${this.maxRetries} attempts. Last error:`, lastError);
        return null;
    }

    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Get current valid token - wait for token if not available
    async getToken() {
        // If we have a valid token, return it
        if (this.currentToken && Date.now() < this.tokenExpiry) {
            return this.currentToken;
        }

        // If token is expired or not available, refresh it
        logger.info('Token expired or not available, refreshing...');
        const token = await this.refreshToken();

        if (!token) {
            logger.error('CRITICAL: Unable to obtain token after all retry attempts');
        }

        return token;
    }

    // Synchronous method to get token if available (for backward compatibility)
    getTokenSync() {
        if (this.currentToken && Date.now() < this.tokenExpiry) {
            return this.currentToken;
        } else {
            logger.info('Token is expired or not available');
            return null;
        }
    }

    async startTokenRefresh() {
        // Get initial token
        try {
            await this.refreshToken();
        } catch (error) {
            logger.error('Initial token fetch failed:', error);
        }

        // Refresh token every 50 minutes (10 minutes before the 1-hour expiry)
        this.refreshInterval = setInterval(async () => {
            try {
                await this.refreshToken();
            } catch (error) {
                logger.error('Interval token refresh failed:', error);
            }
        }, 50 * 60 * 1000); // 50 minutes in milliseconds

        logger.info('Token refresh started - will refresh every 50 minutes');
    }

    // Stop token refresh
    stop() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
            logger.info('Token refresh stopped');
        }
    }
}

export default TokenRefresher;