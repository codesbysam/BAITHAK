# Testing Guide for Baithak

This document provides complete instructions for executing backend unit tests, socket integration tests, frontend builds, end-to-end tests with Playwright, and manual cross-device testing with ngrok and TURN relay-only mode.

---

## 1. Running Backend Tests

The backend test suite is built with **Jest**, **Supertest**, and **socket.io-client**.

```bash
# Navigate to the server directory
cd server

# Run all test suites
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test suites
npm test tests/auth.test.js
npm test tests/meetings.test.js
npm test tests/sockets.test.js
npm test tests/tokenService.test.js
npm test tests/turnService.test.js
```

### What is tested:
- **`tokenService.test.js`**: Generation, HMAC signing, and cryptographic verification of 15-minute Access Tokens, 7-day Refresh Tokens, SHA-256 token hashing, and short-lived Join Tokens.
- **`turnService.test.js`**: Dynamic Coturn HMAC-SHA1 credentials, timestamp validation, and STUN/TURN server URLs.
- **`auth.test.js`**: User registration, duplicate email prevention, bcrypt password verification, refresh token rotation, cookie security flags, and `/users/me` access token authorization.
- **`meetings.test.js`**: Meeting room generation, passcode verification, public metadata lookup, host recognition, and host meeting history.
- **`sockets.test.js`**: Socket handshake authentication, room join/leave broadcasts, SDP offer/answer/ICE relay between peers in the same room, rejection of host commands from non-hosts, remote muting, waiting room admit/deny, HTML chat sanitization, and automatic host failover.

---

## 2. Running Frontend Build & Linters

```bash
# Navigate to client directory
cd client

# Check linter rules
npm run lint

# Compile production bundle
npm run build
```

---

## 3. Running Playwright End-to-End (E2E) Tests

Playwright simulates a full multi-user WebRTC meeting using Chromium with native fake media devices:
- `--use-fake-device-for-media-stream`: Supplies synthetic video (rotating green clock) and synthetic audio.
- `--use-fake-ui-for-media-stream`: Automatically grants camera and microphone permissions without operating system dialog prompts.

### Prerequisites:
1. Start the backend server:
   ```bash
   cd server && npm start
   ```
2. Start the frontend development server:
   ```bash
   cd client && npm run dev
   ```

### Executing the E2E Suite:
```bash
# Navigate to e2e directory
cd e2e

# Install Playwright dependencies (first time only)
npm install
npx playwright install chromium

# Run tests in headless mode
npx playwright test

# Run tests in interactive headed mode (watch 3 browsers join)
npx playwright test --headed
```

---

## 4. Testing with a Smartphone via ngrok

To verify camera and microphone permissions and multi-device WebRTC mesh streaming over cellular and local Wi-Fi:

1. **Start ngrok tunnel on the client port**:
   ```bash
   ngrok http 5173
   ```
2. Ensure `VITE_API_URL` and `VITE_SOCKET_URL` in `client/.env` point to your public ngrok URL or set up a tunnel for port `3000`:
   ```bash
   ngrok http 3000
   ```
3. Open the HTTPS ngrok URL on your smartphone (Safari on iOS or Chrome on Android).
   > **Note:** Browsers strictly require HTTPS (or `localhost`) to access `navigator.mediaDevices.getUserMedia`. ngrok provides the required HTTPS termination.
4. Create a meeting on your laptop, copy the room link, and join from your phone.
5. Verify:
   - Video frames stream bidirectionally.
   - Microphone mute toggles reflect in real time on both devices.
   - Active speaker highlight border turns green when speaking into the phone.

---

## 5. Testing Coturn TURN Relay-Only Mode

By default, WebRTC attempts direct host-to-host or STUN reflexive connections first (`iceTransportPolicy: 'all'`). To guarantee that Coturn TURN relays and HMAC credentials are functioning under strict enterprise firewall conditions:

1. In [`client/src/lib/webrtc.js`](../client/src/lib/webrtc.js), change the peer connection configuration:
   ```javascript
   const pc = new RTCPeerConnection({
     iceServers: iceServers,
     iceTransportPolicy: 'relay', // Forces all media strictly through TURN server
   });
   ```
2. Start a meeting between two browser contexts.
3. Open Chrome DevTools -> **chrome://webrtc-internals**:
   - Inspect the selected **Candidate Pair** (`candidate-pair`).
   - Confirm that the `localCandidateType` and `remoteCandidateType` are set to **`relay`**.
   - Confirm that media packets (`bytesSent`, `bytesReceived`) are flowing exclusively through the Coturn relay server on port `3478`.
