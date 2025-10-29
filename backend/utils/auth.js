const jwt = require('jsonwebtoken');
const config = require('../config/environment');

const generateToken = (id) => {
  return jwt.sign({ id }, config.jwtSecret, { expiresIn: config.jwtExpire });
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

module.exports = { generateToken, generateOTP };