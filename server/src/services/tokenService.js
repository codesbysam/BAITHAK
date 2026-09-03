const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');

/**
 * Computes a SHA-256 hex digest for secure token storage.
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generates a signed 15-minute access token JWT.
 */
function generateAccessToken(payload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '15m' });
}

/**
 * Generates a cryptographically random refresh token.
 */
function generateRefreshToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generates a short-lived join token for room authorization and socket handshake.
 */
function generateJoinToken(payload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '2h' });
}

/**
 * Verifies and decodes an access token.
 */
function verifyAccessToken(token) {
  try {
    return jwt.verify(token, env.JWT_SECRET);
  } catch (_err) {
    return null;
  }
}

/**
 * Verifies and decodes a join token.
 */
function verifyJoinToken(token) {
  try {
    return jwt.verify(token, env.JWT_SECRET);
  } catch (_err) {
    return null;
  }
}

module.exports = {
  hashToken,
  generateAccessToken,
  generateRefreshToken,
  generateJoinToken,
  verifyAccessToken,
  verifyJoinToken,
};
