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

  const stunList = [
    env.STUN_URL,
    'stun:stun.l.google.com:19302',
    'stun:stun1.l.google.com:19302',
    'stun:stun2.l.google.com:19302',
  ].filter(Boolean);

  const iceServers = [
    {
      urls: stunList,
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
