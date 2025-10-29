const mongoose = require('mongoose');
const config = require('./environment');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    if (config.nodeEnv !== 'production') {
      console.info('MongoDB connected');
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
