const {
  hashToken,
  generateAccessToken,
  generateRefreshToken,
  generateJoinToken,
  verifyAccessToken,
  verifyJoinToken,
} = require('../src/services/tokenService');

describe('tokenService', () => {
  it('should generate and verify an access token', () => {
    const payload = { userId: '123', email: 'test@example.com', name: 'Alice' };
    const token = generateAccessToken(payload);
    expect(typeof token).toBe('string');

    const decoded = verifyAccessToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded.userId).toBe('123');
    expect(decoded.email).toBe('test@example.com');
    expect(decoded.name).toBe('Alice');
  });

  it('should return null for invalid or tampered access token', () => {
    const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature';
    expect(verifyAccessToken(invalidToken)).toBeNull();
    expect(verifyAccessToken(null)).toBeNull();
  });

  it('should generate unique random refresh tokens and correct sha256 hash', () => {
    const token1 = generateRefreshToken();
    const token2 = generateRefreshToken();
    expect(token1).not.toEqual(token2);

    const hash1 = hashToken(token1);
    const hash2 = hashToken(token1);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // 256 bits = 64 hex chars
  });

  it('should generate and verify a join token', () => {
    const payload = {
      roomId: 'abc-defg-hij',
      userId: 'user_456',
      name: 'Bob',
      isHost: true,
    };
    const joinToken = generateJoinToken(payload);
    expect(typeof joinToken).toBe('string');

    const decoded = verifyJoinToken(joinToken);
    expect(decoded).not.toBeNull();
    expect(decoded.roomId).toBe('abc-defg-hij');
    expect(decoded.userId).toBe('user_456');
    expect(decoded.name).toBe('Bob');
    expect(decoded.isHost).toBe(true);
  });
});
