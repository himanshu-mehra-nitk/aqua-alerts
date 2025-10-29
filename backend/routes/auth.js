const express = require('express');
const { protect } = require('../middleware/auth');
const { generateToken, generateOTP } = require('../utils/auth');
const User = require('../models/user');
const OTP = require('../models/otp');
const { sendOTPEmail, verifyEmailExistence } = require('../utils/email');
const WaterUsage = require('../models/WaterUsage');
const Alert = require('../models/Alert');

const router = express.Router();

// Send OTP for registration - WITH EMAIL VALIDATION
router.post('/send-register-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
    }

    // Email existence verification
    console.log(`Starting email verification for: ${email}`);
    const isRealEmail = await verifyEmailExistence(email);
    
    if (!isRealEmail) {
      console.log(`Email verification failed for: ${email}`);
      return res.status(400).json({ success: false, message: 'Please re-check the email address'});
    }
    console.log(`✅ Email verification passed for: ${email}`);

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing OTP for this email and type
    await OTP.deleteMany({ email, type: 'register' });

    // Save OTP to database
    await OTP.create({
      email,
      otp,
      type: 'register',
      expiresAt
    });

    // Send OTP via email
    const emailSent = await sendOTPEmail(email, otp, 'register');
    
    if (!emailSent) {
      // If email fails to send, delete the OTP record
      await OTP.deleteOne({ email, type: 'register' });
      return res.status(400).json({ 
        success: false, 
        message: 'Unable to send OTP to this email address. Please try again later.' 
      });
    }

    res.json({ 
      success: true, 
      message: 'OTP sent successfully to your email' 
    });
  } catch (error) {
    console.error('Send register OTP error:', error);
    
    // Clean up OTP record if there was an error
    try {
      await OTP.deleteOne({ email: req.body.email, type: 'register' });
    } catch (cleanupError) {
      console.error('Error cleaning up OTP:', cleanupError);
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error while sending OTP. Please try again.' 
    });
  }
});

// Verify OTP and complete registration
router.post('/verify-register-otp', async (req, res) => {
  try {
    const { name, email, password, role, otp } = req.body;

    // Validate input
    if (!name || !email || !password || !otp) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // Find OTP record
    const otpRecord = await OTP.findOne({ 
      email, 
      otp, 
      type: 'register',
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    // Check if user already exists (double check)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Create user with verified status
    const user = await User.create({ 
      name, 
      email, 
      password,
      role: role || 'user',
      isVerified: true
    });

    // Delete used OTP
    await OTP.deleteOne({ _id: otpRecord._id });

    res.status(201).json({
      success: true,
      token: generateToken(user._id),
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        dailyThreshold: user.dailyThreshold,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Verify register OTP error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Login User - WITHOUT OTP (Direct login)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user, ensuring password field is returned for comparison
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(401).json({ success: false, message: 'Please verify your email first. Check your inbox for OTP.' });
    }

    res.json({
      success: true,
      token: generateToken(user._id),
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        dailyThreshold: user.dailyThreshold,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get current user
router.get('/me', protect, async (req, res) => {
  res.json({ success: true, user: req.user });
});

// Update user profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, email, dailyThreshold, password } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (name) user.name = name;
    if (email) user.email = email;
    if (dailyThreshold) user.dailyThreshold = dailyThreshold;
    if (password) user.password = password;

    await user.save();
    
    const updatedUser = await User.findById(user._id);

    res.json({
      success: true,
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        dailyThreshold: updatedUser.dailyThreshold,
        role: updatedUser.role
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete user account
router.delete('/account', protect, async (req, res) => {
  try {
    const userId = req.user._id;

    // Delete user's water usage and alerts
    await WaterUsage.deleteMany({ user: userId });
    await Alert.deleteMany({ user: userId });
    await User.findByIdAndDelete(userId);

    res.json({ 
      success: true, 
      message: 'Account deleted successfully' 
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while deleting account',
      error: error.message // Added detailed error for debugging
    });
  }
});

module.exports = router;