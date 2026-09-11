const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../src/app');
const User = require('../src/models/User');
const RefreshToken = require('../src/models/RefreshToken');
const { generateAccessToken, hashToken } = require('../src/services/tokenService');

jest.mock('../src/models/User');
jest.mock('../src/models/RefreshToken');

describe('Auth API (/api/v1/auth)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully and return access token + cookie', async () => {
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({
        _id: 'user_123',
        name: 'Alice Smith',
        email: 'alice@example.com',
        createdAt: new Date().toISOString(),
      });
      RefreshToken.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Alice Smith',
          email: 'alice@example.com',
          password: 'password123',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe('alice@example.com');
      expect(res.body).toHaveProperty('accessToken');
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should reject registration if email is already taken', async () => {
      User.findOne.mockResolvedValue({ _id: 'existing_user' });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Alice Smith',
          email: 'alice@example.com',
          password: 'password123',
        });

      expect(res.statusCode).toBe(409);
      expect(res.body.error).toMatch(/already registered/i);
    });

    it('should fail validation on invalid payload (short password)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Alice',
          email: 'alice@example.com',
          password: '123', // less than 6 chars
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should log in a user with valid credentials', async () => {
      const passwordHash = await bcrypt.hash('secretPass123', 10);
      User.findOne.mockResolvedValue({
        _id: 'user_123',
        name: 'Alice',
        email: 'alice@example.com',
        passwordHash,
        createdAt: new Date().toISOString(),
      });
      RefreshToken.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'alice@example.com',
          password: 'secretPass123',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user.name).toBe('Alice');
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should reject login with wrong password', async () => {
      const passwordHash = await bcrypt.hash('secretPass123', 10);
      User.findOne.mockResolvedValue({
        _id: 'user_123',
        passwordHash,
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'alice@example.com',
          password: 'wrongPassword',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toMatch(/invalid email or password/i);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh access token using valid refresh cookie', async () => {
      const rawToken = 'sample_refresh_token';
      const tokenHash = hashToken(rawToken);

      RefreshToken.findOne.mockResolvedValue({
        _id: 'token_record_1',
        tokenHash,
        userId: 'user_123',
        expiresAt: new Date(Date.now() + 1000000),
      });
      User.findById.mockResolvedValue({
        _id: 'user_123',
        name: 'Alice',
        email: 'alice@example.com',
      });
      RefreshToken.deleteOne.mockResolvedValue({});
      RefreshToken.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`refreshToken=${rawToken}`]);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(RefreshToken.deleteOne).toHaveBeenCalled();
      expect(RefreshToken.create).toHaveBeenCalled();
    });

    it('should reject refresh if no cookie provided', async () => {
      const res = await request(app).post('/api/v1/auth/refresh');
      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/users/me', () => {
    it('should return user profile when valid access token is provided', async () => {
      const token = generateAccessToken({
        userId: 'user_123',
        email: 'alice@example.com',
        name: 'Alice',
      });

      User.findById.mockResolvedValue({
        _id: 'user_123',
        name: 'Alice',
        email: 'alice@example.com',
        createdAt: new Date().toISOString(),
      });

      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user.email).toBe('alice@example.com');
    });

    it('should reject with 401 when missing token', async () => {
      const res = await request(app).get('/api/v1/users/me');
      expect(res.statusCode).toBe(401);
    });
  });
});
