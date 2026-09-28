const { verifyJoinToken } = require('../services/tokenService');

/**
 * Socket.io middleware to verify the join token before connection is established.
 */
function socketAuth(socket, next) {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;

  if (!token) {
    return next(new Error('Authentication error: join token required'));
  }

  const decoded = verifyJoinToken(token);
  if (!decoded) {
    return next(new Error('Authentication error: invalid or expired token'));
  }

  socket.user = decoded;
  socket.roomId = decoded.roomId.toLowerCase();
  next();
}

module.exports = {
  socketAuth,
};
