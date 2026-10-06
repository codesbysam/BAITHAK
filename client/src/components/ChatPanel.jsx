import React, { useState, useEffect, useRef } from 'react';
import { useRoomStore } from '../store/roomStore';
import { useAuthStore } from '../store/authStore';
import { getSocket } from '../lib/socket';
import { api } from '../lib/api';

export default function ChatPanel({ isOpen, onClose }) {
  const { roomId, joinToken, messages, setMessages } = useRoomStore();
  const { user } = useAuthStore();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  // Fetch past messages on mount
  useEffect(() => {
    if (!roomId || !joinToken) return;

    const loadHistory = async () => {
      try {
        const res = await api.get(`/meetings/${roomId}/messages`, {
          headers: {
            Authorization: `Bearer ${joinToken}`,
          },
        });
        if (Array.isArray(res.data.messages)) {
          setMessages(res.data.messages);
        }
      } catch (err) {
        console.warn('Could not load message history:', err);
      }
    };

    loadHistory();
  }, [roomId, joinToken, setMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    const socket = getSocket(joinToken);
    if (socket?.connected) {
      socket.emit('chat:send', { text });
      setInputText('');
    }
  };

  if (!isOpen) return null;

  return (
    <aside className="w-80 sm:w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-full z-40 transition-all shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <h3 className="font-semibold text-white text-sm">Meeting Chat</h3>
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

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 text-xs px-4">
            <p>No messages yet.</p>
            <p className="mt-1">Messages sent here are visible to everyone in the room.</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderName === (user?.name || 'You');
            return (
              <div
                key={msg.id || index}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-400">
                  <span className="font-medium text-slate-300">{msg.senderName}</span>
                  <span>•</span>
                  <span>{msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                </div>
                <div
                  className={`px-3 py-2 rounded-2xl text-xs max-w-[85%] break-words leading-relaxed ${
                    isMe
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-slate-800 text-slate-200 rounded-bl-sm border border-slate-700/60'
                  }`}
                  dangerouslySetInnerHTML={{ __html: msg.text }}
                />
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Field */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-slate-900/50">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Send a message..."
            maxLength={1000}
            className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition shadow-md shadow-indigo-600/30"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </aside>
  );
}
