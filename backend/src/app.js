const express = require('express');
const cors = require('cors');
const connectDB = require('../config/database');
const config = require('../config/environment');

// Import routes
const authRoutes = require('../routes/auth');
const usageRoutes = require('../routes/usage');
const alertRoutes = require('../routes/alerts');
const adminRoutes = require('../routes/admin');

const app = express();

// Connect to database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Test Route
app.get('/', (req, res) => {
  res.json({ 
    message: 'AquaAlerts Water Consumption Monitoring System',
    version: '1.0.0',
    status: 'Running'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error',
    error: config.nodeEnv === 'development' ? err.message : undefined
  });
});

module.exports = app;