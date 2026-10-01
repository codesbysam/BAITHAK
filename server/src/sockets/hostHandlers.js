const roomService = require('../services/roomService');
const { MeetingStore: Meeting } = require('../models/storeAdapter');
const { admitParticipantToRoom, handleParticipantExit } = require('./roomHandlers');

function registerHostHandlers(io, socket) {
  const roomId = socket.roomId;

  // Helper middleware to assert host permission
  async function assertHost() {
    const isUserHost = await roomService.isHost(roomId, socket.id);
    if (!isUserHost) {
      socket.emit('error', { code: 'FORBIDDEN', message: 'Host privileges required' });
      return false;
    }
    return true;
  }

  socket.on('host:mute', async ({ targetId }) => {
    try {
      if (!(await assertHost())) return;
      if (!targetId) return;

      await roomService.updateParticipantMedia(roomId, targetId, { audio: false });

      // Notify the target participant
      io.to(targetId).emit('host:muted', { byHost: true });

      // Broadcast media state update to room
      io.to(`room:${roomId}`).emit('media:state', {
        id: targetId,
        audio: false,
      });
    } catch (err) {
      console.error('Error in host:mute:', err);
    }
  });

  socket.on('host:mute-all', async () => {
    try {
      if (!(await assertHost())) return;

      const participants = await roomService.getParticipants(roomId);
      for (const p of participants) {
        if (p.socketId !== socket.id) {
          await roomService.updateParticipantMedia(roomId, p.socketId, { audio: false });
          io.to(p.socketId).emit('host:muted', { byHost: true });
          io.to(`room:${roomId}`).emit('media:state', {
            id: p.socketId,
            audio: false,
          });
        }
      }
    } catch (err) {
      console.error('Error in host:mute-all:', err);
    }
  });

  socket.on('host:remove', async ({ targetId }) => {
    try {
      if (!(await assertHost())) return;
      if (!targetId || targetId === socket.id) return;

      const targetSocket = io.sockets.sockets.get(targetId);
      if (targetSocket) {
        targetSocket.emit('host:removed', { message: 'You have been removed by the host' });
        await handleParticipantExit(io, targetSocket, roomId);
        targetSocket.disconnect(true);
      } else {
        await roomService.removeParticipant(roomId, targetId);
        io.to(`room:${roomId}`).emit('room:participant-left', { id: targetId });
      }
    } catch (err) {
      console.error('Error in host:remove:', err);
    }
  });

  socket.on('host:lock', async ({ locked }) => {
    try {
      if (!(await assertHost())) return;

      const isLocked = !!locked;
      await roomService.updateRoomMeta(roomId, { locked: isLocked });

      try {
        await Meeting.updateOne({ roomId }, { isLocked });
      } catch (dbErr) {
        console.warn('Could not update meeting locked state in DB:', dbErr.message);
      }

      io.to(`room:${roomId}`).emit('room:locked', { locked: isLocked });
    } catch (err) {
      console.error('Error in host:lock:', err);
    }
  });

  socket.on('host:admit', async ({ targetId }) => {
    try {
      if (!(await assertHost())) return;
      if (!targetId) return;

      const waitingUsers = await roomService.getWaitingUsers(roomId);
      const targetUser = waitingUsers.find((u) => u.socketId === targetId);

      await roomService.removeWaitingUser(roomId, targetId);

      const targetSocket = io.sockets.sockets.get(targetId);
      if (targetSocket && targetUser) {
        targetSocket.leave(`waiting:${roomId}`);
        targetSocket.emit('room:admitted', { message: 'Admitted by host' });

        await admitParticipantToRoom(io, targetSocket, roomId, {
          userId: targetUser.userId,
          name: targetUser.name,
          isHost: false,
          audio: true,
          video: true,
        });
      }

      // Send updated waiting list to host
      const updatedWaiting = await roomService.getWaitingUsers(roomId);
      socket.emit('host:waiting-list', { waiting: updatedWaiting });
    } catch (err) {
      console.error('Error in host:admit:', err);
    }
  });

  socket.on('host:deny', async ({ targetId }) => {
    try {
      if (!(await assertHost())) return;
      if (!targetId) return;

      await roomService.removeWaitingUser(roomId, targetId);

      const targetSocket = io.sockets.sockets.get(targetId);
      if (targetSocket) {
        targetSocket.leave(`waiting:${roomId}`);
        targetSocket.emit('room:denied', { message: 'Access denied by host' });
        targetSocket.disconnect(true);
      }

      const updatedWaiting = await roomService.getWaitingUsers(roomId);
      socket.emit('host:waiting-list', { waiting: updatedWaiting });
    } catch (err) {
      console.error('Error in host:deny:', err);
    }
  });
}

module.exports = {
  registerHostHandlers,
};
