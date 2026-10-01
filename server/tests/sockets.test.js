const http = require('http');
const { Server } = require('socket.io');
const ioClient = require('socket.io-client');
const app = require('../src/app');
const Meeting = require('../src/models/Meeting');
const Message = require('../src/models/Message');
const { initSockets } = require('../src/sockets');
const { generateJoinToken } = require('../src/services/tokenService');

jest.mock('../src/models/Meeting');
jest.mock('../src/models/Message');

describe('Socket.io Signaling & Room Server', () => {
  let server;
  let io;
  let port;
  let clientSockets = [];

  const roomId = 'test-room-123';

  beforeAll((done) => {
    server = http.createServer(app);
    io = new Server(server);
    initSockets(io);

    server.listen(0, () => {
      port = server.address().port;
      done();
    });
  });

  afterAll((done) => {
    clientSockets.forEach((s) => s.disconnect());
    io.close();
    server.close(done);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    Meeting.findOne.mockResolvedValue({
      roomId,
      title: 'Test Meeting',
      waitingRoomEnabled: false,
      isLocked: false,
    });
    Message.create.mockImplementation((data) =>
      Promise.resolve({
        _id: 'msg_1',
        ...data,
        createdAt: new Date().toISOString(),
      })
    );
  });

  afterEach(() => {
    clientSockets.forEach((s) => s.disconnect());
    clientSockets = [];
  });

  function createClient(token) {
    const socket = ioClient(`http://localhost:${port}`, {
      auth: { token },
      transports: ['websocket'],
      forceNew: true,
    });
    clientSockets.push(socket);
    return socket;
  }

  it('should reject connection when join token is missing', (done) => {
    const socket = createClient(null);
    socket.on('connect_error', (err) => {
      expect(err.message).toMatch(/join token required/i);
      done();
    });
  });

  it('should authenticate and allow join/leave with participant broadcasts', (done) => {
    const hostToken = generateJoinToken({
      roomId,
      userId: 'host_1',
      name: 'Host Alice',
      isHost: true,
    });
    const guestToken = generateJoinToken({
      roomId,
      userId: 'guest_1',
      name: 'Guest Bob',
      isHost: false,
    });

    const hostSocket = createClient(hostToken);

    hostSocket.on('connect', () => {
      hostSocket.emit('room:join', { roomId, name: 'Host Alice' });
    });

    hostSocket.on('room:joined', (data) => {
      expect(data.isHost).toBe(true);
      expect(data.participants).toHaveLength(0);

      // Now guest connects
      const guestSocket = createClient(guestToken);

      hostSocket.on('room:participant-joined', ({ participant }) => {
        expect(participant.name).toBe('Guest Bob');

        // Guest leaves
        guestSocket.emit('room:leave');
      });

      hostSocket.on('room:participant-left', ({ id }) => {
        expect(id).toBe(guestSocket.id);
        done();
      });

      guestSocket.on('connect', () => {
        guestSocket.emit('room:join', { roomId, name: 'Guest Bob' });
      });

      guestSocket.on('room:joined', (guestData) => {
        expect(guestData.isHost).toBe(false);
        expect(guestData.participants).toHaveLength(1);
        expect(guestData.participants[0].name).toBe('Host Alice');
      });
    });
  });

  it('should relay WebRTC signaling (offer, answer, ice-candidate) between peers', (done) => {
    const tokenA = generateJoinToken({ roomId, userId: 'peer_a', name: 'Alice', isHost: true });
    const tokenB = generateJoinToken({ roomId, userId: 'peer_b', name: 'Bob', isHost: false });

    const socketA = createClient(tokenA);
    const socketB = createClient(tokenB);

    socketA.on('connect', () => socketA.emit('room:join', { roomId, name: 'Alice' }));
    socketB.on('connect', () => socketB.emit('room:join', { roomId, name: 'Bob' }));

    socketB.on('room:joined', () => {
      // Alice sends offer to Bob
      socketA.emit('signal:offer', {
        to: socketB.id,
        sdp: { type: 'offer', sdp: 'fake_offer_sdp' },
      });
    });

    socketB.on('signal:offer', ({ from, sdp }) => {
      expect(from).toBe(socketA.id);
      expect(sdp.sdp).toBe('fake_offer_sdp');

      // Bob answers Alice
      socketB.emit('signal:answer', {
        to: socketA.id,
        sdp: { type: 'answer', sdp: 'fake_answer_sdp' },
      });
    });

    socketA.on('signal:answer', ({ from, sdp }) => {
      expect(from).toBe(socketB.id);
      expect(sdp.sdp).toBe('fake_answer_sdp');

      // Alice sends ICE candidate
      socketA.emit('signal:ice-candidate', {
        to: socketB.id,
        candidate: { candidate: 'candidate:1 1 UDP 12345' },
      });
    });

    socketB.on('signal:ice-candidate', ({ from, candidate }) => {
      expect(from).toBe(socketA.id);
      expect(candidate.candidate).toBe('candidate:1 1 UDP 12345');
      done();
    });
  });

  it('should reject host commands from non-host participants', (done) => {
    const guestToken = generateJoinToken({
      roomId,
      userId: 'guest_non_host',
      name: 'Guest Hacker',
      isHost: false,
    });
    const socket = createClient(guestToken);

    socket.on('connect', () => {
      socket.emit('room:join', { roomId, name: 'Guest Hacker' });
    });

    socket.on('room:joined', () => {
      socket.emit('host:mute', { targetId: 'someone_else' });
    });

    socket.on('error', (err) => {
      expect(err.code).toBe('FORBIDDEN');
      expect(err.message).toMatch(/host privileges required/i);
      done();
    });
  });

  it('should allow host to mute participants', (done) => {
    const hostToken = generateJoinToken({ roomId, userId: 'host_u', name: 'Host', isHost: true });
    const guestToken = generateJoinToken({ roomId, userId: 'guest_u', name: 'Guest', isHost: false });

    const hostSocket = createClient(hostToken);
    const guestSocket = createClient(guestToken);

    hostSocket.on('connect', () => hostSocket.emit('room:join', { roomId, name: 'Host' }));
    guestSocket.on('connect', () => guestSocket.emit('room:join', { roomId, name: 'Guest' }));

    guestSocket.on('room:joined', () => {
      hostSocket.emit('host:mute', { targetId: guestSocket.id });
    });

    guestSocket.on('host:muted', (payload) => {
      expect(payload.byHost).toBe(true);
      done();
    });
  });

  it('should handle waiting room flow: guest enters waiting room and host admits them', (done) => {
    const wrRoomId = 'waiting-room-test';
    Meeting.findOne.mockResolvedValue({
      roomId: wrRoomId,
      title: 'Waiting Room Meeting',
      waitingRoomEnabled: true,
      isLocked: false,
    });

    const hostToken = generateJoinToken({ roomId: wrRoomId, userId: 'host_w', name: 'Host', isHost: true });
    const guestToken = generateJoinToken({ roomId: wrRoomId, userId: 'guest_w', name: 'Guest', isHost: false });

    const hostSocket = createClient(hostToken);
    const guestSocket = createClient(guestToken);

    hostSocket.on('connect', () => {
      hostSocket.emit('room:join', { roomId: wrRoomId, name: 'Host' });
    });

    hostSocket.on('room:joined', () => {
      guestSocket.emit('room:join', { roomId: wrRoomId, name: 'Guest' });
    });

    // Guest gets room:waiting
    guestSocket.on('room:waiting', () => {
      // Host receives waiting notification
    });

    hostSocket.on('host:waiting-user', ({ socketId, name }) => {
      expect(socketId).toBe(guestSocket.id);
      expect(name).toBe('Guest');

      // Host admits guest
      hostSocket.emit('host:admit', { targetId: guestSocket.id });
    });

    guestSocket.on('room:admitted', () => {
      // Guest receives admitted confirmation
    });

    guestSocket.on('room:joined', (data) => {
      expect(data.selfId).toBe(guestSocket.id);
      done();
    });
  });

  it('should sanitize chat messages and broadcast to the room', (done) => {
    const token = generateJoinToken({ roomId, userId: 'u_chat', name: 'Chatter', isHost: false });
    const socket = createClient(token);

    socket.on('connect', () => {
      socket.emit('room:join', { roomId, name: 'Chatter' });
    });

    socket.on('room:joined', () => {
      socket.emit('chat:send', { text: '<script>alert("hack")</script>' });
    });

    socket.on('chat:message', (msg) => {
      expect(msg.senderName).toBe('Chatter');
      expect(msg.text).toBe('&lt;script&gt;alert(&quot;hack&quot;)&lt;/script&gt;');
      done();
    });
  });

  it('should transfer host role to remaining participant when host disconnects', (done) => {
    const hostToken = generateJoinToken({ roomId, userId: 'h_transfer', name: 'Host', isHost: true });
    const peerToken = generateJoinToken({ roomId, userId: 'p_transfer', name: 'Peer', isHost: false });

    const hostSocket = createClient(hostToken);
    const peerSocket = createClient(peerToken);

    hostSocket.on('connect', () => hostSocket.emit('room:join', { roomId, name: 'Host' }));

    hostSocket.on('room:joined', () => {
      peerSocket.emit('room:join', { roomId, name: 'Peer' });
    });

    peerSocket.on('room:joined', () => {
      // Host leaves room
      hostSocket.emit('room:leave');
    });

    peerSocket.on('room:host-changed', ({ hostId, hostName }) => {
      expect(hostId).toBe(peerSocket.id);
      expect(hostName).toBe('Peer');
      done();
    });
  });
});
