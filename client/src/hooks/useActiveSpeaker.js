import { useEffect, useRef } from 'react';
import { useRoomStore } from '../store/roomStore';

/**
 * Detects the active speaker across local and remote audio streams using AudioContext AnalyserNode.
 */
export function useActiveSpeaker() {
  const { localStream, isAudioEnabled, peers, setActiveSpeakerId } = useRoomStore();

  const audioContextRef = useRef(null);
  const analysersRef = useRef(new Map()); // id -> { analyser, source }
  const intervalRef = useRef(null);

  useEffect(() => {
    // Initialize Web Audio Context
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass();
    }
    const ctx = audioContextRef.current;

    // Helper to setup analyser for a given stream
    const setupAnalyser = (id, stream) => {
      if (!stream || stream.getAudioTracks().length === 0) return;
      if (analysersRef.current.has(id)) return;

      try {
        if (ctx.state === 'suspended') {
          ctx.resume();
        }

        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.5;
        source.connect(analyser);

        analysersRef.current.set(id, { analyser, source });
      } catch (err) {
        console.warn(`Could not attach AudioAnalyser for ${id}:`, err);
      }
    };

    // 1. Setup local stream analyser
    if (localStream && isAudioEnabled) {
      setupAnalyser('local', localStream);
    } else {
      const existing = analysersRef.current.get('local');
      if (existing) {
        existing.source.disconnect();
        analysersRef.current.delete('local');
      }
    }

    // 2. Setup remote peers analysers
    const peerEntries = Object.entries(peers);
    const activePeerIds = new Set(peerEntries.map(([id]) => id));

    peerEntries.forEach(([peerId, peer]) => {
      if (peer.stream && peer.audio !== false) {
        setupAnalyser(peerId, peer.stream);
      } else {
        const existing = analysersRef.current.get(peerId);
        if (existing) {
          existing.source.disconnect();
          analysersRef.current.delete(peerId);
        }
      }
    });

    // Cleanup disconnected peers from analysers
    for (const [id, node] of analysersRef.current.entries()) {
      if (id !== 'local' && !activePeerIds.has(id)) {
        node.source.disconnect();
        analysersRef.current.delete(id);
      }
    }

    // 3. Periodic audio volume sampling loop
    const checkVolume = () => {
      let loudestId = null;
      let highestVolume = 15; // Noise floor threshold (0-255 scale)

      const buffer = new Uint8Array(128);

      for (const [id, { analyser }] of analysersRef.current.entries()) {
        analyser.getByteFrequencyData(buffer);

        // Calculate average amplitude
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i];
        }
        const average = sum / buffer.length;

        if (average > highestVolume) {
          highestVolume = average;
          loudestId = id;
        }
      }

      setActiveSpeakerId(loudestId);
    };

    intervalRef.current = setInterval(checkVolume, 150);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [localStream, isAudioEnabled, peers, setActiveSpeakerId]);

  // Global unmount cleanup
  useEffect(() => {
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);
}
