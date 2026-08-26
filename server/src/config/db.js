const mongoose = require('mongoose');
const env = require('./env');

let isConnected = false;

async function connectDB(uri = env.MONGO_URI) {
  if (isConnected) return mongoose.connection;
  try {
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
    isConnected = true;
    return conn;
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err.message);
    throw err;
  }
}

async function disconnectDB() {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
}

module.exports = {
  connectDB,
  disconnectDB,
};
