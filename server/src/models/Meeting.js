const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    title: {
      type: String,
      default: 'MeetSpace Meeting',
      trim: true,
    },
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    passwordHash: {
      type: String,
      default: null,
    },
    waitingRoomEnabled: {
      type: Boolean,
      default: false,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['scheduled', 'live', 'ended'],
      default: 'scheduled',
    },
    startedAt: {
      type: Date,
      default: null,
    },
    endedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

meetingSchema.methods.toPublicJSON = function () {
  return {
    roomId: this.roomId,
    title: this.title,
    requiresPassword: !!this.passwordHash,
    waitingRoomEnabled: this.waitingRoomEnabled,
    isLocked: this.isLocked,
    status: this.status,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('Meeting', meetingSchema);
