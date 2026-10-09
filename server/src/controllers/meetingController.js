const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { MeetingStore: Meeting, MessageStore: Message } = require('../models/storeAdapter');
const { generateRoomId } = require('../utils/roomId');
const { generateJoinToken } = require('../services/tokenService');

async function createMeeting(req, res, next) {
  try {
    const { title, password, waitingRoomEnabled } = req.body;

    let roomId = generateRoomId();
    // Ensure roomId is unique
    let existing = await Meeting.findOne({ roomId });
    while (existing) {
      roomId = generateRoomId();
      existing = await Meeting.findOne({ roomId });
    }

    let passwordHash = null;
    if (password && password.trim().length > 0) {
      passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    const meeting = await Meeting.create({
      roomId,
      title: title ? title.trim() : 'Baithak Meeting',
      hostId: req.user.userId,
      passwordHash,
      waitingRoomEnabled: !!waitingRoomEnabled,
      status: 'scheduled',
    });

    return res.status(201).json({
      meeting: {
        id: meeting._id.toString(),
        roomId: meeting.roomId,
        title: meeting.title,
        requiresPassword: !!meeting.passwordHash,
        waitingRoomEnabled: meeting.waitingRoomEnabled,
        status: meeting.status,
        createdAt: meeting.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getMeetingPublicInfo(req, res, next) {
  try {
    const { roomId } = req.params;
    const meeting = await Meeting.findOne({ roomId: roomId.toLowerCase() });

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    return res.status(200).json({
      exists: true,
      ...meeting.toPublicJSON(),
    });
  } catch (err) {
    next(err);
  }
}

async function verifyMeetingAccess(req, res, next) {
  try {
    const { roomId } = req.params;
    const { password, name } = req.body;

    const meeting = await Meeting.findOne({ roomId: roomId.toLowerCase() });
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    if (meeting.isLocked) {
      return res.status(403).json({ error: 'This meeting is locked by the host' });
    }

    // Check if password required
    if (meeting.passwordHash) {
      if (!password) {
        return res.status(401).json({ error: 'Meeting password required' });
      }
      const isMatch = await bcrypt.compare(password, meeting.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Incorrect meeting password' });
      }
    }

    const isHost = req.user ? req.user.userId === meeting.hostId.toString() : false;
    const participantName = req.user ? req.user.name : (name && name.trim()) || 'Guest';
    const participantId = req.user ? req.user.userId : `guest_${crypto.randomBytes(4).toString('hex')}`;

    const joinToken = generateJoinToken({
      roomId: meeting.roomId,
      userId: participantId,
      name: participantName,
      isHost,
    });

    return res.status(200).json({
      joinToken,
      meeting: meeting.toPublicJSON(),
      isHost,
      name: participantName,
      userId: participantId,
    });
  } catch (err) {
    next(err);
  }
}

async function getMyMeetings(req, res, next) {
  try {
    const meetings = await Meeting.find({ hostId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({
      meetings: meetings.map((m) => ({
        id: m._id.toString(),
        roomId: m.roomId,
        title: m.title,
        requiresPassword: !!m.passwordHash,
        waitingRoomEnabled: m.waitingRoomEnabled,
        status: m.status,
        startedAt: m.startedAt,
        endedAt: m.endedAt,
        createdAt: m.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
}

async function getMeetingMessages(req, res, next) {
  try {
    const { roomId } = req.params;
    const messages = await Message.find({ roomId: roomId.toLowerCase() })
      .sort({ createdAt: 1 })
      .limit(100);

    return res.status(200).json({
      messages: messages.map((msg) => ({
        id: msg._id.toString(),
        roomId: msg.roomId,
        senderName: msg.senderName,
        senderId: msg.senderId ? msg.senderId.toString() : null,
        text: msg.text,
        createdAt: msg.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createMeeting,
  getMeetingPublicInfo,
  verifyMeetingAccess,
  getMyMeetings,
  getMeetingMessages,
};
