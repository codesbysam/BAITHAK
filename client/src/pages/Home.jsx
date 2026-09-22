import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Home() {
  const { user } = useAuthStore();
  const [meetingCode, setMeetingCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleJoin = (e) => {
    e.preventDefault();
    setError('');
    let cleaned = meetingCode.trim();
    if (cleaned.includes('/room/')) {
      cleaned = cleaned.split('/room/')[1].split('?')[0];
    }
    if (!cleaned) {
      setError('Please enter a room code or link');
      return;
    }
    navigate(`/room/${cleaned}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-900/30 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30">
            M
          </div>
          <span className="text-xl font-bold tracking-tight text-white">MeetSpace</span>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <Link
              to="/dashboard"
              className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition shadow-md shadow-indigo-600/30"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="py-2 px-4 rounded-xl text-slate-300 hover:text-white font-medium text-xs transition"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition shadow-md shadow-indigo-600/30"
              >
                Sign up free
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-6">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Production-grade Peer-to-Peer WebRTC Mesh
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-3xl leading-tight">
          Video meetings engineered for privacy & performance.
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl">
          High-definition video, crystal-clear audio, real-time chat, and screen sharing powered by direct peer-to-peer browser streams. No media touches our servers.
        </p>

        {/* Quick Join / Action Box */}
        <div className="mt-10 w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl">
          <form onSubmit={handleJoin} className="flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={meetingCode}
                onChange={(e) => setMeetingCode(e.target.value)}
                placeholder="Enter meeting code (e.g. abc-defg-hij)"
                className="flex-1 px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
              <button
                type="submit"
                className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition shadow-lg shadow-indigo-600/30"
              >
                Join
              </button>
            </div>
            {error && <p className="text-xs text-red-400 text-left px-1">{error}</p>}
          </form>

          <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Want to host a meeting?</span>
            <Link to={user ? '/dashboard' : '/login'} className="text-indigo-400 hover:text-indigo-300 font-medium">
              Create a meeting →
            </Link>
          </div>
        </div>

        {/* Features grid */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left w-full">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold mb-3 text-sm">
              P2P
            </div>
            <h3 className="text-sm font-semibold text-white">Direct Mesh Media</h3>
            <p className="text-xs text-slate-400 mt-1">
              Encrypted SRTP media flows directly between browsers with minimal latency.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold mb-3 text-sm">
              ICE
            </div>
            <h3 className="text-sm font-semibold text-white">STUN & Coturn TURN</h3>
            <p className="text-xs text-slate-400 mt-1">
              Guaranteed NAT & symmetric firewall traversal using time-limited HMAC TURN credentials.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold mb-3 text-sm">
              SEC
            </div>
            <h3 className="text-sm font-semibold text-white">Host Controls & Rooms</h3>
            <p className="text-xs text-slate-400 mt-1">
              Waiting rooms, host moderation, mute-all, room lock, and persistent room chat.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        MeetSpace • Full-Stack WebRTC Video Meeting Platform
      </footer>
    </div>
  );
}
