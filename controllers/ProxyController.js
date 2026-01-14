import fetch from 'node-fetch';
import axios from 'axios';
import https from 'https';
import logger from '../utils/Logger.js';

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
        if (!CLIENT_ID || !CLIENT_SECRET || !SCOPE || !TOKEN_URL) {
            return res.status(500).json({ error: 'Missing required Azure OAuth environment variables' });
        }

        const params = new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            scope: SCOPE,
            grant_type: 'client_credentials',
        });

        logger.info(`[Proxy] Fetching Azure token from: ${TOKEN_URL}`);
        logger.info(`[Proxy] Request params: ${params.toString()}`);

        try {
            const response = await axios.post(TOKEN_URL, params.toString(), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                httpsAgent: agent,
                timeout: 60000,
            });

            logger.info(`[Proxy] Azure token fetched successfully`);
            return res.status(200).json(response.data);
        } catch (axiosErr) {
            logger.error(`[Proxy] Axios error: ${axiosErr.message}`);
            if (axiosErr.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                logger.error(`[Proxy] Response status: ${axiosErr.response.status}`);
                logger.error(`[Proxy] Response data: ${JSON.stringify(axiosErr.response.data)}`);
                return res.status(axiosErr.response.status).json({
                    error: `Failed to fetch access token: ${axiosErr.response.status}`,
                    details: axiosErr.response.data,
                });
            } else if (axiosErr.request) {
                // The request was made but no response was received
                logger.error(`[Proxy] No response received. Request details: ${JSON.stringify(axiosErr.config)}`);
                return res.status(504).json({
                    error: "No response from Azure",
                    details: axiosErr.message
                });
            } else {
                // Something happened in setting up the request that triggered an Error
                logger.error(`[Proxy] Request setup error: ${axiosErr.message}`);
                throw axiosErr;
            }
        }
    } catch (err) {
        logger.error('Token generation failed:', err);
        return res.status(500).json({
            error: 'Token generation failed',
            details: err?.message ?? String(err),
        });
    }
};
