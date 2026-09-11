const { verifyAccessToken, verifyJoinToken } = require('../services/tokenService');

/**
 * Middleware to authenticate requests using JWT Access Token.
 */
function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyAccessToken(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired access token' });
  }

  req.user = decoded;
  next();
}

/**
 * Optional user authentication: attaches user if valid token exists, otherwise continues.
 */
function optionalUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }
  next();
}

/**
 * Middleware to authenticate using meeting join token.
 */
function authenticateJoin(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = (authHeader && authHeader.startsWith('Bearer ')) 
    ? authHeader.split(' ')[1] 
    : req.headers['x-join-token'] || req.query.joinToken;

  if (!token) {
    return res.status(401).json({ error: 'Join token required' });
  }

  const decoded = verifyJoinToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired join token' });
  }

  req.joinAuth = decoded;
  next();
}

module.exports = {
  authenticateUser,
  optionalUser,
  authenticateJoin,
};
