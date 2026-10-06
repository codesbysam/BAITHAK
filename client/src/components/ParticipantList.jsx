import React from 'react';
import { useRoomStore } from '../store/roomStore';
import { useAuthStore } from '../store/authStore';
import { getSocket } from '../lib/socket';

export default function ParticipantList({ isOpen, onClose }) {
  const {
    peers,
    isHost,
    isAudioEnabled,
    isVideoEnabled,
    isLocked,
    joinToken,
    waitingUsers,
  } = useRoomStore();

  const { user } = useAuthStore();
  const socket = getSocket(joinToken);

  if (!isOpen) return null;

  const peerList = Object.values(peers);
  const totalCount = 1 + peerList.length;

  const handleMutePeer = (targetSocketId) => {
    if (socket?.connected && isHost) {
      socket.emit('host:mute', { targetId: targetSocketId });
    }
  };

  const handleMuteAll = () => {
    if (socket?.connected && isHost) {
      socket.emit('host:mute-all');
    }
  };

  const handleRemovePeer = (targetSocketId) => {
    if (socket?.connected && isHost) {
      if (window.confirm('Are you sure you want to remove this participant?')) {
        socket.emit('host:remove', { targetId: targetSocketId });
      }
    }
  };

  const handleToggleLock = () => {
    if (socket?.connected && isHost) {
      socket.emit('host:lock', { locked: !isLocked });
    }
  };

  return (
    <aside className="w-80 sm:w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-full z-40 transition-all shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <h3 className="font-semibold text-white text-sm">
            Participants ({totalCount})
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Host Controls Toolbar */}
      {isHost && (
        <div className="p-3 bg-slate-800/40 border-b border-slate-800 flex items-center justify-between gap-2">
          <button
            onClick={handleMuteAll}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition border border-slate-700/60"
          >
            Mute All
          </button>
          <button
            onClick={handleToggleLock}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
              isLocked
                ? 'bg-amber-600/20 border-amber-500/40 text-amber-300 hover:bg-amber-600/30'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700/60 text-slate-200'
            }`}
          >
            {isLocked ? '🔒 Room Locked' : '🔓 Lock Room'}
          </button>
        </div>
      )}

      {/* Participant List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* Self */}
        <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
              {user?.name?.[0]?.toUpperCase() || 'Y'}
            </div>
            <div className="truncate text-xs">
              <span className="font-medium text-slate-200">{user?.name || 'You'}</span>{' '}
              <span className="text-slate-500 text-[11px]">(You)</span>
              {isHost && <span className="ml-1 text-indigo-400 font-semibold text-[10px]">Host</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isAudioEnabled ? 'bg-emerald-400' : 'bg-red-500'}`} />
            <span className={`w-2 h-2 rounded-full ${isVideoEnabled ? 'bg-emerald-400' : 'bg-slate-600'}`} />
          </div>
        </div>

        {/* Remote Peers */}
        {peerList.map((peer) => (
          <div
            key={peer.socketId}
            className="p-2.5 rounded-xl bg-slate-800/30 border border-slate-800 flex items-center justify-between hover:bg-slate-800/60 transition"
          >
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                {peer.name?.[0]?.toUpperCase() || 'P'}
              </div>
              <div className="truncate text-xs">
                <span className="font-medium text-slate-200 truncate">{peer.name}</span>
                {peer.isHost && <span className="ml-1 text-indigo-400 font-semibold text-[10px]">Host</span>}
                {peer.raisedHand && <span className="ml-1 text-xs">✋</span>}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${peer.audio !== false ? 'bg-emerald-400' : 'bg-red-500'}`}
                title={peer.audio !== false ? 'Mic On' : 'Mic Off'}
              />
              <span
                className={`w-2 h-2 rounded-full ${peer.video !== false ? 'bg-emerald-400' : 'bg-slate-600'}`}
                title={peer.video !== false ? 'Video On' : 'Video Off'}
              />

              {/* Host Action Buttons */}
              {isHost && (
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => handleMutePeer(peer.socketId)}
                    title="Mute participant"
                    className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-[10px]"
                  >
                    Mute
                  </button>
                  <button
                    onClick={() => handleRemovePeer(peer.socketId)}
                    title="Remove participant"
                    className="p-1 rounded bg-red-900/40 hover:bg-red-800/60 text-red-300 text-[10px]"
                  >
                    Kick
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Waiting Room notice in drawer */}
        {isHost && waitingUsers.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-800">
            <h4 className="text-xs font-semibold text-slate-400 mb-2">
              Waiting in lobby ({waitingUsers.length})
            </h4>
            <div className="space-y-1.5">
              {waitingUsers.map((u) => (
                <div
                  key={u.socketId}
                  className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/20 flex items-center justify-between text-xs"
                >
                  <span className="text-slate-300 truncate">{u.name}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => socket.emit('host:admit', { targetId: u.socketId })}
                      className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px]"
                    >
                      Admit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
