const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// In-memory OTP storage (in production, use Redis or database)
const otpStore = new Map(); // { email: { otp, expiresAt, userId } }

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// Register Route
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    console.log('Registration attempt:', { name, email });

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('User already exists:', email);
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new user
    const user = new User({ name, email, password });
    await user.save();
    console.log('User saved successfully:', user._id);

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    console.error('Error details:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Error registering user'
    });
  }
});

// Login Route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error during login'
    });
  }
});

// Generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
}

// Configure email transporter
const createTransporter = () => {
  // Gmail SMTP configuration
  // Note: For Gmail, you need to use an App Password, not your regular password
  // Go to Google Account > Security > 2-Step Verification > App Passwords
  const emailUser = process.env.EMAIL_USER || 'gohelvrushali2005@gmail.com';
  let emailPassword = process.env.EMAIL_PASSWORD || 'rhgf qeae nlus wqhq';
  
  // Remove spaces from App Password if present
  if (emailPassword) {
    emailPassword = emailPassword.replace(/\s+/g, '');
  }
  
  if (!emailPassword) {
    console.warn('⚠️  EMAIL_PASSWORD not set in environment variables. Email sending will fail.');
    console.warn('⚠️  Please set EMAIL_PASSWORD in .env file with your Gmail App Password.');
  }
  
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPassword
    }
  });
};

// Send OTP via Email
async function sendOTPEmail(email, otp) {
  try {
    const transporter = createTransporter();
    
    // Verify transporter connection
    await transporter.verify();
    console.log('✅ Email server is ready to send messages');
    
    const mailOptions = {
      from: `"eLEARNING" <${process.env.EMAIL_USER || 'gohelvrushali2005@gmail.com'}>`,
      to: email,
      subject: 'Password Reset OTP - eLEARNING',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h2 style="color: white; margin: 0;">eLEARNING</h2>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h3 style="color: #333;">Password Reset Request</h3>
            <p style="color: #666; line-height: 1.6;">
              You have requested to reset your password. Please use the following OTP to verify your identity:
            </p>
            <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <h1 style="color: #667eea; font-size: 36px; letter-spacing: 5px; margin: 0;">${otp}</h1>
            </div>
            <p style="color: #666; line-height: 1.6;">
              This OTP will expire in <strong>10 minutes</strong>. If you didn't request this, please ignore this email.
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              This is an automated email. Please do not reply to this message.
            </p>
          </div>
          <div style="background: #333; padding: 15px; text-align: center; color: #999; font-size: 12px;">
            &copy; ${new Date().getFullYear()} eLEARNING. All rights reserved.
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${email}`);
    console.log(`📧 Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    console.error('❌ Full error:', error);
    // Log OTP to console as fallback
    console.log(`📧 OTP for ${email}: ${otp}`);
    console.log(`⚠️  Email sending failed. OTP logged above for testing.`);
    return false;
  }
}

// Forgot Password - Generate and Send OTP
router.post('/forgot-password', async (req, res) => {
  try {
    console.log('📥 Forgot password request received:', req.body);
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({
        success: true,
        message: 'If the email exists, an OTP has been sent'
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP
    otpStore.set(email.toLowerCase().trim(), {
      otp,
      expiresAt,
      userId: user._id.toString()
    });

    // Send OTP via email
    const emailSent = await sendOTPEmail(email, otp);
    
    if (!emailSent) {
      console.log(`⚠️  Email sending failed for ${email}, but OTP has been generated`);
      // Still return success to user (security: don't reveal email issues)
    }

    res.json({
      success: true,
      message: 'OTP has been sent to your email address'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error processing forgot password request'
    });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    const emailKey = email.toLowerCase().trim();
    const storedData = otpStore.get(emailKey);

    if (!storedData) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Check if OTP is expired
    if (new Date() > storedData.expiresAt) {
      otpStore.delete(emailKey);
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one'
      });
    }

    // Verify OTP
    if (storedData.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    // Generate reset token (valid for 15 minutes)
    const resetToken = jwt.sign(
      { userId: storedData.userId, email: emailKey, type: 'password-reset' },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Don't delete OTP yet - keep it until password is reset
    res.json({
      success: true,
      message: 'OTP verified successfully',
      resetToken
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error verifying OTP'
    });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { resetToken, newPassword, confirmPassword } = req.body;

    if (!resetToken || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, JWT_SECRET);
      if (decoded.type !== 'password-reset') {
        throw new Error('Invalid token type');
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Clear OTP from store
    if (decoded.email) {
      otpStore.delete(decoded.email);
    }

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error resetting password'
    });
  }
});

module.exports = router;

