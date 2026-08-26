require('dotenv').config();
const http = require('http');
const app = require('./app');
const { Server } = require('socket.io');
const { connectDB, disconnectDB } = require('./config/db');
const { initRedis } = require('./config/redis');
const { initSockets } = require('./sockets');
const env = require('./config/env');

const PORT = env.PORT;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: env.CORS_ORIGIN,
    credentials: true,
  },
});

// Initialize socket handlers
initSockets(io);

async function start() {
  try {
    await connectDB();
    console.log('Connected to MongoDB');
  } catch (err) {
    console.warn('MongoDB connection failed on start. Server will continue with degraded DB mode:', err.message);
  }

  try {
    await initRedis();
  } catch (err) {
    console.warn('Redis init notice:', err.message);
  }

  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  server.close(async () => {
    await disconnectDB();
    process.exit(0);
  });
});

if (require.main === module) {
  start();
}

module.exports = { server, io };
