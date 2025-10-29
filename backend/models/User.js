const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  dailyThreshold: { type: Number, default: 200 },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  isVerified: { type: Boolean, default: false },
  otp: { type: String },
  otpExpires: { type: Date }
}, { timestamps: true });

// Middleware to hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || this.password.startsWith('$2a$')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Method for password comparison
userSchema.methods.matchPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);