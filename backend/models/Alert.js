const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['threshold_exceeded', 'approaching_limit', 'conservation_tip'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  relatedUsage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WaterUsage'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Alert', alertSchema);