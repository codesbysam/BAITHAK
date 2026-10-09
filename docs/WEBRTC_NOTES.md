# WebRTC Architecture & Design Decisions in Baithak

This document explains the WebRTC signaling and media architecture used in Baithak.

---

## 1. Signaling: Perfect Negotiation & Mesh Topology

### Peer-to-Peer Mesh Overview
In Baithak, media (audio, video, and screen sharing) flows directly between browsers over SRTP (Secure Real-time Transport Protocol). The Node.js server acts strictly as a **signaling server** and never touches or decodes raw media.

For $N$ participants, each client maintains $N - 1$ bidirectional `RTCPeerConnection` instances.
Because bandwidth and CPU grow with $O(N^2)$ connections, peer-to-peer mesh is optimized for small groups (capped at **6 participants** via `MAX_PARTICIPANTS`). For larger meetings (e.g. 50+ participants), a Selective Forwarding Unit (SFU) such as mediasoup or LiveKit is required.

---

## 2. Why the Newcomer Always Initiates Offers (Avoiding Glare)

### The Glare Problem
When two WebRTC peers decide to initiate a connection simultaneously, both generate and send an SDP offer at the same time. This race condition is known as **glare**. Without deterministic arbitration, both peers reject each other's offers or enter an unstable signaling state (`have-local-offer` vs `have-remote-offer`).

### Our Solution
Baithak employs a deterministic rule: **The newcomer always initiates**.
1. When User C joins a room with Users A and B:
   - Server sends `room:joined` to User C containing `participants: [A, B]`.
   - User C creates `RTCPeerConnection` for A and B, adds local tracks, creates SDP offers, and emits `signal:offer { to: A }` and `signal:offer { to: B }`.
2. Existing users (A and B) **never** send offers to newcomers. They simply wait for User C's offer, set it as their remote description, and respond with an SDP answer via `signal:answer`.
3. This eliminates glare entirely without needing polite/impolite renegotiation state machines during initial room joins.

---

## 3. ICE Candidate Trickling & Pre-Description Queuing

### Trickle ICE
Instead of waiting for all ICE candidates to be gathered before sending the SDP offer (which causes multi-second connection delays), Baithak uses **Trickle ICE**. Candidates are streamed via `signal:ice-candidate` the instant they are discovered by `pc.onicecandidate`.

### The Queuing Invariant
A peer cannot call `pc.addIceCandidate(candidate)` before `pc.setRemoteDescription(...)` has successfully executed. If a candidate arrives early due to network race conditions, calling `addIceCandidate` will throw an `InvalidStateError`.

**Implementation:**
Each peer connection maintains a candidate queue:
```javascript
if (!pc.remoteDescription || !pc.remoteDescription.type) {
  pendingIceCandidates.get(peerId).push(candidate);
} else {
  await pc.addIceCandidate(new RTCIceCandidate(candidate));
}
```
As soon as `pc.setRemoteDescription` completes (either for an offer or answer), the queued candidates are flushed and added sequentially.

---

## 4. STUN vs. TURN & Coturn Credentials

### STUN (Session Traversal Utilities for NAT)
- Translates private LAN IP addresses into public IP/port mappings.
- Works for ~80% of consumer NAT configurations (Full Cone, Restricted Cone).
- Free, lightweight, and does not relay media.

### TURN (Traversal Using Relays around NAT)
- Required when either peer is behind a **Symmetric NAT** or strict enterprise firewall that blocks direct UDP peer connections.
- Coturn relays encrypted media packets between the two endpoints.
- Requires authentication to prevent bandwidth abuse.

### Time-Limited Ephemeral Credentials
Baithak never exposes static passwords. Coturn is configured with `use-auth-secret` and `static-auth-secret`. The backend generates dynamic HMAC-SHA1 tokens with a 1-hour expiration timestamp:
```javascript
username = `${timestamp}:${userId}`
password = HMAC_SHA1(TURN_SECRET, username).toBase64()
```

---

## 5. Screen Sharing: Why `RTCRtpSender.replaceTrack` is Used

### Renegotiation Overhead
Traditionally, adding a new media track requires renegotiating SDP with all peers (`createOffer` -> `setLocalDescription` -> signaling relay -> `setRemoteDescription` -> `createAnswer`). In a 6-user mesh, renegotiating 5 peer connections introduces screen flicker, audio hiccups, and latency.

### Seamless Track Replacement
Because video senders already have an active media stream pipeline negotiated, `RTCRtpSender.replaceTrack` dynamically switches the input from the user's camera track to the screen capture track (`getDisplayMedia`):
```javascript
const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
if (sender) {
  await sender.replaceTrack(screenTrack);
}
```
- **Zero renegotiation:** No SDP offer/answer cycle is needed.
- **Instantaneous:** Peers immediately receive the screen frame stream on the existing video pipeline.
- When screen sharing ends (`screenTrack.onended`), the sender track is switched back to the camera track using the same `replaceTrack` API.

---

## 6. Connection Failure & ICE Restarts

If network conditions change (e.g. Wi-Fi drops, VPN connected), `pc.iceConnectionState` switches to `'disconnected'` and eventually `'failed'`.

Upon reaching `'failed'`:
1. The peer triggers an **ICE Restart**:
   ```javascript
   const offer = await pc.createOffer({ iceRestart: true });
   await pc.setLocalDescription(offer);
   socket.emit('signal:offer', { to: peerId, sdp: pc.localDescription });
   ```
2. The UI displays a "Reconnecting..." badge on the peer's video tile.
3. If the connection cannot be recovered within 15 seconds, the peer is safely cleaned up.
