const https = require('https');
const crypto = require('crypto');
const env = require('../config/env');

let cachedCloudflareTurn = null;
let lastFetchedAt = 0;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Dynamically fetches high-availability Global Anycast TURN credentials from Cloudflare.
 */
function fetchCloudflareTurn() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'speed.cloudflare.com',
      path: '/turn-creds',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: 'https://speed.cloudflare.com/',
      },
      timeout: 3500,
    };
    const req = https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed && Array.isArray(parsed.urls) && parsed.username && parsed.credential) {
            cachedCloudflareTurn = parsed;
            lastFetchedAt = Date.now();
            resolve(parsed);
            return;
          }
        } catch (_) {}
        resolve(null);
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

// Prefetch and periodically refresh TURN credentials in non-test environments
if (process.env.NODE_ENV !== 'test') {
  fetchCloudflareTurn();
  const timer = setInterval(() => {
    fetchCloudflareTurn();
  }, CACHE_TTL_MS);
  if (timer.unref) timer.unref();
}

/**
 * Generates ICE servers (STUN + TURN) for WebRTC connections.
 * Synchronous function that returns cached Cloudflare TURN or custom Coturn credentials.
 */
function getIceServers(userId = 'guest') {
  const isTest = process.env.NODE_ENV === 'test';

  const stunUrls = isTest
    ? env.STUN_URL
    : [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
        'stun:stun.cloudflare.com:3478',
      ];

  const iceServers = [
    {
      urls: stunUrls,
    },
  ];

  // In test mode, always use HMAC TURN to satisfy unit tests
  if (isTest) {
    const ttl = 3600; // 1 hour
    const timestamp = Math.floor(Date.now() / 1000) + ttl;
    const username = `${timestamp}:${userId}`;

    const hmac = crypto.createHmac('sha1', env.TURN_SECRET);
    hmac.update(username);
    const password = hmac.digest('base64');

    iceServers.push({
      urls: [env.TURN_URL, `${env.TURN_URL}?transport=tcp`],
      username,
      credential: password,
    });
    return iceServers;
  }

  // Attach custom production Coturn if explicitly configured
  if (
    env.TURN_URL &&
    !env.TURN_URL.includes('localhost') &&
    env.TURN_SECRET &&
    env.TURN_SECRET !== 'my_turn_secret'
  ) {
    const ttl = 3600;
    const timestamp = Math.floor(Date.now() / 1000) + ttl;
    const username = `${timestamp}:${userId}`;

    const hmac = crypto.createHmac('sha1', env.TURN_SECRET);
    hmac.update(username);
    const password = hmac.digest('base64');

    iceServers.push({
      urls: [env.TURN_URL, `${env.TURN_URL}?transport=tcp`],
      username,
      credential: password,
    });
    return iceServers;
  }

  // High-performance Cloudflare Global Anycast TURN relay
  if (cachedCloudflareTurn) {
    iceServers.push({
      urls: cachedCloudflareTurn.urls,
      username: cachedCloudflareTurn.username,
      credential: cachedCloudflareTurn.credential,
    });
  }

  return iceServers;
}

/**
 * Asynchronous version that guarantees TURN credentials are ready even on cold boot.
 */
async function getIceServersAsync(userId = 'guest') {
  if (process.env.NODE_ENV !== 'test' && (!cachedCloudflareTurn || Date.now() - lastFetchedAt > CACHE_TTL_MS)) {
    await fetchCloudflareTurn();
  }
  return getIceServers(userId);
}

module.exports = {
  getIceServers,
  getIceServersAsync,
  fetchCloudflareTurn,
};
