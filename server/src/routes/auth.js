const express = require('express');
const { z } = require('zod');
const { validate } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimit');
const { register, login, refresh, logout } = require('../controllers/authController');

const router = express.Router();

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh', refresh);
router.post('/logout', logout);

module.exports = router;
