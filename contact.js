const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Contact = require('../models/Contact');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to verify JWT token for regular users
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    req.userId = decoded.userId;
    next();
  });
};

// Middleware to verify admin (same logic style as admin routes)
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = null;

  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else {
      token = authHeader;
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  // For admin login, we'll check if it's the admin token
  if (token === 'admin-token') {
    req.isAdmin = true;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    req.userId = decoded.userId;
    req.isAdmin = true;
    next();
  });
};

// ==================== USER CONTACT ROUTES ====================

// Create a new contact message (user)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Subject and message are required'
      });
    }

    // Try to get user details from DB if not provided
    let finalName = name;
    let finalEmail = email;

    if (!finalName || !finalEmail) {
      const user = await User.findById(req.userId);
      if (user) {
        if (!finalName) finalName = user.name;
        if (!finalEmail) finalEmail = user.email;
      }
    }

    if (!finalName || !finalEmail) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required'
      });
    }

    const contact = new Contact({
      userId: req.userId,
      name: finalName,
      email: finalEmail,
      subject,
      message
    });

    await contact.save();

    res.status(201).json({
      success: true,
      message: 'Your message has been sent successfully',
      contact: {
        id: contact._id,
        name: contact.name,
        email: contact.email,
        subject: contact.subject,
        message: contact.message,
        status: contact.status,
        adminReply: contact.adminReply,
        createdAt: contact.createdAt,
        repliedAt: contact.repliedAt
      }
    });
  } catch (error) {
    console.error('Create contact error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error sending message'
    });
  }
});

// Get all contacts for the logged-in user
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const contacts = await Contact.find({ userId: req.userId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      contacts: contacts.map(contact => ({
        id: contact._id,
        name: contact.name,
        email: contact.email,
        subject: contact.subject,
        message: contact.message,
        status: contact.status,
        adminReply: contact.adminReply,
        createdAt: contact.createdAt,
        repliedAt: contact.repliedAt
      })),
      total: contacts.length
    });
  } catch (error) {
    console.error('Get user contacts error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching your messages'
    });
  }
});

// Optional: delete a contact message by user
router.delete('/my/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const contact = await Contact.findOneAndDelete({
      _id: id,
      userId: req.userId
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Delete user contact error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting message'
    });
  }
});

// ==================== ADMIN CONTACT ROUTES ====================

// Get all contact messages (admin)
router.get('/admin', authenticateAdmin, async (req, res) => {
  try {
    const contacts = await Contact.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      contacts: contacts.map(contact => ({
        id: contact._id,
        userId: contact.userId?._id || null,
        name: contact.name,
        email: contact.email,
        subject: contact.subject,
        message: contact.message,
        status: contact.status,
        adminReply: contact.adminReply,
        createdAt: contact.createdAt,
        repliedAt: contact.repliedAt
      })),
      total: contacts.length
    });
  } catch (error) {
    console.error('Get admin contacts error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching contact messages'
    });
  }
});

// Reply to a contact message (admin)
router.put('/admin/:id/reply', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { replyMessage, status } = req.body;

    if (!replyMessage || replyMessage.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Reply message is required'
      });
    }

    const contact = await Contact.findById(id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact message not found'
      });
    }

    contact.adminReply = replyMessage.trim();
    contact.status = status || 'Answered';
    contact.repliedAt = new Date();

    await contact.save();

    res.json({
      success: true,
      message: 'Reply sent successfully',
      contact: {
        id: contact._id,
        name: contact.name,
        email: contact.email,
        subject: contact.subject,
        message: contact.message,
        status: contact.status,
        adminReply: contact.adminReply,
        createdAt: contact.createdAt,
        repliedAt: contact.repliedAt
      }
    });
  } catch (error) {
    console.error('Reply to contact error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error sending reply'
    });
  }
});

module.exports = router;

