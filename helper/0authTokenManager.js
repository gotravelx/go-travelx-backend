import fs from "fs";
import path from "path";
import logger from "../utils/Logger.js";
import tokenConfig from "../config/0authTokenConfig.js";

const TOKEN_CACHE_FILE = path.join(process.cwd(), ".token_cache.json");

class TokenRefresher {
    constructor(config) {
        this.tokenUrl = config.tokenUrl;
        this.credentials = config.credentials;
        this.currentToken = null;
        this.tokenExpiry = null;
        this.isRefreshing = false;
        this.refreshPromise = null;

        // Load token from cache if available
        this._loadTokenFromCache();

        // Initial refresh if needed
        this.getToken().catch(err => logger.error("Initial token fetch failed:", err));
    }

    _loadTokenFromCache() {
        try {
            if (fs.existsSync(TOKEN_CACHE_FILE)) {
                const cache = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, "utf8"));
                if (cache.token && cache.expiry > Date.now()) {
                    this.currentToken = cache.token;
                    this.tokenExpiry = cache.expiry;
                    logger.info(`Loaded token from cache. Expires in ${Math.round((cache.expiry - Date.now()) / 1000)} seconds`);
                }
            }
        } catch (error) {
            logger.error("Error loading token from cache:", error);
        }
    }

    _saveTokenToCache(token, expiry) {
        try {
            const cache = { token, expiry };
            fs.writeFileSync(TOKEN_CACHE_FILE, JSON.stringify(cache), "utf8");
            logger.info("Token saved to cache file");
        } catch (error) {
            logger.error("Error saving token to cache:", error);
        }
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
            logger.info('Refreshing token from external API...');

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

            this._saveTokenToCache(this.currentToken, this.tokenExpiry);

            logger.info(`Token refreshed successfully. Expires in ${tokenData.expires_in} seconds`);

            return this.currentToken;
        } catch (error) {
            logger.error('Error refreshing token:', error);
            return null;
        }
    }

    // Get current valid token - wait for token if not available
    async getToken() {
        // If we have a valid token (with 30s buffer), return it
        if (this.currentToken && Date.now() < (this.tokenExpiry - 30000)) {
            return this.currentToken;
        }

        // If token is expired or not available, refresh it
        logger.info('Token expired or not available, refreshing...');
        return await this.refreshToken();
    }
}

// Export a singleton instance
const tokenRefresher = new TokenRefresher(tokenConfig);
export default tokenRefresher;