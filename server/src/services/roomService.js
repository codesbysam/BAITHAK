const { getRedis } = require('../config/redis');
const env = require('../config/env');

const TTL_SECONDS = 24 * 60 * 60; // 24 hours

function getKeys(roomId) {
  const normId = roomId.toLowerCase();
  return {
    participantsKey: `room:${normId}:participants`,
    waitingKey: `room:${normId}:waiting`,
    metaKey: `room:${normId}:meta`,
  };
}

async function getRoomMeta(roomId) {
  const redis = getRedis();
  const { metaKey } = getKeys(roomId);
  const data = await redis.get(metaKey);
  if (!data) {
    return {
      hostSocketId: null,
      locked: false,
      maxParticipants: env.MAX_PARTICIPANTS,
    };
  }
  return typeof data === 'string' ? JSON.parse(data) : data;
}

async function setRoomMeta(roomId, meta) {
  const redis = getRedis();
  const { metaKey } = getKeys(roomId);
  await redis.set(metaKey, JSON.stringify(meta));
  await redis.expire(metaKey, TTL_SECONDS);
}

async function updateRoomMeta(roomId, partial) {
  const current = await getRoomMeta(roomId);
  const updated = { ...current, ...partial };
  await setRoomMeta(roomId, updated);
  return updated;
}

async function addParticipant(roomId, socketId, participantData) {
  const redis = getRedis();
  const { participantsKey } = getKeys(roomId);

  const payload = {
    userId: participantData.userId,
    name: participantData.name,
    isHost: !!participantData.isHost,
    audio: participantData.audio !== false,
    video: participantData.video !== false,
    screen: !!participantData.screen,
    joinedAt: participantData.joinedAt || Date.now(),
  };

  await redis.hSet(participantsKey, socketId, JSON.stringify(payload));
  await redis.expire(participantsKey, TTL_SECONDS);

  if (payload.isHost) {
    await updateRoomMeta(roomId, { hostSocketId: socketId });
  }

  return { socketId, ...payload };
}

async function getParticipant(roomId, socketId) {
  const redis = getRedis();
  const { participantsKey } = getKeys(roomId);
  const raw = await redis.hGet(participantsKey, socketId);
  if (!raw) return null;
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return { socketId, ...parsed };
}

async function getParticipants(roomId) {
  const redis = getRedis();
  const { participantsKey } = getKeys(roomId);
  const all = await redis.hGetAll(participantsKey);
  const participants = [];

  for (const [socketId, raw] of Object.entries(all)) {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    participants.push({ socketId, ...data });
  }

  return participants;
}

async function updateParticipantMedia(roomId, socketId, mediaState) {
  const redis = getRedis();
  const { participantsKey } = getKeys(roomId);
  const participant = await getParticipant(roomId, socketId);
  if (!participant) return null;

  const updated = {
    ...participant,
    ...(mediaState.audio !== undefined && { audio: mediaState.audio }),
    ...(mediaState.video !== undefined && { video: mediaState.video }),
    ...(mediaState.screen !== undefined && { screen: mediaState.screen }),
    ...(mediaState.raisedHand !== undefined && { raisedHand: mediaState.raisedHand }),
  };

  const toStore = { ...updated };
  delete toStore.socketId;
  await redis.hSet(participantsKey, socketId, JSON.stringify(toStore));
  return updated;
}

async function removeParticipant(roomId, socketId) {
  const redis = getRedis();
  const { participantsKey } = getKeys(roomId);
  await redis.hDel(participantsKey, socketId);
}

async function addWaitingUser(roomId, socketId, data) {
  const redis = getRedis();
  const { waitingKey } = getKeys(roomId);
  const payload = {
    userId: data.userId,
    name: data.name,
    socketId,
    joinedAt: Date.now(),
  };
  await redis.hSet(waitingKey, socketId, JSON.stringify(payload));
  await redis.expire(waitingKey, TTL_SECONDS);
  return payload;
}

async function removeWaitingUser(roomId, socketId) {
  const redis = getRedis();
  const { waitingKey } = getKeys(roomId);
  await redis.hDel(waitingKey, socketId);
}

async function getWaitingUsers(roomId) {
  const redis = getRedis();
  const { waitingKey } = getKeys(roomId);
  const all = await redis.hGetAll(waitingKey);
  const list = [];
  for (const [socketId, raw] of Object.entries(all)) {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    list.push({ socketId, ...data });
  }
  return list;
}

async function transferHost(roomId) {
  const participants = await getParticipants(roomId);
  if (participants.length === 0) {
    await updateRoomMeta(roomId, { hostSocketId: null });
    return null;
  }

  // Sort by earliest joinedAt to transfer to longest-present participant
  participants.sort((a, b) => a.joinedAt - b.joinedAt);
  const newHost = participants[0];

  newHost.isHost = true;
  await addParticipant(roomId, newHost.socketId, newHost);
  await updateRoomMeta(roomId, { hostSocketId: newHost.socketId });

  return newHost;
}

async function isHost(roomId, socketId) {
  const meta = await getRoomMeta(roomId);
  if (meta.hostSocketId && meta.hostSocketId === socketId) {
    return true;
  }
  const participant = await getParticipant(roomId, socketId);
  return !!(participant && participant.isHost);
}

module.exports = {
  getRoomMeta,
  setRoomMeta,
  updateRoomMeta,
  addParticipant,
  getParticipant,
  getParticipants,
  updateParticipantMedia,
  removeParticipant,
  addWaitingUser,
  removeWaitingUser,
  getWaitingUsers,
  transferHost,
  isHost,
};
