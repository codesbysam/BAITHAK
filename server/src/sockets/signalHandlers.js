const roomService = require('../services/roomService');

/**
 * Signaling handlers for WebRTC mesh negotiation.
 * Relays SDP offers, answers, and ICE candidates between peers strictly in the same room.
 */
function registerSignalHandlers(io, socket) {
  const roomId = socket.roomId;

  socket.on('signal:offer', async ({ to, sdp }) => {
    try {
      if (!to || !sdp) return;

      // Security check: ensure target 'to' is a verified participant in this room
      const targetParticipant = await roomService.getParticipant(roomId, to);
      if (!targetParticipant) {
        return socket.emit('error', { code: 'PEER_NOT_FOUND', message: 'Target peer not in room' });
      }

      // Relay the offer to the target peer
      io.to(to).emit('signal:offer', {
        from: socket.id,
        sdp,
      });
    } catch (err) {
      console.error('Error handling signal:offer:', err);
    }
  });

  socket.on('signal:answer', async ({ to, sdp }) => {
    try {
      if (!to || !sdp) return;

      // Security check: ensure target 'to' is in the same room
      const targetParticipant = await roomService.getParticipant(roomId, to);
      if (!targetParticipant) {
        return socket.emit('error', { code: 'PEER_NOT_FOUND', message: 'Target peer not in room' });
      }

      // Relay the answer back to the offering peer
      io.to(to).emit('signal:answer', {
        from: socket.id,
        sdp,
      });
    } catch (err) {
      console.error('Error handling signal:answer:', err);
    }
  });

  socket.on('signal:ice-candidate', async ({ to, candidate }) => {
    try {
      if (!to || !candidate) return;

      // Security check: ensure target peer is in room
      const targetParticipant = await roomService.getParticipant(roomId, to);
      if (!targetParticipant) return;

      // Relay ICE candidate
      io.to(to).emit('signal:ice-candidate', {
        from: socket.id,
        candidate,
      });
    } catch (err) {
      console.error('Error handling signal:ice-candidate:', err);
    }
  });
}

module.exports = {
  registerSignalHandlers,
};
