const mongoose = require('mongoose');
const crypto = require('crypto');
const UserModel = require('./User');
const MeetingModel = require('./Meeting');
const RefreshTokenModel = require('./RefreshToken');
const MessageModel = require('./Message');

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const DATA_DIR = path.join(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

// In-memory fallback stores when MongoDB is not connected
const memoryUsers = new Map();
const memoryMeetings = new Map();
const memoryRefreshTokens = new Map();
const memoryMessages = [];

function isDbConnected() {
  return process.env.NODE_ENV === 'test' || mongoose.connection.readyState === 1;
}

function saveToDisk() {
  if (process.env.NODE_ENV === 'test') return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const data = {
      users: Array.from(memoryUsers.entries()),
      meetings: Array.from(memoryMeetings.entries()).map(([k, v]) => {
        const { toPublicJSON, ...clean } = v;
        return [k, clean];
      }),
      refreshTokens: Array.from(memoryRefreshTokens.entries()),
      messages: memoryMessages,
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Store save warning:', err.message);
  }
}

function loadFromDisk() {
  if (process.env.NODE_ENV === 'test') return;
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.users)) {
        data.users.forEach(([k, v]) => memoryUsers.set(k, v));
      }
      if (Array.isArray(data.meetings)) {
        data.meetings.forEach(([k, v]) => {
          memoryMeetings.set(k, {
            ...v,
            toPublicJSON() {
              return {
                roomId: this.roomId,
                title: this.title,
                requiresPassword: !!this.passwordHash,
                waitingRoomEnabled: this.waitingRoomEnabled,
                isLocked: this.isLocked,
                status: this.status,
                createdAt: this.createdAt,
              };
            },
          });
        });
      }
      if (Array.isArray(data.refreshTokens)) {
        data.refreshTokens.forEach(([k, v]) => memoryRefreshTokens.set(k, v));
      }
      if (Array.isArray(data.messages)) {
        data.messages.forEach((m) => memoryMessages.push(m));
      }
    }
  } catch (err) {
    console.warn('Store load warning:', err.message);
  }

  // Pre-seed default user if database is empty so login always works
  if (memoryUsers.size === 0) {
    const seedId = 'user_default_saumya';
    const seedHash = bcrypt.hashSync('password123', 10);
    memoryUsers.set(seedId, {
      _id: seedId,
      name: 'Saumya Tiwari',
      email: 'saumyatiwari598@gmail.com',
      passwordHash: seedHash,
      createdAt: new Date(),
    });
    saveToDisk();
  }
}

loadFromDisk();

const UserStore = {
  async findOne(query) {
    if (isDbConnected()) return UserModel.findOne(query);
    if (query.email) {
      for (const u of memoryUsers.values()) {
        if (u.email.toLowerCase() === query.email.toLowerCase()) return u;
      }
    }
    return null;
  },

  async findById(id) {
    if (isDbConnected()) return UserModel.findById(id);
    return memoryUsers.get(id?.toString()) || null;
  },

  async create(data) {
    if (isDbConnected()) return UserModel.create(data);
    const id = crypto.randomBytes(12).toString('hex');
    const user = {
      _id: id,
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      createdAt: new Date(),
    };
    memoryUsers.set(id, user);
    saveToDisk();
    return user;
  },
};

const MeetingStore = {
  async findOne(query) {
    if (isDbConnected()) return MeetingModel.findOne(query);
    if (query.roomId) {
      const m = memoryMeetings.get(query.roomId.toLowerCase());
      if (!m) return null;
      return {
        ...m,
        toPublicJSON() {
          return {
            roomId: m.roomId,
            title: m.title,
            requiresPassword: !!m.passwordHash,
            waitingRoomEnabled: m.waitingRoomEnabled,
            isLocked: m.isLocked,
            status: m.status,
            createdAt: m.createdAt,
          };
        },
      };
    }
    return null;
  },

  find(query) {
    if (isDbConnected()) return MeetingModel.find(query);
    const list = [];
    for (const m of memoryMeetings.values()) {
      if (!query.hostId || m.hostId.toString() === query.hostId.toString()) {
        list.push(m);
      }
    }
    return {
      sort: () => ({
        limit: () => list.reverse(),
      }),
    };
  },

  async create(data) {
    if (isDbConnected()) return MeetingModel.create(data);
    const id = crypto.randomBytes(12).toString('hex');
    const meeting = {
      _id: id,
      roomId: data.roomId.toLowerCase(),
      title: data.title || 'Baithak Meeting',
      hostId: data.hostId,
      passwordHash: data.passwordHash || null,
      waitingRoomEnabled: !!data.waitingRoomEnabled,
      isLocked: false,
      status: data.status || 'scheduled',
      createdAt: new Date(),
      toPublicJSON() {
        return {
          roomId: this.roomId,
          title: this.title,
          requiresPassword: !!this.passwordHash,
          waitingRoomEnabled: this.waitingRoomEnabled,
          isLocked: this.isLocked,
          status: this.status,
          createdAt: this.createdAt,
        };
      },
    };
    memoryMeetings.set(meeting.roomId, meeting);
    saveToDisk();
    return meeting;
  },

  async updateOne(query, update) {
    if (isDbConnected()) return MeetingModel.updateOne(query, update);
    if (query.roomId) {
      const existing = memoryMeetings.get(query.roomId.toLowerCase());
      if (existing) {
        Object.assign(existing, update);
        saveToDisk();
      }
    }
    return { modifiedCount: 1 };
  },
};

const RefreshTokenStore = {
  async findOne(query) {
    if (isDbConnected()) return RefreshTokenModel.findOne(query);
    if (query.tokenHash) {
      return memoryRefreshTokens.get(query.tokenHash) || null;
    }
    return null;
  },

  async create(data) {
    if (isDbConnected()) return RefreshTokenModel.create(data);
    const record = {
      _id: crypto.randomBytes(12).toString('hex'),
      userId: data.userId,
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
      createdAt: new Date(),
    };
    memoryRefreshTokens.set(data.tokenHash, record);
    saveToDisk();
    return record;
  },

  async deleteOne(query) {
    if (isDbConnected()) return RefreshTokenModel.deleteOne(query);
    if (query.tokenHash) {
      memoryRefreshTokens.delete(query.tokenHash);
      saveToDisk();
    }
    return { deletedCount: 1 };
  },
};

const MessageStore = {
  find(query) {
    if (isDbConnected()) return MessageModel.find(query);
    const list = memoryMessages.filter((m) => m.roomId.toLowerCase() === query.roomId.toLowerCase());
    return {
      sort: () => ({
        limit: () => list,
      }),
    };
  },

  async create(data) {
    if (isDbConnected()) return MessageModel.create(data);
    const msg = {
      _id: crypto.randomBytes(12).toString('hex'),
      roomId: data.roomId.toLowerCase(),
      senderName: data.senderName,
      senderId: data.senderId,
      text: data.text,
      createdAt: new Date(),
    };
    memoryMessages.push(msg);
    saveToDisk();
    return msg;
  },
};

module.exports = {
  UserStore,
  MeetingStore,
  RefreshTokenStore,
  MessageStore,
  isDbConnected,
};
