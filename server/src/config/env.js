require('dotenv').config();

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 3000,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/baithak',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  JWT_SECRET: process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_in_production',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  TURN_SECRET: process.env.TURN_SECRET || 'my_turn_secret',
  TURN_URL: process.env.TURN_URL || 'turn:localhost:3478',
  STUN_URL: process.env.STUN_URL || 'stun:localhost:3478',
  MAX_PARTICIPANTS: parseInt(process.env.MAX_PARTICIPANTS, 10) || 6,
};

module.exports = env;
