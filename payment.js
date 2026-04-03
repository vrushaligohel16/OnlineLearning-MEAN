const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Subscription = require('../models/Subscription');
const Course = require('../models/Course');
const User = require('../models/User');
const Invoice = require('../models/Invoice');
const PDFDocument = require('pdfkit');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to verify JWT token (same style as course router)
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

// Helper to parse subscription duration into days (e.g. "30 days", "15 day", "90")
function parseDurationToDays(duration) {
  if (!duration || typeof duration !== 'string') {
    return 30;
  }
  const match = duration.match(/(\d+)/);
  if (!match) {
    return 30;
  }
  const days = parseInt(match[1], 10);
  return Number.isNaN(days) || days <= 0 ? 30 : days;
}

// Mock payment endpoint - creates invoice
router.post('/pay', authenticateToken, async (req, res) => {
  try {
    const { courseId, subscriptionId, paymentMethod } = req.body;

    if (!courseId || !subscriptionId) {
      return res.status(400).json({
        success: false,
        message: 'Course ID and subscription ID are required'
      });
    }

    // Optional: validate payment method
    const allowedMethods = ['UPI', 'CARD', 'NET_BANKING', 'WALLET'];
    const method = (paymentMethod || 'UPI').toUpperCase();
    if (!allowedMethods.includes(method)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment method'
      });
    }

    const subscription = await Subscription.findById(subscriptionId).populate('courseId', 'name instituteName duration');
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Enforce: one active purchase per user per course.
    // User can renew after current purchase expires.
    const now = new Date();
    const existingActive = await Invoice.findOne({
      userId: req.userId,
      courseId: courseId,
      subscriptionId: subscriptionId,
      validUntil: { $gt: now }
    });

    if (existingActive) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active subscription for this course. You can renew after it expires.'
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // In real app, integrate payment gateway here. Assume success.
    const invoiceNumber = `INV-${Date.now()}`;

    // Calculate validity based on subscription duration
    const days = parseDurationToDays(subscription.duration);
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + days);

    const pdfBuffer = await generateInvoicePDF({
      invoiceNumber,
      userName: user.name,
      userEmail: user.email,
      courseName: course.name,
      instituteName: course.instituteName,
      plan: subscription.plan,
      amount: subscription.price,
      issueDate: now,
      validUntil
    });

    const invoice = new Invoice({
      userId: req.userId,
      courseId: courseId,
      subscriptionId: subscriptionId,
      amount: subscription.price,
      plan: subscription.plan,
      invoiceNumber,
      pdfData: pdfBuffer.toString('base64'),
      validUntil,
      paymentMethod: method
    });

    await invoice.save();

    res.json({
      success: true,
      message: 'Payment successful',
      invoice: {
        id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount,
        plan: invoice.plan,
        pdfData: invoice.pdfData
      }
    });
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error processing payment'
    });
  }
});

// Check if current user has active access to a course
router.get('/access/:courseId', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'Course ID is required'
      });
    }

    const now = new Date();
    const invoice = await Invoice.findOne({
      userId: req.userId,
      courseId: courseId,
      validUntil: { $gt: now }
    });

    return res.json({
      success: true,
      hasAccess: !!invoice,
      validUntil: invoice?.validUntil || null
    });
  } catch (error) {
    console.error('Check course access error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error checking course access'
    });
  }
});

// Get all active purchased courses for current user
router.get('/my-courses', authenticateToken, async (req, res) => {
  try {
    const now = new Date();
    const invoices = await Invoice.find({
      userId: req.userId,
      validUntil: { $gt: now }
    }).populate('courseId', 'name image instituteName');

    const courses = invoices
      .filter(inv => !!inv.courseId)
      .map(inv => ({
        invoiceId: inv._id,
        invoiceNumber: inv.invoiceNumber,
        courseId: inv.courseId._id,
        courseName: inv.courseId.name,
        courseImage: inv.courseId.image || '',
        instituteName: inv.courseId.instituteName || '',
        validUntil: inv.validUntil,
        plan: inv.plan,
        amount: inv.amount,
        paymentMethod: inv.paymentMethod || null
      }));

    res.json({
      success: true,
      courses
    });
  } catch (error) {
    console.error('Get my purchased courses error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching purchased courses'
    });
  }
});

// Get single invoice PDF for current user
router.get('/invoice/:invoiceId', authenticateToken, async (req, res) => {
  try {
    const { invoiceId } = req.params;
    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        message: 'Invoice ID is required'
      });
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Ensure the invoice belongs to current user
    if (invoice.userId.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to invoice'
      });
    }

    res.json({
      success: true,
      invoice: {
        id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount,
        plan: invoice.plan,
        pdfData: invoice.pdfData
      }
    });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching invoice'
    });
  }
});

async function generateInvoicePDF(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(22).text('Invoice', { align: 'center' });
      doc.moveDown();

      doc.fontSize(12).text(`Invoice Number: ${data.invoiceNumber}`);
      doc.text(`Date: ${new Date(data.issueDate).toLocaleDateString()}`);
      doc.moveDown();

      doc.text(`Billed To: ${data.userName}`);
      doc.text(`Email: ${data.userEmail}`);
      doc.moveDown();

      doc.text(`Course: ${data.courseName}`);
      doc.text(`Institute: ${data.instituteName}`);
      doc.text(`Plan: ${data.plan}`);
      doc.moveDown();

      doc.text(`Amount: ₹${data.amount}`, { align: 'right' });

      doc.moveDown(2);
      doc.fontSize(10).fillColor('#777').text('Thank you for your purchase.', { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = router;

