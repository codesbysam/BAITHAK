import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRoomStore } from '../store/roomStore';
import { usePeerConnections } from '../hooks/usePeerConnections';
import { useActiveSpeaker } from '../hooks/useActiveSpeaker';
import { useMediaStream } from '../hooks/useMediaStream';
import { getSocket } from '../lib/socket';
import VideoGrid from '../components/VideoGrid';
import Controls from '../components/Controls';
import ChatPanel from '../components/ChatPanel';
import ParticipantList from '../components/ParticipantList';
import WaitingRoomPanel from '../components/WaitingRoomPanel';
import DeviceSelector from '../components/DeviceSelector';

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const {
    joinToken,
    isWaiting,
    isLocked,
    meetingInfo,
    localStream,
    isScreenSharing,
    setScreenSharing,
  } = useRoomStore();

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Redirect to PreJoin if user lands without joinToken
  useEffect(() => {
    if (!joinToken) {
      navigate(`/room/${roomId}`, { replace: true });
    }
  }, [joinToken, roomId, navigate]);

  // Hook 1: WebRTC mesh & socket signaling engine
  const { pcsRef, replaceVideoTrackAllPeers, replaceAudioTrackAllPeers } = usePeerConnections();

  // Hook 2: Web Audio Analyser for active speaker detection
  useActiveSpeaker();

  // Hook 3: Media stream manager for device switching
  const { startMediaStream } = useMediaStream();

  // Screen Sharing logic with browser track.onended handler
  const handleToggleScreenShare = useCallback(async () => {
    const socket = getSocket(joinToken);

    if (isScreenSharing) {
      // Stop screen sharing manually
      const camTrack = localStream?.getVideoTracks()[0] || null;
      await replaceVideoTrackAllPeers(camTrack);
      setScreenSharing(false, null);
      if (socket?.connected) {
        socket.emit('media:state', { screen: false });
      }
    } else {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: false,
        });

        const screenTrack = displayStream.getVideoTracks()[0];

        // Replace video sender track on all peers with zero renegotiation
        await replaceVideoTrackAllPeers(screenTrack);
        setScreenSharing(true, displayStream);

        if (socket?.connected) {
          socket.emit('media:state', { screen: true });
        }

        // Native browser "Stop sharing" floating button listener
        screenTrack.onended = async () => {
          const camTrack = localStream?.getVideoTracks()[0] || null;
          await replaceVideoTrackAllPeers(camTrack);
          setScreenSharing(false, null);
          if (socket?.connected) {
            socket.emit('media:state', { screen: false });
          }
        };
      } catch (err) {
        if (err.name !== 'NotAllowedError') {
          console.error('Error starting screen share:', err);
        }
      }
    }
  }, [isScreenSharing, joinToken, localStream, replaceVideoTrackAllPeers, setScreenSharing]);

  // Mid-call device switching handler
  const handleDeviceChange = async (devices) => {
    const newStream = await startMediaStream(devices);
    if (newStream) {
      const audioTrack = newStream.getAudioTracks()[0];
      const videoTrack = newStream.getVideoTracks()[0];

      if (audioTrack) {
        await replaceAudioTrackAllPeers(audioTrack);
      }
      if (videoTrack && !isScreenSharing) {
        await replaceVideoTrackAllPeers(videoTrack);
      }
    }
  };

  // Waiting Room state
  if (isWaiting) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto mb-6 text-indigo-400">
            <svg className="w-8 h-8 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Waiting to be admitted</h2>
          <p className="text-xs text-slate-400 mb-6">
            Please wait, the meeting host will let you in soon.
          </p>
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs font-mono text-slate-300 mb-6 truncate">
            {meetingInfo?.title || `Meeting: ${roomId}`}
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
          >
            Leave Waiting Room
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between overflow-hidden text-slate-100 relative">
      {/* Top Banner (Locked Status) */}
      {isLocked && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-xs py-1.5 px-4 text-center font-medium shrink-0">
          🔒 This room is locked by the host. No new participants can join.
        </div>
      )}

      {/* Floating Host Waiting Room Toast */}
      <WaitingRoomPanel />

      {/* Center Layout: Video Grid + Optional Side Drawer (Chat / Participants) */}
      <div className="flex-1 flex overflow-hidden relative">
        <main className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
          <VideoGrid getPeerConnection={(id) => pcsRef?.current?.get(id)} />
        </main>

        {/* In-Call Chat Drawer */}
        <ChatPanel
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />

        {/* Participants Drawer */}
        <ParticipantList
          isOpen={isParticipantsOpen}
          onClose={() => setIsParticipantsOpen(false)}
        />
      </div>

      {/* Bottom Controls Bar */}
      <Controls
        isChatOpen={isChatOpen}
        onToggleChat={() => {
          setIsChatOpen((prev) => !prev);
          if (!isChatOpen) setIsParticipantsOpen(false);
        }}
        isParticipantsOpen={isParticipantsOpen}
        onToggleParticipants={() => {
          setIsParticipantsOpen((prev) => !prev);
          if (!isParticipantsOpen) setIsChatOpen(false);
        }}
        onToggleScreenShare={handleToggleScreenShare}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Settings Modal (Audio & Video Devices) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white">Audio & Video Settings</h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <DeviceSelector onDeviceChange={handleDeviceChange} />

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
