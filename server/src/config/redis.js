const { createClient } = require('redis');
const env = require('./env');

let redisClient = null;
let isRedisReady = false;

// In-memory fallback storage when Redis service is not running
const memoryStorage = new Map();

const memoryFallback = {
  async hSet(key, field, value) {
    if (!memoryStorage.has(key)) memoryStorage.set(key, new Map());
    memoryStorage.get(key).set(field, value);
    return 1;
  },
  async hGet(key, field) {
    if (!memoryStorage.has(key)) return null;
    return memoryStorage.get(key).get(field) || null;
  },
  async hGetAll(key) {
    if (!memoryStorage.has(key)) return {};
    const obj = {};
    for (const [k, v] of memoryStorage.get(key).entries()) {
      obj[k] = v;
    }
    return obj;
  },
  async hDel(key, field) {
    if (!memoryStorage.has(key)) return 0;
    const deleted = memoryStorage.get(key).delete(field);
    return deleted ? 1 : 0;
  },
  async set(key, value) {
    memoryStorage.set(key, value);
    return 'OK';
  },
  async get(key) {
    return memoryStorage.get(key) || null;
  },
  async del(key) {
    return memoryStorage.delete(key) ? 1 : 0;
  },
  async expire() {
    return 1;
  },
};

async function initRedis() {
  if (process.env.NODE_ENV === 'test') {
    return memoryFallback;
  }

  try {
    redisClient = createClient({
      url: env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            console.warn('Redis reconnection limit reached, using memory store.');
            return false;
          }
          return Math.min(retries * 500, 2000);
        },
      },
    });

    redisClient.on('error', (err) => {
      if (!isRedisReady) {
        // Suppress repeated spam if Redis is absent in dev
      } else {
        console.error('Redis Client Error:', err.message);
      }
    });

    redisClient.on('ready', () => {
      isRedisReady = true;
      console.log('Connected to Redis');
    });

    await redisClient.connect();
    return redisClient;
  } catch (err) {
    console.warn(`Redis connection unavailable (${err.message}). Using in-memory fallback store.`);
    return memoryFallback;
  }
}

function getRedis() {
  if (isRedisReady && redisClient) {
    return redisClient;
  }
  return memoryFallback;
}

module.exports = {
  initRedis,
  getRedis,
  memoryFallback,
};
