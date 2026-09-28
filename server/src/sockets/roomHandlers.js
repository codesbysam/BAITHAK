const { MeetingStore: Meeting } = require('../models/storeAdapter');
const roomService = require('../services/roomService');
const { getIceServers } = require('../services/turnService');

// Simple rate limiter for room:join per socket to prevent spamming
const joinAttempts = new Map();

function registerRoomHandlers(io, socket) {
  const roomId = socket.roomId;
  const user = socket.user;

  socket.on('room:join', async (payload = {}) => {
    try {
      // Basic rate limiting
      const now = Date.now();
      const lastJoin = joinAttempts.get(socket.id) || 0;
      if (now - lastJoin < 500) {
        return socket.emit('error', { code: 'RATE_LIMIT', message: 'Too many join attempts' });
      }
      joinAttempts.set(socket.id, now);

      const targetRoomId = (payload.roomId || roomId).toLowerCase();
      const displayName = payload.name || user.name || 'Participant';
      const media = payload.media || { audio: true, video: true };

      // 1. Check meeting in database
      const meeting = await Meeting.findOne({ roomId: targetRoomId });
      if (!meeting) {
        return socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Meeting does not exist' });
      }

      // 2. Check if meeting is locked
      const meta = await roomService.getRoomMeta(targetRoomId);
      if (meta.locked || meeting.isLocked) {
        return socket.emit('error', { code: 'ROOM_LOCKED', message: 'This meeting is locked by the host' });
      }

      // 3. Check room capacity (Mesh limit max 6)
      const existingParticipants = await roomService.getParticipants(targetRoomId);
      if (existingParticipants.length >= meta.maxParticipants) {
        return socket.emit('error', {
          code: 'ROOM_FULL',
          message: `Meeting is full (max ${meta.maxParticipants} participants)`,
        });
      }

      // 4. Waiting room check: if enabled and participant is NOT the host
      const isHostUser = user.isHost === true;
      if (meeting.waitingRoomEnabled && !isHostUser) {
        await roomService.addWaitingUser(targetRoomId, socket.id, {
          userId: user.userId,
          name: displayName,
        });

        socket.join(`waiting:${targetRoomId}`);
        socket.emit('room:waiting', { message: 'You have been placed in the waiting room' });

        // Notify host if present
        if (meta.hostSocketId) {
          io.to(meta.hostSocketId).emit('host:waiting-user', {
            socketId: socket.id,
            userId: user.userId,
            name: displayName,
          });
        }
        return;
      }

      // 5. Admit participant directly into the meeting
      await admitParticipantToRoom(io, socket, targetRoomId, {
        userId: user.userId,
        name: displayName,
        isHost: isHostUser,
        audio: media.audio !== false,
        video: media.video !== false,
      });
    } catch (err) {
      console.error('Error in room:join handler:', err);
      socket.emit('error', { code: 'INTERNAL_ERROR', message: 'Failed to join meeting' });
    }
  });

  socket.on('media:state', async (mediaState = {}) => {
    try {
      const participant = await roomService.getParticipant(roomId, socket.id);
      if (!participant) return;

      const updated = await roomService.updateParticipantMedia(roomId, socket.id, mediaState);
      if (updated) {
        io.to(`room:${roomId}`).emit('media:state', {
          id: socket.id,
          audio: updated.audio,
          video: updated.video,
          screen: updated.screen,
          raisedHand: updated.raisedHand,
        });
      }
    } catch (err) {
      console.error('Error in media:state handler:', err);
    }
  });

  socket.on('hand:toggle', async ({ raised }) => {
    try {
      const participant = await roomService.getParticipant(roomId, socket.id);
      if (!participant) return;

      await roomService.updateParticipantMedia(roomId, socket.id, { raisedHand: !!raised });
      io.to(`room:${roomId}`).emit('hand:toggled', {
        id: socket.id,
        raised: !!raised,
      });
    } catch (err) {
      console.error('Error in hand:toggle handler:', err);
    }
  });

  socket.on('room:leave', async () => {
    await handleParticipantExit(io, socket, roomId);
  });

  socket.on('disconnect', async () => {
    joinAttempts.delete(socket.id);
    await handleParticipantExit(io, socket, roomId);
  });
}

/**
 * Admits and initializes a participant inside the room room:{roomId}
 */
async function admitParticipantToRoom(io, socket, roomId, participantData) {
  socket.join(`room:${roomId}`);

  const existingParticipants = await roomService.getParticipants(roomId);
  const otherParticipants = existingParticipants.filter((p) => p.socketId !== socket.id);

  const newParticipant = await roomService.addParticipant(roomId, socket.id, participantData);
  const iceServers = getIceServers(participantData.userId);

  // Send room:joined event to the newcomer
  socket.emit('room:joined', {
    selfId: socket.id,
    participants: otherParticipants,
    isHost: newParticipant.isHost,
    iceServers,
  });

  // Broadcast to other participants that someone joined
  socket.to(`room:${roomId}`).emit('room:participant-joined', {
    participant: newParticipant,
  });

  // If host joined, send currently waiting list
  if (newParticipant.isHost) {
    const waitingList = await roomService.getWaitingUsers(roomId);
    if (waitingList.length > 0) {
      socket.emit('host:waiting-list', { waiting: waitingList });
    }
  }
}

/**
 * Handles leaving or disconnecting
 */
async function handleParticipantExit(io, socket, roomId) {
  // Check if was in waiting room
  await roomService.removeWaitingUser(roomId, socket.id);

  // Check if was an active participant
  const participant = await roomService.getParticipant(roomId, socket.id);
  if (!participant) return;

  await roomService.removeParticipant(roomId, socket.id);
  socket.leave(`room:${roomId}`);

  // Broadcast exit to remaining participants
  io.to(`room:${roomId}`).emit('room:participant-left', { id: socket.id });

  // Handle host transfer if the host departed
  if (participant.isHost) {
    const newHost = await roomService.transferHost(roomId);
    if (newHost) {
      io.to(`room:${roomId}`).emit('room:host-changed', {
        hostId: newHost.socketId,
        hostUserId: newHost.userId,
        hostName: newHost.name,
      });
    }
  }
}

module.exports = {
  registerRoomHandlers,
  admitParticipantToRoom,
  handleParticipantExit,
};
