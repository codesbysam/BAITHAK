const { getIceServers } = require('../src/services/turnService');

describe('turnService', () => {
  it('should generate valid STUN and TURN configurations with short-lived HMAC credentials', () => {
    const iceServers = getIceServers('user_123');

    expect(Array.isArray(iceServers)).toBe(true);
    expect(iceServers.length).toBe(2);

    // STUN config
    const stun = iceServers[0];
    expect(stun).toHaveProperty('urls');
    expect(stun.urls).toContain('stun:');

    // TURN config
    const turn = iceServers[1];
    expect(turn).toHaveProperty('urls');
    expect(turn).toHaveProperty('username');
    expect(turn).toHaveProperty('credential');

    // Username format should be timestamp:userId
    const [timestampStr, user] = turn.username.split(':');
    expect(user).toBe('user_123');
    const timestamp = parseInt(timestampStr, 10);
    const nowSec = Math.floor(Date.now() / 1000);
    expect(timestamp).toBeGreaterThan(nowSec);
    expect(timestamp).toBeLessThanOrEqual(nowSec + 3600); // 1 hour TTL
  });
});
