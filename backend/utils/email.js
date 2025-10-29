const nodemailer = require('nodemailer');
const axios = require('axios');

// EmailValidation.io API Key - REPLACE WITH YOUR ACTUAL KEY
const EMAIL_VALIDATION_API_KEY = process.env.EMAIL_VALIDATION_API_KEY || null;

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify email configuration
transporter.verify((error, success) => {
  if (error) {
    console.log('Email configuration error:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});

// Verify email existence using EmailValidation.io
const verifyEmailExistence = async (email) => {
  try {
    console.log(`Verifying email: ${email}`);
    
    const response = await axios.get(`https://api.emailvalidation.io/v1/info`, {
      params: {
        apikey: EMAIL_VALIDATION_API_KEY,
        email: email
      },
      timeout: 10000 // 10 second timeout
    });

    const data = response.data;
    
    console.log('Email validation result:', JSON.stringify(data, null, 2));

    // Enhanced validation logic with better error handling
    const isValid = validateEmailResponse(data, email);
    
    if (isValid) {
      console.log(`✅ Email verified: ${email}`);
    } else {
      console.log(`❌ Email rejected: ${email}`);
    }

    return isValid;
    
  } catch (error) {
    console.error('Email validation API error:', error.message);
    
    // If API fails, use comprehensive fallback validation
    console.log('Using fallback email validation due to API error');
    return fallbackEmailValidation(email);
  }
};

// Enhanced validation function
const validateEmailResponse = (data, email) => {
  // If API returns undefined values, be more permissive
  if (data.valid === undefined || data.deliverable === undefined) {
    console.log('API returned undefined values, using lenient validation');
    
    // Lenient validation when API data is incomplete
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const basicValid = emailRegex.test(email);
    
    // Accept if basic format is valid and not disposable
    if (basicValid && data.disposable === false) {
      console.log('Lenient validation passed - valid format and not disposable');
      return true;
    }
    
    return false;
  }

  // Original strict validation when API data is complete
  const isValid = (
    data.valid === true &&           // Valid format
    data.disposable === false &&     // Not disposable/temporary email
    data.deliverable === true &&     // Can be delivered
    data.score > 0.70                // Good confidence score
  );

  return isValid;
};

// Comprehensive fallback validation
const fallbackEmailValidation = (email) => {
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const basicValid = emailRegex.test(email);
  
  if (!basicValid) {
    console.log(`Fallback validation failed: Invalid email format - ${email}`);
    return false;
  }

  // Check for common disposable email domains
  const disposableDomains = [
    'tempmail.com', 'guerrillamail.com', 'mailinator.com', 
    '10minutemail.com', 'throwaway.com', 'fakeinbox.com',
    'yopmail.com', 'trashmail.com', 'sharklasers.com'
  ];
  
  const domain = email.split('@')[1].toLowerCase();
  const isDisposable = disposableDomains.some(disposable => 
    domain.includes(disposable)
  );
  
  if (isDisposable) {
    console.log(`Fallback validation failed: Disposable email domain - ${email}`);
    return false;
  }

  // Check for common email providers (positive indicator)
  const commonProviders = [
    'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
    'icloud.com', 'aol.com', 'protonmail.com', 'zoho.com',
    'ncc', 'nitk', 'edu' // Allow educational and organizational emails
  ];
  
  const isCommonProvider = commonProviders.some(provider => 
    domain.includes(provider)
  );
  
  if (isCommonProvider) {
    console.log(`Fallback validation passed: Common email provider - ${email}`);
    return true;
  }

  // For other domains, be more permissive but log it
  console.log(`Fallback validation passed with unknown domain: ${email}`);
  return true;
};

// Send OTP email - Only for registration
const sendOTPEmail = async (email, otp, type) => {
  try {
    // First verify email existence
    const isValidEmail = await verifyEmailExistence(email);
    
    if (!isValidEmail) {
      console.error(`Cannot send OTP - Invalid email: ${email}`);
      return false;
    }

    const subject = 'Verify Your Email - AquaAlerts'; // Only registration subject
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007bff;">AquaAlerts</h2>
        <h3>Email Verification</h3>
        <p>Your OTP for email verification is:</p>
        <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
          ${otp}
        </div>
        <p>This OTP will expire in 10 minutes.</p>
        <p style="color: #666; font-size: 12px;">If you didn't request this, please ignore this email.</p>
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: subject,
      html: html
    };

    const result = await transporter.sendMail(mailOptions);
    
    if (result.accepted && result.accepted.includes(email)) {
      console.log(`OTP email sent successfully to: ${email}`);
      return true;
    } else {
      console.error(`Email rejected by SMTP server: ${email}`, result);
      return false;
    }
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
};

module.exports = { sendOTPEmail, verifyEmailExistence, transporter };