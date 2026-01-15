import NodeCache from "node-cache";
import logger from "../utils/Logger.js";

// Standard TTL: 10 minutes (600s), Check period: 2 minutes (120s)
const cache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

class CacheService {
    constructor() {
        this.stats = {
            hits: 0,
            misses: 0,
        };
    }

    /**
     * Get value from cache
     * @param {string} key
     * @returns {any|undefined}
     */
    get(key) {
        const value = cache.get(key);
        if (value !== undefined) {
            this.stats.hits++;
            // logger.debug(`[CACHE] Hit: ${key}`);
        } else {
            this.stats.misses++;
            // logger.debug(`[CACHE] Miss: ${key}`);
        }
        return value;
    }

    /**
     * Set value in cache
     * @param {string} key
     * @param {any} value
     * @param {number} [ttl] - Time to live in seconds (optional)
     */
    set(key, value, ttl) {
        try {
            if (ttl) {
                cache.set(key, value, ttl);
            } else {
                cache.set(key, value);
            }
            // logger.debug(`[CACHE] Set: ${key}`);
            return true;
        } catch (error) {
            logger.error(`[CACHE] Error setting key ${key}:`, error);
            return false;
        }
    }

    /**
     * Delete value from cache
     * @param {string} key
     */
    del(key) {
        cache.del(key);
        // logger.debug(`[CACHE] Deleted: ${key}`);
    }

    /**
     * Flush all data from cache
     */
    flush() {
        cache.flushAll();
        logger.info("[CACHE] Flushed all data");
    }

    /**
     * Get cache statistics
     */
    getStats() {
        return {
            ...cache.getStats(),
            ...this.stats,
        };
    }
}

export default new CacheService();
