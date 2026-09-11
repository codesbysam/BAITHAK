const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../src/app');
const Meeting = require('../src/models/Meeting');
const { generateAccessToken } = require('../src/services/tokenService');

jest.mock('../src/models/Meeting');

describe('Meetings API (/api/v1/meetings)', () => {
  const hostUser = {
    userId: 'user_host_1',
    email: 'host@example.com',
    name: 'Host User',
  };
  const hostToken = generateAccessToken(hostUser);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/meetings', () => {
    it('should create a meeting when authenticated', async () => {
      Meeting.findOne.mockResolvedValue(null);
      Meeting.create.mockImplementation((data) =>
        Promise.resolve({
          _id: 'meeting_123',
          ...data,
          createdAt: new Date().toISOString(),
        })
      );

      const res = await request(app)
        .post('/api/v1/meetings')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({
          title: 'Design Review',
          waitingRoomEnabled: true,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.meeting.title).toBe('Design Review');
      expect(res.body.meeting.waitingRoomEnabled).toBe(true);
      expect(res.body.meeting).toHaveProperty('roomId');
      expect(res.body.meeting.requiresPassword).toBe(false);
    });

    it('should reject meeting creation if unauthorized', async () => {
      const res = await request(app)
        .post('/api/v1/meetings')
        .send({ title: 'Unauthenticated Meeting' });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/meetings/:roomId', () => {
    it('should return public info for existing meeting', async () => {
      Meeting.findOne.mockResolvedValue({
        roomId: 'abc-defg-hij',
        title: 'Sprint Planning',
        passwordHash: null,
        waitingRoomEnabled: false,
        isLocked: false,
        status: 'scheduled',
        createdAt: new Date(),
        toPublicJSON() {
          return {
            roomId: this.roomId,
            title: this.title,
            requiresPassword: false,
            waitingRoomEnabled: this.waitingRoomEnabled,
            isLocked: this.isLocked,
            status: this.status,
            createdAt: this.createdAt,
          };
        },
      });

      const res = await request(app).get('/api/v1/meetings/abc-defg-hij');
      expect(res.statusCode).toBe(200);
      expect(res.body.exists).toBe(true);
      expect(res.body.roomId).toBe('abc-defg-hij');
      expect(res.body.requiresPassword).toBe(false);
    });

    it('should return 404 for non-existent meeting', async () => {
      Meeting.findOne.mockResolvedValue(null);
      const res = await request(app).get('/api/v1/meetings/xyz-none-123');
      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /api/v1/meetings/:roomId/verify', () => {
    it('should allow joining open meeting without password and return joinToken', async () => {
      Meeting.findOne.mockResolvedValue({
        roomId: 'abc-defg-hij',
        title: 'Open Room',
        hostId: 'user_other',
        passwordHash: null,
        isLocked: false,
        toPublicJSON() {
          return { roomId: this.roomId, title: this.title, requiresPassword: false };
        },
      });

      const res = await request(app)
        .post('/api/v1/meetings/abc-defg-hij/verify')
        .send({ name: 'Guest Bob' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('joinToken');
      expect(res.body.isHost).toBe(false);
      expect(res.body.name).toBe('Guest Bob');
    });

    it('should recognize host when authenticated host joins their room', async () => {
      Meeting.findOne.mockResolvedValue({
        roomId: 'abc-defg-hij',
        title: 'Host Room',
        hostId: 'user_host_1',
        passwordHash: null,
        isLocked: false,
        toPublicJSON() {
          return { roomId: this.roomId, title: this.title, requiresPassword: false };
        },
      });

      const res = await request(app)
        .post('/api/v1/meetings/abc-defg-hij/verify')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({});

      expect(res.statusCode).toBe(200);
      expect(res.body.isHost).toBe(true);
      expect(res.body.name).toBe('Host User');
      expect(res.body).toHaveProperty('joinToken');
    });

    it('should reject wrong password on password-protected meeting', async () => {
      const passwordHash = await bcrypt.hash('roomPass123', 10);
      Meeting.findOne.mockResolvedValue({
        roomId: 'abc-defg-hij',
        title: 'Private Room',
        hostId: 'user_host_1',
        passwordHash,
        isLocked: false,
        toPublicJSON() {
          return { roomId: this.roomId, title: this.title, requiresPassword: true };
        },
      });

      const res = await request(app)
        .post('/api/v1/meetings/abc-defg-hij/verify')
        .send({ password: 'wrongPassword', name: 'Guest' });

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toMatch(/incorrect meeting password/i);
    });

    it('should grant access when correct password provided', async () => {
      const passwordHash = await bcrypt.hash('roomPass123', 10);
      Meeting.findOne.mockResolvedValue({
        roomId: 'abc-defg-hij',
        title: 'Private Room',
        hostId: 'user_host_1',
        passwordHash,
        isLocked: false,
        toPublicJSON() {
          return { roomId: this.roomId, title: this.title, requiresPassword: true };
        },
      });

      const res = await request(app)
        .post('/api/v1/meetings/abc-defg-hij/verify')
        .send({ password: 'roomPass123', name: 'Guest' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('joinToken');
    });
  });

  describe('GET /api/v1/meetings', () => {
    it('should return list of meetings created by current user', async () => {
      Meeting.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([
            {
              _id: 'm1',
              roomId: 'abc-1234-xyz',
              title: 'Standup',
              passwordHash: null,
              waitingRoomEnabled: false,
              status: 'scheduled',
              createdAt: new Date(),
            },
          ]),
        }),
      });

      const res = await request(app)
        .get('/api/v1/meetings')
        .set('Authorization', `Bearer ${hostToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('meetings');
      expect(res.body.meetings.length).toBe(1);
      expect(res.body.meetings[0].roomId).toBe('abc-1234-xyz');
    });
  });
});
