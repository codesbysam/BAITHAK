const express = require('express');
const { optionalUser } = require('../middleware/auth');
const { getIceServersAsync } = require('../services/turnService');

const router = express.Router();

router.get('/', optionalUser, async (req, res) => {
  const userId = req.user ? req.user.userId : 'guest';
  const iceServers = await getIceServersAsync(userId);
  return res.status(200).json({ iceServers });
});

module.exports = router;
