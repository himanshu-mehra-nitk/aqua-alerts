const express = require('express');
const { protect } = require('../middleware/auth');
const Alert = require('../models/Alert');

const router = express.Router();

// Dismiss alert
router.put('/:alertId', protect, async (req, res) => {
  try {
    const { alertId } = req.params;

    const alert = await Alert.findOne({ _id: alertId, user: req.user._id });
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    alert.isActive = false;
    await alert.save();

    res.json({ success: true, message: 'Alert dismissed' });
  } catch (error) {
    console.error('Dismiss alert error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;