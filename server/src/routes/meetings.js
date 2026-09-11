const express = require('express');
const { z } = require('zod');
const { validate } = require('../middleware/validate');
const { authenticateUser, optionalUser, authenticateJoin } = require('../middleware/auth');
const {
  createMeeting,
  getMeetingPublicInfo,
  verifyMeetingAccess,
  getMyMeetings,
  getMeetingMessages,
} = require('../controllers/meetingController');

const router = express.Router();

const createMeetingSchema = z.object({
  title: z.string().trim().max(100).optional(),
  password: z.string().max(100).optional(),
  waitingRoomEnabled: z.boolean().optional(),
});

const verifyMeetingSchema = z.object({
  password: z.string().optional(),
  name: z.string().trim().max(50).optional(),
});

// Authenticated user creates a meeting
router.post('/', authenticateUser, validate(createMeetingSchema), createMeeting);

// Authenticated user gets their meeting history
router.get('/', authenticateUser, getMyMeetings);

// Public meeting info (check if meeting exists and requires password)
router.get('/:roomId', getMeetingPublicInfo);

// Verify password and get short-lived joinToken (works for guests and logged-in users)
router.post('/:roomId/verify', optionalUser, validate(verifyMeetingSchema), verifyMeetingAccess);

// Chat history (requires join token or logged in user)
router.get('/:roomId/messages', authenticateJoin, getMeetingMessages);

module.exports = router;
