import React, { useEffect, useRef } from 'react';
import ConnectionBadge from './ConnectionBadge';

export default function VideoTile({
  stream,
  name = 'Participant',
  isLocal = false,
  isAudioMuted = false,
  isVideoMuted = false,
  isHost = false,
  connectionState = 'connected',
  isScreenShare = false,
  isSpeaking = false,
  pc = null,
}) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
    }
  }, [stream]);

  const isReconnecting = connectionState === 'disconnected' || connectionState === 'failed';

  return (
    <div
      className={`relative w-full h-full bg-slate-900 rounded-2xl overflow-hidden border transition-all duration-200 flex items-center justify-center ${
        isSpeaking ? 'border-emerald-500 shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-500/40' : 'border-slate-800'
      }`}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal} // Prevents local acoustic audio feedback loop
        className={`w-full h-full ${
          isScreenShare ? 'object-contain bg-black' : isLocal ? 'object-cover -scale-x-100' : 'object-cover'
        } ${isVideoMuted ? 'hidden' : 'block'}`}
      />

      {/* Avatar Fallback when Camera is Off */}
      {isVideoMuted && (
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-indigo-700 to-indigo-500 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-xl">
            {name ? name[0].toUpperCase() : 'U'}
          </div>
          <span className="mt-3 text-sm font-medium text-slate-300">{name}</span>
        </div>
      )}

      {/* Reconnecting Overlay */}
      {isReconnecting && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-20">
          <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-amber-300">Reconnecting...</span>
        </div>
      )}

      {/* Top Left: Badges */}
      <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
        {isHost && (
          <span className="px-2 py-0.5 rounded-md bg-indigo-600/90 text-white text-[11px] font-semibold tracking-wide shadow-sm">
            Host
          </span>
        )}
        {isScreenShare && (
          <span className="px-2 py-0.5 rounded-md bg-blue-600/90 text-white text-[11px] font-semibold tracking-wide shadow-sm">
            Screen
          </span>
        )}
      </div>

      {/* Top Right: Connection Quality Badge */}
      {pc && (
        <div className="absolute top-3 right-3 z-10">
          <ConnectionBadge pc={pc} />
        </div>
      )}

      {/* Bottom Bar: Name & Mic Status */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
        <div className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-xs font-medium flex items-center gap-1.5 shadow-md max-w-[80%] truncate">
          <span className="truncate">{name}</span>
          {isLocal && <span className="text-slate-400 text-[10px]">(You)</span>}
        </div>

        <div className={`p-1.5 rounded-lg backdrop-blur-md ${isAudioMuted ? 'bg-red-500/80 text-white' : 'bg-black/60 text-emerald-400'}`}>
          {isAudioMuted ? (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
