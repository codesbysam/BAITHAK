const crypto = require('crypto');
const env = require('../config/env');

/**
 * Generates temporary HMAC-based credentials for coturn TURN server.
 * Default expiration is 1 hour (3600 seconds).
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

  // Attach TURN in test mode or if a real production TURN server is configured
  if (
    isTest ||
    (env.TURN_URL &&
      !env.TURN_URL.includes('localhost') &&
      !env.TURN_URL.includes('openrelay.metered.ca') &&
      env.TURN_SECRET &&
      env.TURN_SECRET !== 'my_turn_secret')
  ) {
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
  }

  return iceServers;
}

module.exports = {
  getIceServers,
};
