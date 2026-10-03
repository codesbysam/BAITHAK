import { create } from 'zustand';

export const useRoomStore = create((set, get) => ({
  roomId: null,
  meetingInfo: null,
  joinToken: null,
  isHost: false,
  selfSocketId: null,

  // Local media state
  localStream: null,
  isAudioEnabled: true,
  isVideoEnabled: true,
  isScreenSharing: false,
  screenStream: null,

  // Devices
  audioDevices: [],
  videoDevices: [],
  selectedAudioDeviceId: '',
  selectedVideoDeviceId: '',

  // Peers dictionary: socketId -> peer object
  peers: {},

  // Waiting room & meeting status
  waitingUsers: [],
  isWaiting: false,
  isLocked: false,

  // Chat
  messages: [],

  // Active speaker
  activeSpeakerId: null,

  // Actions
  setRoomId: (roomId) => set({ roomId }),
  setMeetingInfo: (meetingInfo) => set({ meetingInfo }),
  setJoinToken: (joinToken) => set({ joinToken }),
  setIsHost: (isHost) => set({ isHost }),
  setSelfSocketId: (selfSocketId) => set({ selfSocketId }),

  setLocalStream: (stream) => {
    set({ localStream: stream });
  },

  setDevices: ({ audioDevices, videoDevices }) => {
    set({ audioDevices, videoDevices });
  },
  setSelectedAudioDeviceId: (id) => set({ selectedAudioDeviceId: id }),
  setSelectedVideoDeviceId: (id) => set({ selectedVideoDeviceId: id }),

  toggleAudio: (enabled) => {
    const stream = get().localStream;
    const newState = enabled !== undefined ? enabled : !get().isAudioEnabled;
    if (stream) {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = newState;
      });
    }
    set({ isAudioEnabled: newState });
    return newState;
  },

  toggleVideo: (enabled) => {
    const stream = get().localStream;
    const newState = enabled !== undefined ? enabled : !get().isVideoEnabled;
    if (stream) {
      stream.getVideoTracks().forEach((track) => {
        track.enabled = newState;
      });
    }
    set({ isVideoEnabled: newState });
    return newState;
  },

  setScreenSharing: (isSharing, screenStream = null) => {
    set({ isScreenSharing: isSharing, screenStream });
  },

  addOrUpdatePeer: (socketId, peerData) => {
    set((state) => {
      const existing = state.peers[socketId] || {};
      return {
        peers: {
          ...state.peers,
          [socketId]: {
            socketId,
            ...existing,
            ...peerData,
          },
        },
      };
    });
  },

  removePeer: (socketId) => {
    set((state) => {
      const updated = { ...state.peers };
      delete updated[socketId];
      return { peers: updated };
    });
  },

  setPeerStream: (socketId, stream) => {
    set((state) => {
      const existing = state.peers[socketId];
      if (!existing) return state;
      return {
        peers: {
          ...state.peers,
          [socketId]: {
            ...existing,
            stream,
          },
        },
      };
    });
  },

  setWaitingUsers: (waitingUsers) => set({ waitingUsers }),
  setIsWaiting: (isWaiting) => set({ isWaiting }),
  setIsLocked: (isLocked) => set({ isLocked }),

  addMessage: (message) => {
    set((state) => ({ messages: [...state.messages, message] }));
  },
  setMessages: (messages) => set({ messages }),

  setActiveSpeakerId: (id) => set({ activeSpeakerId: id }),

  resetRoom: () => {
    const stream = get().localStream;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    const screen = get().screenStream;
    if (screen) {
      screen.getTracks().forEach((t) => t.stop());
    }
    set({
      roomId: null,
      meetingInfo: null,
      joinToken: null,
      isHost: false,
      selfSocketId: null,
      localStream: null,
      isAudioEnabled: true,
      isVideoEnabled: true,
      isScreenSharing: false,
      screenStream: null,
      peers: {},
      waitingUsers: [],
      isWaiting: false,
      isLocked: false,
      messages: [],
      activeSpeakerId: null,
    });
  },
}));
