const mongoose = require('mongoose');

const waterUsageSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true, default: Date.now },
  usage: { type: Number, required: true, min: 0 },
  isSimulated: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('WaterUsage', waterUsageSchema);