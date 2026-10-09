import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';

export default function Dashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [meetings, setMeetings] = useState([]);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [joinError, setJoinError] = useState('');

  // Create meeting form
  const [title, setTitle] = useState('');
  const [password, setPassword] = useState('');
  const [waitingRoomEnabled, setWaitingRoomEnabled] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const refreshMeetings = async (showLoading = false) => {
    try {
      if (showLoading) setIsLoadingMeetings(true);
      const res = await api.get('/meetings');
      setMeetings(res.data.meetings || []);
    } catch (err) {
      console.error('Failed to fetch meetings:', err);
    } finally {
      setIsLoadingMeetings(false);
    }
  };

  useEffect(() => {
    refreshMeetings();
  }, []);

  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await api.post('/meetings', {
        title: title || 'Baithak Meeting',
        password: password ? password : undefined,
        waitingRoomEnabled,
      });
      setShowCreateModal(false);
      setTitle('');
      setPassword('');
      setWaitingRoomEnabled(false);
      navigate(`/room/${res.data.meeting.roomId}`);
    } catch (err) {
      console.error('Failed to create meeting:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinMeeting = (e) => {
    e.preventDefault();
    setJoinError('');
    let cleanedId = joinRoomId.trim();

    // Support entering full URL: e.g. http://localhost:5173/room/abc-defg-hij
    if (cleanedId.includes('/room/')) {
      cleanedId = cleanedId.split('/room/')[1].split('?')[0];
    }

    if (!cleanedId) {
      setJoinError('Please enter a room code or link');
      return;
    }

    navigate(`/room/${cleanedId}`);
  };

  const copyInviteLink = (roomId) => {
    const link = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(link);
    setCopiedId(roomId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-600/30">
            B
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Baithak</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-semibold text-slate-200">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="hidden sm:block text-left text-xs">
              <p className="font-semibold text-slate-200">{user?.name}</p>
              <p className="text-slate-400">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {/* Action Card: New Meeting */}
          <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-900/30 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-white">Start a Meeting</h2>
              <p className="text-xs text-slate-400 mt-1">
                Generate an instant P2P room with screen sharing, chat, and host controls.
              </p>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition shadow-lg shadow-indigo-600/30 text-center"
              >
                + New Meeting
              </button>
            </div>
          </div>

          {/* Action Card: Join Meeting */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-white">Join a Meeting</h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter an invitation code or meeting link to enter an active session.
              </p>
            </div>
            <form onSubmit={handleJoinMeeting} className="mt-6 flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                  placeholder="e.g. abc-defg-hij or link"
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
                <button
                  type="submit"
                  className="py-2.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm border border-slate-700 transition"
                >
                  Join
                </button>
              </div>
              {joinError && <p className="text-xs text-red-400">{joinError}</p>}
            </form>
          </div>
        </div>

        {/* Meeting History Section */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-semibold text-white">My Meetings</h3>
              <p className="text-xs text-slate-400">Past and scheduled rooms created by you</p>
            </div>
            <button
              onClick={refreshMeetings}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Refresh
            </button>
          </div>

          {isLoadingMeetings ? (
            <div className="py-8 text-center text-slate-500 text-sm">Loading your meetings...</div>
          ) : meetings.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              <p>You haven't created any meetings yet.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-3 text-xs text-indigo-400 hover:underline"
              >
                Create your first meeting
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {meetings.map((m) => (
                <div key={m.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-slate-200">{m.title}</h4>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                      <span className="font-mono text-slate-400">{m.roomId}</span>
                      <span>•</span>
                      <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                      {m.requiresPassword && (
                        <>
                          <span>•</span>
                          <span className="text-amber-400/90 text-[11px]">Protected</span>
                        </>
                      )}
                      {m.waitingRoomEnabled && (
                        <>
                          <span>•</span>
                          <span className="text-blue-400/90 text-[11px]">Waiting Room</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyInviteLink(m.roomId)}
                      className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                    >
                      {copiedId === m.roomId ? 'Copied!' : 'Copy Link'}
                    </button>
                    <button
                      onClick={() => navigate(`/room/${m.roomId}`)}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition"
                    >
                      Enter Room
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Create Meeting Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">Create a New Meeting</h3>
            <form onSubmit={handleCreateMeeting} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Meeting Title (optional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Weekly Team Sync"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Passcode (optional)
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave empty for open access"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="waitingRoom"
                  checked={waitingRoomEnabled}
                  onChange={(e) => setWaitingRoomEnabled(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="waitingRoom" className="text-xs text-slate-300">
                  Enable Waiting Room (Host must admit participants)
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition shadow-md shadow-indigo-600/30 disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Start Meeting'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
