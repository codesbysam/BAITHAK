import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useRoomStore } from '../store/roomStore';
import { useMediaStream } from '../hooks/useMediaStream';
import DeviceSelector from '../components/DeviceSelector';
import { api } from '../lib/api';

export default function PreJoin() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    setRoomId,
    setMeetingInfo,
    setJoinToken,
    setIsHost,
    isAudioEnabled,
    isVideoEnabled,
    toggleAudio,
    toggleVideo,
  } = useRoomStore();

  const {
    localStream,
    isLoadingMedia,
    permissionError,
    startMediaStream,
  } = useMediaStream();

  const [meeting, setMeeting] = useState(null);
  const [loadingMeeting, setLoadingMeeting] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Form states
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [password, setPassword] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const videoPreviewRef = useRef(null);

  // Fetch meeting public info
  useEffect(() => {
    let isMounted = true;
    const fetchInfo = async () => {
      try {
        setLoadingMeeting(true);
        const res = await api.get(`/meetings/${roomId}`);
        if (isMounted) {
          setMeeting(res.data);
          setMeetingInfo(res.data);
          setRoomId(roomId);
        }
      } catch (err) {
        if (isMounted) {
          setFetchError(err.response?.data?.error || 'Meeting not found');
        }
      } finally {
        if (isMounted) setLoadingMeeting(false);
      }
    };

    fetchInfo();
    return () => {
      isMounted = false;
    };
  }, [roomId, setMeetingInfo, setRoomId]);


  // Start media stream on mount
  useEffect(() => {
    startMediaStream({ audio: isAudioEnabled, video: isVideoEnabled });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Attach local preview stream to video element
  useEffect(() => {
    if (videoPreviewRef.current && localStream) {
      videoPreviewRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const handleDeviceChange = (devices) => {
    startMediaStream({
      audio: isAudioEnabled,
      video: isVideoEnabled,
      ...devices,
    });
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setVerifyError('');

    const nameToUse = (displayName || user?.name || 'Guest').trim();
    if (!nameToUse) {
      setVerifyError('Please enter a display name');
      return;
    }

    setIsJoining(true);
    try {
      const res = await api.post(`/meetings/${roomId}/verify`, {
        name: nameToUse,
        password: password ? password : undefined,
      });

      const { joinToken, isHost: hostStatus } = res.data;
      setJoinToken(joinToken);
      setIsHost(hostStatus);

      // Navigate to active meeting room
      navigate(`/room/${roomId}/live`, { replace: true });
    } catch (err) {
      setVerifyError(err.response?.data?.error || 'Failed to join meeting');
    } finally {
      setIsJoining(false);
    }
  };

  if (loadingMeeting) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Checking meeting status...</p>
        </div>
      </div>
    );
  }

  if (fetchError || !meeting) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Meeting Unavailable</h2>
          <p className="text-xs text-slate-400 mb-6">{fetchError || 'This meeting link does not exist.'}</p>
          <Link
            to={user ? '/dashboard' : '/'}
            className="inline-block py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
          >
            Return to Safety
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center px-4 py-8">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-600/30">
            M
          </div>
          <span className="text-lg font-bold tracking-tight text-white">MeetSpace</span>
        </div>
        <Link
          to={user ? '/dashboard' : '/'}
          className="text-xs text-slate-400 hover:text-white transition"
        >
          Cancel
        </Link>
      </div>

      {/* Main PreJoin Card Container */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Left Side: Video Preview (7 cols) */}
        <div className="md:col-span-7 flex flex-col gap-4">
          <div className="relative aspect-video w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center">
            {/* Live Video Preview */}
            <video
              ref={videoPreviewRef}
              autoPlay
              playsInline
              muted // Always mute preview to prevent feedback
              className={`w-full h-full object-cover -scale-x-100 ${isVideoEnabled ? 'block' : 'hidden'}`}
            />

            {/* Camera Off Avatar */}
            {!isVideoEnabled && (
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 text-2xl font-bold">
                  {displayName ? displayName[0]?.toUpperCase() : 'U'}
                </div>
                <p className="text-xs text-slate-500 mt-3">Camera is off</p>
              </div>
            )}

            {/* Quick Mute Overlay Toggles */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 shadow-lg">
              <button
                onClick={() => toggleAudio()}
                className={`p-2.5 rounded-xl transition ${
                  isAudioEnabled
                    ? 'bg-slate-800 hover:bg-slate-700 text-white'
                    : 'bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/30'
                }`}
                title={isAudioEnabled ? 'Mute Mic' : 'Unmute Mic'}
              >
                {isAudioEnabled ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                )}
              </button>

              <button
                onClick={() => toggleVideo()}
                className={`p-2.5 rounded-xl transition ${
                  isVideoEnabled
                    ? 'bg-slate-800 hover:bg-slate-700 text-white'
                    : 'bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/30'
                }`}
                title={isVideoEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
              >
                {isVideoEnabled ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Friendly Permissions Error Banner */}
          {permissionError && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{permissionError}</span>
            </div>
          )}

          {/* Device Selectors */}
          <DeviceSelector onDeviceChange={handleDeviceChange} />
        </div>

        {/* Right Side: Meeting Details & Join Form (5 cols) */}
        <div className="md:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="mb-6">
            <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-400 font-semibold bg-indigo-500/10 px-2.5 py-1 rounded-md">
              Room: {meeting.roomId}
            </span>
            <h2 className="text-xl font-bold text-white mt-3 truncate">{meeting.title}</h2>
            <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
              {meeting.waitingRoomEnabled && (
                <span className="inline-flex items-center gap-1 text-blue-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Waiting Room Active
                </span>
              )}
              {meeting.requiresPassword && (
                <span className="inline-flex items-center gap-1 text-amber-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Passcode Required
                </span>
              )}
            </div>
          </div>

          {verifyError && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {verifyError}
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Your Display Name</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            {meeting.requiresPassword && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Meeting Passcode</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter passcode"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isJoining || isLoadingMedia}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium text-sm transition shadow-lg shadow-indigo-600/30 disabled:opacity-50 mt-2"
            >
              {isJoining ? 'Connecting...' : 'Join Meeting'}
            </button>
          </form>

          <p className="text-[11px] text-slate-500 text-center mt-4">
            Direct Peer-to-Peer encrypted audio & video
          </p>
        </div>
      </div>
    </div>
  );
}
