const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const pinoHttp = require('pino-http');
const pino = require('pino');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const meetingRoutes = require('./routes/meetings');
const iceRoutes = require('./routes/ice');
const { errorHandler } = require('./middleware/errorHandler');

const logger = pino({
  level: process.env.NODE_ENV === 'test' ? 'silent' : process.env.LOG_LEVEL || 'info',
});
const app = express();

app.use(helmet());
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server) or any origin in production
    callback(null, true);
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(pinoHttp({ logger }));

// API v1 Routes
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/meetings', meetingRoutes);
app.use('/api/v1/ice-servers', iceRoutes);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
