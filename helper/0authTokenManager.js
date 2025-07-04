import logger from "../utils/Logger.js";


class TokenRefresher {
    constructor(config) {
        this.tokenUrl = config.tokenUrl;
        this.credentials = config.credentials;
        this.currentToken = null;
        this.tokenExpiry = null;
        this.refreshInterval = null;
        this.isRefreshing = false;
        this.refreshPromise = null;
        
        // Start token refresh immediately
        this.startTokenRefresh();
    }

    async refreshToken() {
        // Prevent multiple simultaneous refresh attempts
        if (this.isRefreshing) {
            return this.refreshPromise;
        }

        this.isRefreshing = true;
        this.refreshPromise = this._doRefreshToken();
        
        try {
            const token = await this.refreshPromise;
            return token;
        } finally {
            this.isRefreshing = false;
            this.refreshPromise = null;
        }
    }

    async _doRefreshToken() {
        try {
            logger.info('Refreshing token...');
            
            const response = await fetch(this.tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams(this.credentials)
            });

            if (!response.ok) {
                throw new Error(`Token refresh failed: ${response.status}`);
            }

            const tokenData = await response.json();
            
            this.currentToken = tokenData.access_token;
            this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000);
            
            logger.info(`Token refreshed successfully. Expires in ${tokenData.expires_in} seconds`);
            // logger.info(`New token: ${this.currentToken.substring(0, 50)}...`);
            
            return this.currentToken;
        } catch (error) {
            logger.error('Error refreshing token:', error);
            return null;
        }
    }

    // Get current valid token - wait for token if not available
    async getToken() {
        // If we have a valid token, return it
        if (this.currentToken && Date.now() < this.tokenExpiry) {
            return this.currentToken;
        }

        // If token is expired or not available, refresh it
        logger.info('Token expired or not available, refreshing...');
        return await this.refreshToken();
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
        await this.refreshToken();
        
        // Refresh token every 50 minutes (10 minutes before the 1-hour expiry)
        this.refreshInterval = setInterval(async () => {
            await this.refreshToken();
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