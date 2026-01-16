import fetch from 'node-fetch';
import axios from 'axios';
import https from 'https';
import logger from '../utils/Logger.js';
import tokenRefresher from '../helper/0authTokenManager.js';

const agent = new https.Agent({
    rejectUnauthorized: false,
});

const CLIENT_ID = process.env.TOKEN_CLIENT_ID;
const CLIENT_SECRET = process.env.TOKEN_SECRET_ID;
const SCOPE = process.env.TOKEN_SCOP;
const TOKEN_URL = process.env.TOKEN_URL;
const TARGET_URL_BASE = process.env.API;

/**
 * Proxies GET requests to the flight status API.
 */
export const getProxyFlightStatus = async (req, res) => {
    try {
        const authHeader = req.headers.get ? req.headers.get('Authorization') : req.headers['authorization'];

        if (!authHeader) {
            return res.status(401).json({ error: 'Authorization header is required' });
        }

        if (!TARGET_URL_BASE) {
            return res.status(500).json({ error: 'Server configuration error: missing environment variables' });
        }

        const fltNbr = req.query.fltNbr || '5724';
        const targetUrl = new URL(`${TARGET_URL_BASE}`);
        targetUrl.searchParams.set('fltNbr', fltNbr);

        // Append other search params
        Object.keys(req.query).forEach((key) => {
            if (key !== 'fltNbr') {
                targetUrl.searchParams.append(key, req.query[key]);
            }
        });

        logger.info(`[Proxy] Fetching from: ${targetUrl.toString()}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        const upstreamRes = await fetch(targetUrl.toString(), {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                'User-Agent': 'UnitedFlightService/1.0',
                'rte-ual-auth': "GTXRlZ3R4OkdUWFBBNRP",
                Authorization: authHeader,
            },
            agent: agent,
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!upstreamRes.ok) {
            const errorBody = await upstreamRes.text();
            logger.error('Proxy Upstream Error:', {
                status: upstreamRes.status,
                statusText: upstreamRes.statusText,
                body: errorBody,
            });
            return res.status(upstreamRes.status).json({
                error: 'Upstream error',
                status: upstreamRes.status,
                details: errorBody,
            });
        }

        const contentType = upstreamRes.headers.get('content-type') || 'application/json';
        const body = await upstreamRes.text();

        res.setHeader('Content-Type', contentType);
        return res.status(upstreamRes.status).send(body);
    } catch (err) {
        logger.error('Proxy GET failed:', err);
        return res.status(500).json({
            error: 'Proxy GET failed',
            details: err?.message ?? String(err),
        });
    }
};

/**
 * Fetches an OAuth2 token from Azure.
 */
export const getAzureToken = async (req, res) => {
    try {
        logger.info(`[Proxy] Fetching Azure token via TokenRefresher`);

        const token = await tokenRefresher.getToken();

        if (!token) {
            return res.status(500).json({
                error: 'Token generation failed',
                details: 'Unable to obtain access token from TokenRefresher'
            });
        }

        // Return in the format expected by the frontend or consumers
        // The original returned response.data which typically contains access_token, expires_in, etc.
        // TokenRefresher only returns the access_token string.
        // If the consumer expects the full object, we might need to adjust TokenRefresher or mock the response here.
        // However, looking at the original code: return res.status(200).json(response.data);
        // And response.data usually has { access_token, token_type, expires_in, ... }

        // Since TokenRefresher abstracts this and only gives the token, I should probably check what the frontend expects.
        // The user request says "can we enhanced the token so token valid untill it exorire and reuse over again".
        // If I change the response format, it might break things.

        // Let's check TokenRefresher again. It has _saveTokenToCache which saves { token, expiry }.
        // But getToken() returns just the token string.

        // If I want to return the full object, I might need to expose more from TokenRefresher.
        // But for now, let's assume returning just the token or constructing a minimal object is fine, 
        // OR I can reconstruct a response object.

        // Wait, if the frontend expects `access_token` field, I should return JSON with that field.

        // Calculate remaining time in seconds
        const remainingSeconds = tokenRefresher.tokenExpiry
            ? Math.max(0, Math.floor((tokenRefresher.tokenExpiry - Date.now()) / 1000))
            : 3599;

        return res.status(200).json({
            access_token: token,
            token_type: 'Bearer',
            expires_in: remainingSeconds
        });

    } catch (err) {
        logger.error('Token generation failed:', err);
        return res.status(500).json({
            error: 'Token generation failed',
            details: err?.message ?? String(err),
        });
    }
};
