const crypto = require('crypto');
const env = require('../config/env');

/**
 * Generates temporary HMAC-based credentials for coturn TURN server.
 * Default expiration is 1 hour (3600 seconds).
 */
function getIceServers(userId = 'guest') {
  const ttl = 3600; // 1 hour
  const timestamp = Math.floor(Date.now() / 1000) + ttl;
  const username = `${timestamp}:${userId}`;

  // coturn uses HMAC-SHA1 over username with static-auth-secret
  const hmac = crypto.createHmac('sha1', env.TURN_SECRET);
  hmac.update(username);
  const password = hmac.digest('base64');

  const iceServers = [
    {
      urls: env.STUN_URL,
    },
    {
      urls: [env.TURN_URL, `${env.TURN_URL}?transport=tcp`],
      username,
      credential: password,
    },
  ];

  return iceServers;
}

module.exports = {
  getIceServers,
};
