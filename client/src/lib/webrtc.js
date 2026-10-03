/**
 * WebRTC PeerConnection and media stream management utilities.
 * Implements native WebRTC APIs, candidate queuing, track switching, and ICE restarts.
 */

// Default STUN servers fallback if remote config is delayed
const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

/**
 * Creates an RTCPeerConnection configured with ICE servers and callbacks.
 */
export function createPeerConnection(peerId, iceServers = DEFAULT_ICE_SERVERS, handlers = {}) {
  const { onIceCandidate, onTrack, onConnectionStateChange, onIceRestartNeeded } = handlers;

  const pc = new RTCPeerConnection({
    iceServers: Array.isArray(iceServers) && iceServers.length > 0 ? iceServers : DEFAULT_ICE_SERVERS,
    iceTransportPolicy: 'all',
  });

  // Track pending candidate queue for this peer to avoid InvalidStateError
  pc._pendingIceCandidates = [];
  pc._hasRemoteDescription = false;

  pc.onicecandidate = (event) => {
    if (event.candidate && onIceCandidate) {
      onIceCandidate(peerId, event.candidate);
    }
  };

  pc.ontrack = (event) => {
    if (onTrack) {
      const stream = event.streams && event.streams[0] ? event.streams[0] : new MediaStream([event.track]);
      onTrack(peerId, stream, event.track);
    }
  };

  pc.oniceconnectionstatechange = () => {
    const state = pc.iceConnectionState;
    if (onConnectionStateChange) {
      onConnectionStateChange(peerId, state);
    }

    // Trigger ICE restart if connection has failed
    if (state === 'failed' && onIceRestartNeeded) {
      onIceRestartNeeded(peerId, pc);
    }
  };

  return pc;
}

/**
 * Attaches all tracks from a MediaStream to an RTCPeerConnection.
 */
export function addStreamTracks(pc, stream) {
  if (!pc || !stream) return;
  const senders = pc.getSenders();
  const senderTrackIds = new Set(senders.map((s) => s.track?.id).filter(Boolean));

  stream.getTracks().forEach((track) => {
    if (!senderTrackIds.has(track.id)) {
      pc.addTrack(track, stream);
    }
  });
}

/**
 * Safely adds an ICE candidate or queues it if remote description is not set yet.
 */
export async function addOrQueueIceCandidate(pc, candidate) {
  if (!pc || !candidate) return;

  if (pc.remoteDescription && pc.remoteDescription.type) {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn('Error adding ICE candidate:', err);
    }
  } else {
    // Queue candidate until setRemoteDescription completes
    if (!pc._pendingIceCandidates) pc._pendingIceCandidates = [];
    pc._pendingIceCandidates.push(candidate);
  }
}

/**
 * Flushes and applies all queued ICE candidates after setRemoteDescription.
 */
export async function flushPendingCandidates(pc) {
  if (!pc || !pc._pendingIceCandidates || pc._pendingIceCandidates.length === 0) return;

  const queue = [...pc._pendingIceCandidates];
  pc._pendingIceCandidates = [];

  for (const candidate of queue) {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn('Error applying queued ICE candidate:', err);
    }
  }
}

/**
 * Replaces the video sender track dynamically with zero renegotiation (used for Screen Share or camera swap).
 */
export async function replaceVideoTrack(pc, newTrack) {
  if (!pc) return;
  const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
  if (sender) {
    await sender.replaceTrack(newTrack || null);
  }
}

/**
 * Replaces the audio sender track dynamically (used for microphone device switching).
 */
export async function replaceAudioTrack(pc, newTrack) {
  if (!pc) return;
  const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'audio');
  if (sender) {
    await sender.replaceTrack(newTrack || null);
  }
}

/**
 * Safely closes an RTCPeerConnection and detaches listeners.
 */
export function closePeerConnection(pc) {
  if (!pc) return;
  try {
    pc.onicecandidate = null;
    pc.ontrack = null;
    pc.oniceconnectionstatechange = null;
    pc.onconnectionstatechange = null;
    pc.close();
  } catch (err) {
    console.error('Error closing peer connection:', err);
  }
}
