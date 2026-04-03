const express = require('express');
const router = express.Router();
const Profile = require('../models/Profile');
const User = require('../models/User');
const CourseProgress = require('../models/CourseProgress');
const Certificate = require('../models/Certificate');
const Course = require('../models/Course');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to verify JWT token
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

// Get user profile
router.get('/', authenticateToken, async (req, res) => {
  try {
    let profile = await Profile.findOne({ userId: req.userId });

    // If profile doesn't exist, create one from user data
    if (!profile) {
      const user = await User.findById(req.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      profile = new Profile({
        userId: req.userId,
        name: user.name,
        email: user.email,
        phone: '',
        address: '',
        bio: '',
        image: ''
      });
      await profile.save();
    }

    res.json({
      success: true,
      profile: {
        id: profile._id,
        userId: profile.userId,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        address: profile.address,
        bio: profile.bio,
        image: profile.image || '',
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching profile'
    });
  }
});

// Update user profile
router.put('/', authenticateToken, async (req, res) => {
  try {
    const { name, email, phone, address, bio, image } = req.body;

    // Validation
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required'
      });
    }

    // Find or create profile
    let profile = await Profile.findOne({ userId: req.userId });

    if (!profile) {
      profile = new Profile({
        userId: req.userId,
        name,
        email,
        phone: phone || '',
        address: address || '',
        bio: bio || '',
        image: image || ''
      });
    } else {
      // Update existing profile
      profile.name = name;
      profile.email = email;
      profile.phone = phone || '';
      profile.address = address || '';
      profile.bio = bio || '';
      if (image !== undefined) {
        profile.image = image || '';
      }
    }

    await profile.save();

    // Also update user document if email or name changed
    const user = await User.findById(req.userId);
    if (user) {
      if (user.email !== email) {
        // Check if new email already exists
        const existingUser = await User.findOne({ email, _id: { $ne: req.userId } });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'Email already in use'
          });
        }
        user.email = email;
      }
      user.name = name;
      await user.save();
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: {
        id: profile._id,
        userId: profile.userId,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        address: profile.address,
        bio: profile.bio,
        image: profile.image || '',
        updatedAt: profile.updatedAt
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating profile'
    });
  }
});

// Get user's completed courses and certificates
router.get('/completed-courses', authenticateToken, async (req, res) => {
  try {
    // Find all course progress where user has earned a certificate
    const completedProgresses = await CourseProgress.find({
      userId: req.userId,
      certificateEarned: true
    }).populate('courseId', 'name image instituteName categoryId mentorId duration numberOfSessions');

    // Get all certificates for the user
    const certificates = await Certificate.find({
      userId: req.userId
    }).populate('courseId', 'name image instituteName').sort({ issueDate: -1 });

    // Format completed courses with certificate info
    const completedCourses = completedProgresses
      .filter(progress => progress.courseId) // Filter out deleted courses
      .map(progress => {
        const certificate = certificates.find(
          cert => cert.courseId && cert.courseId._id.toString() === progress.courseId._id.toString()
        );

        return {
          id: progress.courseId._id,
          courseId: progress.courseId._id,
          name: progress.courseId.name,
          image: progress.courseId.image || '',
          instituteName: progress.courseId.instituteName,
          duration: progress.courseId.duration,
          numberOfSessions: progress.courseId.numberOfSessions,
          completedAt: progress.completedAt,
          quizScore: progress.quizScore,
          certificateId: progress.certificateId,
          certificate: certificate ? {
            id: certificate._id,
            certificateNumber: certificate.certificateNumber,
            issueDate: certificate.issueDate,
            pdfData: certificate.pdfData
          } : null
        };
      });

    // Format certificates (filter out certificates for deleted courses)
    const formattedCertificates = certificates
      .filter(cert => cert.courseId) // Filter out deleted courses
      .map(cert => ({
        id: cert._id,
        certificateNumber: cert.certificateNumber,
        courseId: cert.courseId._id,
        courseName: cert.courseId.name,
        courseImage: cert.courseId.image || '',
        instituteName: cert.instituteName,
        userName: cert.userName,
        issueDate: cert.issueDate,
        pdfData: cert.pdfData
      }));

    res.json({
      success: true,
      completedCourses: completedCourses,
      certificates: formattedCertificates,
      total: completedCourses.length
    });
  } catch (error) {
    console.error('Get completed courses error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching completed courses'
    });
  }
});

module.exports = router;

