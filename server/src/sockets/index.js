const { socketAuth } = require('./socketAuth');
const { registerRoomHandlers } = require('./roomHandlers');
const { registerSignalHandlers } = require('./signalHandlers');
const { registerChatHandlers } = require('./chatHandlers');
const { registerHostHandlers } = require('./hostHandlers');

function initSockets(io) {
  // Authentication middleware
  io.use(socketAuth);

  io.on('connection', (socket) => {
    // Register individual event domain handlers
    registerRoomHandlers(io, socket);
    registerSignalHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerHostHandlers(io, socket);
  });
}

module.exports = {
  initSockets,
};
