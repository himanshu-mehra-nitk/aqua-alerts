const express = require('express');
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');
const { generateConservationTips } = require('../utils/tips');
const WaterUsage = require('../models/WaterUsage');
const Alert = require('../models/Alert');
const User = require('../models/user');

const router = express.Router();

// Add water usage - IMPROVED ALERT HANDLING
router.post('/', protect, async (req, res) => {
    try {
        const { date, usage } = req.body;

        // Parse the date and set to start of day for comparison
        const entryDate = new Date(date);
        entryDate.setHours(0, 0, 0, 0);
        
        const nextDay = new Date(entryDate);
        nextDay.setDate(nextDay.getDate() + 1);

        // Check if entry already exists for this date
        const existingEntry = await WaterUsage.findOne({
            user: req.user._id,
            date: { 
                $gte: entryDate,
                $lt: nextDay
            }
        });

        let waterUsage;

        if (existingEntry) {
            // Update existing entry
            existingEntry.usage = parseFloat(usage);
            waterUsage = await existingEntry.save();
        } else {
            // Create new entry
            waterUsage = await WaterUsage.create({
                user: req.user._id,
                date: entryDate,
                usage: parseFloat(usage)
            });
        }

        // DELETE ALL EXISTING ALERTS FOR THIS DATE FIRST
        await Alert.deleteMany({
            user: req.user._id,
            createdAt: { 
                $gte: entryDate,
                $lt: nextDay
            }
        });

        // CREATE NEW ALERTS BASED ON CURRENT USAGE
        if (waterUsage.usage > req.user.dailyThreshold) {
            await Alert.create({
                user: req.user._id,
                type: 'threshold_exceeded',
                message: `Daily water usage (${waterUsage.usage}L) has exceeded your ${req.user.dailyThreshold}L threshold by ${(waterUsage.usage - req.user.dailyThreshold).toFixed(1)}L`,
                relatedUsage: waterUsage._id,
                isActive: true
            });
        } else if (waterUsage.usage > req.user.dailyThreshold * 0.8) {
            await Alert.create({
                user: req.user._id,
                type: 'approaching_limit',
                message: `You've used ${waterUsage.usage}L (${Math.round((waterUsage.usage / req.user.dailyThreshold) * 100)}%) of your daily water allocation`,
                relatedUsage: waterUsage._id,
                isActive: true
            });
        }

        res.status(201).json({ 
            success: true, 
            data: waterUsage,
            action: existingEntry ? 'updated' : 'created'
        });
    } catch (error) {
        console.error('Add usage error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get user's water usage
router.get('/', protect, async (req, res) => {
  try {
    // Fetch ALL data for the chart, sorted by date
    const usage = await WaterUsage.find({ user: req.user._id })
      .sort({ date: 1 }); 

    // Calculate statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Today's usage
    const todayUsage = await WaterUsage.findOne({
      user: req.user._id,
      date: { $gte: today }
    });

    // Weekly usage (last 7 days total)
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weeklyUsageData = await WaterUsage.aggregate([
      { 
        $match: { 
          user: req.user._id, 
          date: { $gte: weekAgo } 
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
    monthAgo.setDate(monthAgo.getDate() - 30);
    
    const monthlyUsageData = await WaterUsage.aggregate([
      { 
        $match: { 
          user: req.user._id, 
          date: { $gte: monthAgo } 
        } 
      },
      { 
        $group: { 
          _id: null, 
          total: { $sum: '$usage' } 
        } 
      }
    ]);

    // Generate conservation tips based on usage patterns
    const avgUsage = usage.length > 0 ? 
      usage.reduce((sum, entry) => sum + entry.usage, 0) / usage.length : 0;
    
    const tips = generateConservationTips(avgUsage, req.user.dailyThreshold);

    res.json({
      success: true,
      data: {
        usage,
        statistics: {
          today: todayUsage ? todayUsage.usage : 0,
          weekly: weeklyUsageData.length > 0 ? weeklyUsageData[0].total : 0,
          monthly: monthlyUsageData.length > 0 ? monthlyUsageData[0].total : 0
        },
        tips: tips
      }
    });
  } catch (error) {
    console.error('Get usage error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Generate simulated data - WITH PROPER ALERT GENERATION
router.post('/simulate', protect, async (req, res) => {
    try {
        const { days = 7 } = req.body;
        const simulatedData = [];
        const user = await User.findById(req.user._id);

        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const usage = 150 + Math.random() * 100; // Random between 150-250L

            simulatedData.push({
                user: req.user._id,
                date,
                usage: Math.round(usage),
                isSimulated: true
            });
        }

        // Remove existing simulated entries for these dates
        const dates = simulatedData.map(data => data.date);
        await WaterUsage.deleteMany({
            user: req.user._id,
            date: { $in: dates },
            isSimulated: true
        });

        // Remove existing alerts for these dates
        await Alert.deleteMany({
            user: req.user._id,
            createdAt: { $in: dates }
        });

        // Insert new data
        const createdData = await WaterUsage.insertMany(simulatedData);

        // CREATE ALERTS FOR SIMULATED DATA
        for (const data of createdData) {
            if (data.usage > user.dailyThreshold) {
                await Alert.create({
                    user: req.user._id,
                    type: 'threshold_exceeded',
                    message: `Daily water usage (${data.usage}L) has exceeded your ${user.dailyThreshold}L threshold by ${(data.usage - user.dailyThreshold).toFixed(1)}L`,
                    relatedUsage: data._id,
                    isActive: true
                });
            } else if (data.usage > user.dailyThreshold * 0.8) {
                await Alert.create({
                    user: req.user._id,
                    type: 'approaching_limit',
                    message: `You've used ${data.usage}L (${Math.round((data.usage / user.dailyThreshold) * 100)}%) of your daily water allocation`,
                    relatedUsage: data._id,
                    isActive: true
                });
            }
        }

        res.json({
            success: true,
            message: `Generated ${createdData.length} days of simulated data`,
            data: createdData
        });
    } catch (error) {
        console.error('Simulate error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get alerts for user
router.get('/alerts', protect, async (req, res) => {
  try {
    const alerts = await Alert.find({ 
      user: req.user._id, 
      isActive: true 
    }).sort({ createdAt: -1 });

    res.json({ success: true, data: alerts });
  } catch (error) {
    console.error('Alerts error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;