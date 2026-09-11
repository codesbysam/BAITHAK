const express = require('express');
const { authenticateUser } = require('../middleware/auth');
const { getMe } = require('../controllers/authController');

const router = express.Router();

router.get('/me', authenticateUser, getMe);

module.exports = router;
