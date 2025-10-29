const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    index: true
  },
  otp: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['register'], // REMOVED 'login' from enum
    required: true
  },
  attempts: {
    type: Number,
    default: 0
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 600 } // Auto delete after 10 minutes
  }
}, {
  timestamps: true
});

// Create index for faster queries
otpSchema.index({ email: 1, type: 1 });

module.exports = mongoose.model('OTP', otpSchema);