const express = require('express');
const { optionalUser } = require('../middleware/auth');
const { getIceServers } = require('../services/turnService');

const router = express.Router();

router.get('/', optionalUser, (req, res) => {
  const userId = req.user ? req.user.userId : 'guest';
  const iceServers = getIceServers(userId);
  return res.status(200).json({ iceServers });
});

module.exports = router;
