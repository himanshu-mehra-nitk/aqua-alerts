const express = require('express');
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');
const { admin } = require('../middleware/admin');
const { generateConservationTips } = require('../utils/tips');
const User = require('../models/user');
const WaterUsage = require('../models/WaterUsage');
const Alert = require('../models/Alert');

const router = express.Router();

// Get all users with their statistics (only users, not admins)
router.get('/users', protect, admin, async (req, res) => {
  try {
    console.log('Admin fetching users...');
    
    // Only get users, not admins
    const users = await User.find({ role: 'user' }).select('-password');
    console.log(`Found ${users.length} users`);
    
    // Get statistics for each user
    const usersWithStats = await Promise.all(users.map(async (user) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Today's usage
      const todayUsage = await WaterUsage.findOne({
        user: user._id,
        date: { 
          $gte: today,
          $lt: tomorrow
        }
      });

      // Weekly usage (last 7 days total)
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 6);
      
      const weeklyUsage = await WaterUsage.aggregate([
        { 
          $match: { 
            user: new mongoose.Types.ObjectId(user._id), 
            date: { $gte: weekAgo, $lt: tomorrow } 
          } 
        },
        { 
          $group: { 
            _id: null, 
            total: { $sum: '$usage' } 
          } 
        }
      ]);

      // Monthly usage (last 30 days total)
      const monthAgo = new Date(today);
      monthAgo.setDate(monthAgo.getDate() - 29);
      
      const monthlyUsage = await WaterUsage.aggregate([
        { 
          $match: { 
            user: new mongoose.Types.ObjectId(user._id), 
            date: { $gte: monthAgo, $lt: tomorrow } 
          } 
        },
        { 
          $group: { 
            _id: null, 
            total: { $sum: '$usage' } 
          } 
        }
      ]);

      console.log(`User ${user.name}: today=${todayUsage?.usage || 0}, weekly=${weeklyUsage[0]?.total || 0}, monthly=${monthlyUsage[0]?.total || 0}`);

      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        dailyThreshold: user.dailyThreshold,
        role: user.role,
        statistics: {
          today: todayUsage ? todayUsage.usage : 0,
          weekly: weeklyUsage.length > 0 ? weeklyUsage[0].total : 0,
          monthly: monthlyUsage.length > 0 ? monthlyUsage[0].total : 0
        }
      };
    }));

    res.json({ 
      success: true, 
      data: usersWithStats 
    });
  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error in admin users endpoint',
      error: error.message 
    });
  }
});

// Get a list of all registered admins
router.get('/list-admins', protect, admin, async (req, res) => {
  try {
    // Find users with the role 'admin', excluding sensitive data
    const admins = await User.find({ role: 'admin' }).select('-password');

    res.json({ success: true, admins });
  } catch (error) {
    console.error('Fetch admin list error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching admin list' });
  }
});

// Get user's full dashboard data
router.get('/user-dashboard/:userId', protect, admin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Fetch ALL usage data for historical chart
    const usage = await WaterUsage.find({ user: userId })
      .sort({ date: 1 });

    // Calculate statistics for this user
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's usage
    const todayUsage = await WaterUsage.findOne({
      user: userId,
      date: { 
        $gte: today,
        $lt: tomorrow
      }
    });

    // Weekly usage (last 7 days total)
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 6);
    
    const weeklyUsageData = await WaterUsage.aggregate([
      { 
        $match: { 
          user: new mongoose.Types.ObjectId(userId), 
          date: { $gte: weekAgo, $lt: tomorrow } 
        } 
      },
      { 
        $group: { 
          _id: null, 
          total: { $sum: '$usage' } 
        } 
      }
    ]);

    // Monthly usage (last 30 days total)
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 29);
    
    const monthlyUsageData = await WaterUsage.aggregate([
      { 
        $match: { 
          user: new mongoose.Types.ObjectId(userId), 
          date: { $gte: monthAgo, $lt: tomorrow } 
        } 
      },
      { 
        $group: { 
          _id: null, 
          total: { $sum: '$usage' } 
        } 
      }
    ]);

    console.log('Admin Dashboard Stats for user:', userId);
    console.log('Today range:', today, 'to', tomorrow);
    console.log('Weekly range:', weekAgo, 'to', tomorrow);
    console.log('Monthly range:', monthAgo, 'to', tomorrow);
    console.log('Weekly usage result:', weeklyUsageData);
    console.log('Monthly usage result:', monthlyUsageData);

    // Get user for threshold and tips
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const avgUsage = usage.length > 0 ? 
      usage.reduce((sum, entry) => sum + entry.usage, 0) / usage.length : 0;
    
    const tips = generateConservationTips(avgUsage, user.dailyThreshold);

    // Get alerts for this user
    const alerts = await Alert.find({ 
      user: userId, 
      isActive: true 
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        usage,
        statistics: {
          today: todayUsage ? todayUsage.usage : 0,
          weekly: weeklyUsageData.length > 0 ? weeklyUsageData[0].total : 0,
          monthly: monthlyUsageData.length > 0 ? monthlyUsageData[0].total : 0
        },
        tips: tips,
        alerts: alerts,
        user: user
      }
    });
  } catch (error) {
    console.error('Admin get user dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete user
router.delete('/users/:userId', protect, admin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Delete user's water usage and alerts
    await WaterUsage.deleteMany({ user: userId });
    await Alert.deleteMany({ user: userId });
    await User.findByIdAndDelete(userId);

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update user
router.put('/users/:userId', protect, admin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { dailyThreshold } = req.body;

    // Basic Validation
    if (!dailyThreshold) {
      return res.status(400).json({ success: false, message: 'Daily threshold is required for update.' });
    }
    
    // Use findByIdAndUpdate for a direct, atomic update
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { dailyThreshold: parseFloat(dailyThreshold) } },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ 
      success: true, 
      message: `User threshold updated successfully to ${updatedUser.dailyThreshold}L`
    });
    
  } catch (error) {
    console.error('Update user threshold error:', error);
    res.status(500).json({ success: false, message: 'Server error during user update: ' + error.message });
  }
});

module.exports = router;