import { useEffect, useRef, useCallback } from 'react';
import { getSocket } from '../lib/socket';
import {
  createPeerConnection,
  addStreamTracks,
  addOrQueueIceCandidate,
  flushPendingCandidates,
  closePeerConnection,
  replaceVideoTrack,
  replaceAudioTrack,
} from '../lib/webrtc';
import { useRoomStore } from '../store/roomStore';

export function usePeerConnections() {
  const {
    roomId,
    joinToken,
    localStream,
    isAudioEnabled,
    isVideoEnabled,
    setSelfSocketId,
    addOrUpdatePeer,
    removePeer,
    setPeerStream,
    setIsHost,
    setIsWaiting,
    setIsLocked,
    setWaitingUsers,
    addMessage,
    toggleAudio,
  } = useRoomStore();

  const pcsRef = useRef(new Map()); // socketId -> RTCPeerConnection
  const iceServersRef = useRef([]);

  // Create an RTCPeerConnection for a specific remote peer
  const getOrCreatePeerConnection = useCallback(
    (peerSocketId, peerData = {}) => {
      let pc = pcsRef.current.get(peerSocketId);
      if (pc) return pc;

      const socket = getSocket(joinToken);

      pc = createPeerConnection(peerSocketId, iceServersRef.current, {
        onIceCandidate: (targetId, candidate) => {
          socket.emit('signal:ice-candidate', {
            to: targetId,
            candidate,
          });
        },
        onTrack: (targetId, stream) => {
          setPeerStream(targetId, stream);
        },
        onConnectionStateChange: (targetId, state) => {
          addOrUpdatePeer(targetId, { connectionState: state });
        },
        onIceRestartNeeded: async (targetId, failedPc) => {
          try {
            console.warn(`ICE failed for peer ${targetId}. Triggering ICE restart.`);
            const restartOffer = await failedPc.createOffer({ iceRestart: true });
            await failedPc.setLocalDescription(restartOffer);
            socket.emit('signal:offer', {
              to: targetId,
              sdp: failedPc.localDescription,
            });
          } catch (err) {
            console.error('Failed to execute ICE restart:', err);
          }
        },
      });

      // Attach current local media tracks to the peer connection
      if (localStream) {
        addStreamTracks(pc, localStream);
      }

      pcsRef.current.set(peerSocketId, pc);

      if (peerData.name || peerData.userId) {
        addOrUpdatePeer(peerSocketId, peerData);
      }

      return pc;
    },
    [joinToken, localStream, addOrUpdatePeer, setPeerStream]
  );

  const mediaRef = useRef({ audio: isAudioEnabled, video: isVideoEnabled });
  useEffect(() => {
    mediaRef.current = { audio: isAudioEnabled, video: isVideoEnabled };
  }, [isAudioEnabled, isVideoEnabled]);

  // Ensure local tracks are attached to all active peer connections
  useEffect(() => {
    if (!localStream) return;
    pcsRef.current.forEach((pc) => {
      addStreamTracks(pc, localStream);
    });
  }, [localStream]);

  // Initialize socket listeners and signaling lifecycle
  useEffect(() => {
    if (!roomId || !joinToken) return;

    const socket = getSocket(joinToken);

    const emitJoin = () => {
      socket.emit('room:join', {
        roomId,
        media: mediaRef.current,
      });
    };

    if (socket.connected) {
      emitJoin();
    } else {
      socket.on('connect', emitJoin);
      socket.connect();
    }

    // 1. Join confirmation from server
    socket.on('room:joined', async (data) => {
      setSelfSocketId(data.selfId);
      setIsHost(!!data.isHost);
      setIsWaiting(false);

      if (data.iceServers) {
        iceServersRef.current = data.iceServers;
      }

      // RULE: The newcomer initiates offers to all existing participants to prevent glare
      if (Array.isArray(data.participants)) {
        for (const existingPeer of data.participants) {
          addOrUpdatePeer(existingPeer.socketId, existingPeer);

          const pc = getOrCreatePeerConnection(existingPeer.socketId, existingPeer);

          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            socket.emit('signal:offer', {
              to: existingPeer.socketId,
              sdp: pc.localDescription,
            });
          } catch (err) {
            console.error(`Error initiating offer to ${existingPeer.socketId}:`, err);
          }
        }
      }
    });

    // 2. Waiting room status
    socket.on('room:waiting', () => {
      setIsWaiting(true);
    });

    socket.on('room:admitted', () => {
      setIsWaiting(false);
    });

    socket.on('room:denied', () => {
      setIsWaiting(false);
      alert('The host has denied admission to this meeting.');
      window.location.href = '/dashboard';
    });

    // 3. New participant enters room
    socket.on('room:participant-joined', ({ participant }) => {
      addOrUpdatePeer(participant.socketId, participant);
      // We don't send an offer here; the newcomer will send the offer to us
    });

    // 4. Remote peer leaves
    socket.on('room:participant-left', ({ id }) => {
      const pc = pcsRef.current.get(id);
      if (pc) {
        closePeerConnection(pc);
        pcsRef.current.delete(id);
      }
      removePeer(id);
    });

    // 5. Host transferred
    socket.on('room:host-changed', ({ hostId }) => {
      if (hostId === socket.id) {
        setIsHost(true);
      }
      addOrUpdatePeer(hostId, { isHost: true });
    });

    // 6. WebRTC Signaling: Offer received
    socket.on('signal:offer', async ({ from, sdp }) => {
      try {
        const pc = getOrCreatePeerConnection(from);

        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        await flushPendingCandidates(pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('signal:answer', {
          to: from,
          sdp: pc.localDescription,
        });
      } catch (err) {
        console.error(`Error handling signal:offer from ${from}:`, err);
      }
    });

    // 7. WebRTC Signaling: Answer received
    socket.on('signal:answer', async ({ from, sdp }) => {
      try {
        const pc = pcsRef.current.get(from);
        if (!pc) return;

        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        await flushPendingCandidates(pc);
      } catch (err) {
        console.error(`Error handling signal:answer from ${from}:`, err);
      }
    });

    // 8. WebRTC Signaling: Trickle ICE Candidate received
    socket.on('signal:ice-candidate', async ({ from, candidate }) => {
      const pc = pcsRef.current.get(from);
      if (pc) {
        await addOrQueueIceCandidate(pc, candidate);
      }
    });

    // 9. Peer media state changes
    socket.on('media:state', ({ id, audio, video, screen }) => {
      addOrUpdatePeer(id, { audio, video, screen });
    });

    // 10. Chat messages
    socket.on('chat:message', (msg) => {
      addMessage(msg);
    });

    // 11. Host moderation
    socket.on('host:muted', ({ byHost }) => {
      if (byHost) {
        toggleAudio(false);
      }
    });

    socket.on('host:removed', () => {
      alert('You have been removed from the meeting by the host.');
      window.location.href = '/dashboard';
    });

    socket.on('room:locked', ({ locked }) => {
      setIsLocked(locked);
    });

    socket.on('host:waiting-user', (user) => {
      useRoomStore.setState((state) => ({
        waitingUsers: [...state.waitingUsers.filter((u) => u.socketId !== user.socketId), user],
      }));
    });

    socket.on('host:waiting-list', ({ waiting }) => {
      setWaitingUsers(waiting || []);
    });

    // Reconnection handling: on socket reconnect, rejoin room
    socket.on('reconnect', emitJoin);

    const pcs = pcsRef.current;

    return () => {
      // Leave room and cleanup all peer connections
      socket.emit('room:leave');

      pcs.forEach((pc) => closePeerConnection(pc));
      pcs.clear();

      socket.off('connect', emitJoin);
      socket.off('reconnect', emitJoin);
      socket.off('room:joined');
      socket.off('room:waiting');
      socket.off('room:admitted');
      socket.off('room:denied');
      socket.off('room:participant-joined');
      socket.off('room:participant-left');
      socket.off('room:host-changed');
      socket.off('signal:offer');
      socket.off('signal:answer');
      socket.off('signal:ice-candidate');
      socket.off('media:state');
      socket.off('chat:message');
      socket.off('host:muted');
      socket.off('host:removed');
      socket.off('room:locked');
      socket.off('host:waiting-user');
      socket.off('host:waiting-list');
    };
  }, [
    roomId,
    joinToken,
    getOrCreatePeerConnection,
    addOrUpdatePeer,
    removePeer,
    setSelfSocketId,
    setIsHost,
    setIsWaiting,
    setIsLocked,
    setWaitingUsers,
    addMessage,
    toggleAudio,
    isAudioEnabled,
    isVideoEnabled,
  ]);

  const replaceVideoTrackAllPeers = useCallback(async (newTrack) => {
    const promises = [];
    for (const pc of pcsRef.current.values()) {
      promises.push(replaceVideoTrack(pc, newTrack));
    }
    await Promise.all(promises);
  }, []);

  const replaceAudioTrackAllPeers = useCallback(async (newTrack) => {
    const promises = [];
    for (const pc of pcsRef.current.values()) {
      promises.push(replaceAudioTrack(pc, newTrack));
    }
    await Promise.all(promises);
  }, []);

  return {
    pcsRef,
    replaceVideoTrackAllPeers,
    replaceAudioTrackAllPeers,
  };
}
