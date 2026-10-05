import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoomStore } from '../store/roomStore';
import { getSocket } from '../lib/socket';

export default function Controls({
  onToggleChat,
  isChatOpen = false,
  onToggleScreenShare,
  onToggleParticipants,
  isParticipantsOpen = false,
  onOpenSettings,
}) {
  const {
    roomId,
    joinToken,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    toggleAudio,
    toggleVideo,
    resetRoom,
  } = useRoomStore();

  const [hasRaisedHand, setHasRaisedHand] = useState(false);
  const navigate = useNavigate();

  const handleAudioToggle = () => {
    const newState = toggleAudio();
    const socket = getSocket(joinToken);
    if (socket?.connected) {
      socket.emit('media:state', { audio: newState });
    }
  };

  const handleVideoToggle = () => {
    const newState = toggleVideo();
    const socket = getSocket(joinToken);
    if (socket?.connected) {
      socket.emit('media:state', { video: newState });
    }
  };

  const handleHandToggle = () => {
    const nextHand = !hasRaisedHand;
    setHasRaisedHand(nextHand);
    const socket = getSocket(joinToken);
    if (socket?.connected) {
      socket.emit('hand:toggle', { raised: nextHand });
    }
  };

  const handleLeaveCall = () => {
    const socket = getSocket(joinToken);
    if (socket?.connected) {
      socket.emit('room:leave');
    }
    resetRoom();
    navigate('/dashboard');
  };

  return (
    <footer className="h-20 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 px-4 sm:px-6 flex items-center justify-between z-30 shrink-0">
      {/* Left: Meeting Code */}
      <div className="hidden sm:flex items-center gap-3">
        <span className="font-mono text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700/60">
          {roomId}
        </span>
      </div>

      {/* Center: Main Media Action Controls */}
      <div className="flex items-center gap-2 sm:gap-3 mx-auto">
        {/* Microphone Toggle */}
        <button
          onClick={handleAudioToggle}
          title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
          className={`p-3 rounded-2xl transition duration-150 flex items-center justify-center shadow-lg ${
            isAudioEnabled
              ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
              : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'
          }`}
        >
          {isAudioEnabled ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          )}
        </button>

        {/* Camera Toggle */}
        <button
          onClick={handleVideoToggle}
          title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          className={`p-3 rounded-2xl transition duration-150 flex items-center justify-center shadow-lg ${
            isVideoEnabled
              ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
              : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'
          }`}
        >
          {isVideoEnabled ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          )}
        </button>

        {/* Screen Sharing Toggle */}
        {onToggleScreenShare && (
          <button
            onClick={onToggleScreenShare}
            title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
            className={`p-3 rounded-2xl transition duration-150 flex items-center justify-center shadow-lg ${
              isScreenSharing
                ? 'bg-blue-600 text-white shadow-blue-600/30'
                : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </button>
        )}

        {/* Raise Hand Toggle */}
        <button
          onClick={handleHandToggle}
          title={hasRaisedHand ? 'Lower Hand' : 'Raise Hand'}
          className={`p-3 rounded-2xl transition duration-150 flex items-center justify-center shadow-lg text-lg ${
            hasRaisedHand
              ? 'bg-amber-600 text-white shadow-amber-600/30 ring-2 ring-amber-400'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
          }`}
        >
          ✋
        </button>

        {/* Device Settings Mid-Call */}
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            title="Audio & Video Settings"
            className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition flex items-center justify-center shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        )}

        {/* Participants Drawer Toggle */}
        {onToggleParticipants && (
          <button
            onClick={onToggleParticipants}
            title="Participants"
            className={`p-3 rounded-2xl transition duration-150 flex items-center justify-center shadow-lg ${
              isParticipantsOpen
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </button>
        )}

        {/* Chat Drawer Toggle */}
        {onToggleChat && (
          <button
            onClick={onToggleChat}
            title="Chat"
            className={`p-3 rounded-2xl transition duration-150 flex items-center justify-center shadow-lg ${
              isChatOpen
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
        )}

        {/* Leave Meeting */}
        <button
          onClick={handleLeaveCall}
          title="Leave meeting"
          className="py-3 px-5 rounded-2xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-medium text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-red-600/30 transition duration-150"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="hidden sm:inline">Leave</span>
        </button>
      </div>

      <div className="hidden sm:block w-24" />
    </footer>
  );
}
