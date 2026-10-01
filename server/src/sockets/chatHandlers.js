const { MessageStore: Message } = require('../models/storeAdapter');
const roomService = require('../services/roomService');
const { escapeHtml } = require('../utils/sanitize');

// In-memory rate limiting map for chat messages per socket
const messageTimestamps = new Map();

function registerChatHandlers(io, socket) {
  const roomId = socket.roomId;
  const user = socket.user;

  socket.on('chat:send', async ({ text }) => {
    try {
      if (!text || typeof text !== 'string') return;

      const trimmed = text.trim();
      if (trimmed.length === 0) return;

      // Rate limit check: max 10 messages per 5 seconds
      const now = Date.now();
      const timestamps = (messageTimestamps.get(socket.id) || []).filter((t) => now - t < 5000);
      if (timestamps.length >= 10) {
        return socket.emit('error', { code: 'CHAT_RATE_LIMIT', message: 'You are sending messages too fast' });
      }
      timestamps.push(now);
      messageTimestamps.set(socket.id, timestamps);

      // Verify participant is in the room
      const participant = await roomService.getParticipant(roomId, socket.id);
      if (!participant) {
        return socket.emit('error', { code: 'NOT_IN_ROOM', message: 'Must be in room to chat' });
      }

      // Enforce 1000 character maximum and sanitize HTML
      const sanitizedText = escapeHtml(trimmed.slice(0, 1000));

      // Persist in MongoDB
      let savedMessage = null;
      try {
        const isDbUserId = user.userId && user.userId.length === 24;
        savedMessage = await Message.create({
          roomId,
          senderName: participant.name,
          senderId: isDbUserId ? user.userId : null,
          text: sanitizedText,
        });
      } catch (dbErr) {
        console.warn('Could not persist chat message to DB:', dbErr.message);
      }

      const messagePayload = {
        id: savedMessage ? savedMessage._id.toString() : `temp_${Date.now()}`,
        senderName: participant.name,
        senderId: participant.userId,
        senderSocketId: socket.id,
        text: sanitizedText,
        createdAt: savedMessage ? savedMessage.createdAt : new Date().toISOString(),
      };

      // Broadcast to room
      io.to(`room:${roomId}`).emit('chat:message', messagePayload);
    } catch (err) {
      console.error('Error handling chat:send:', err);
    }
  });

  socket.on('disconnect', () => {
    messageTimestamps.delete(socket.id);
  });
}

module.exports = {
  registerChatHandlers,
};
