import React from 'react';
import { useRoomStore } from '../store/roomStore';
import { getSocket } from '../lib/socket';

export default function WaitingRoomPanel() {
  const { isHost, waitingUsers, joinToken } = useRoomStore();

  if (!isHost || waitingUsers.length === 0) return null;

  const handleAdmit = (socketId) => {
    const socket = getSocket(joinToken);
    if (socket?.connected) {
      socket.emit('host:admit', { targetId: socketId });
    }
  };

  const handleDeny = (socketId) => {
    const socket = getSocket(joinToken);
    if (socket?.connected) {
      socket.emit('host:deny', { targetId: socketId });
    }
  };

  return (
    <div className="absolute top-4 left-4 z-40 bg-slate-900 border border-indigo-500/40 rounded-2xl p-4 shadow-2xl max-w-sm w-full backdrop-blur-md">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <h4 className="text-xs font-semibold text-white tracking-wide">
            Waiting Room ({waitingUsers.length})
          </h4>
        </div>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {waitingUsers.map((user) => (
          <div
            key={user.socketId}
            className="flex items-center justify-between p-2 rounded-xl bg-slate-800/80 border border-slate-700/60"
          >
            <div className="truncate mr-2">
              <p className="text-xs font-medium text-slate-200 truncate">{user.name}</p>
              <p className="text-[10px] text-slate-400">wants to join</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => handleDeny(user.socketId)}
                className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-red-900/60 text-slate-300 hover:text-red-300 text-[11px] transition"
              >
                Deny
              </button>
              <button
                onClick={() => handleAdmit(user.socketId)}
                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-medium transition shadow-sm"
              >
                Admit
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
