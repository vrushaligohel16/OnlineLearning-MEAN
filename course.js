const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const CourseProgress = require('../models/CourseProgress');
const Certificate = require('../models/Certificate');
const CourseReview = require('../models/CourseReview');
const Quiz = require('../models/Quiz');
const User = require('../models/User');
const Profile = require('../models/Profile');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');

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

// Get user's course progress
router.get('/progress/:courseId', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const progress = await CourseProgress.findOne({
      userId: req.userId,
      courseId: courseId
    });

    if (!progress) {
      return res.json({
        success: true,
        progress: null
      });
    }

    res.json({
      success: true,
      progress: {
        id: progress._id,
        userId: progress.userId,
        courseId: progress.courseId,
        completedVideos: progress.completedVideos,
        quizCompleted: progress.quizCompleted,
        quizScore: progress.quizScore,
        quizAttempts: progress.quizAttempts,
        certificateEarned: progress.certificateEarned,
        certificateId: progress.certificateId,
        completedAt: progress.completedAt,
        createdAt: progress.createdAt,
        updatedAt: progress.updatedAt
      }
    });
  } catch (error) {
    console.error('Get course progress error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching course progress'
    });
  }
});

// Mark video as completed
router.post('/progress/:courseId/video', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { videoIndex } = req.body;

    if (videoIndex === undefined || videoIndex === null) {
      return res.status(400).json({
        success: false,
        message: 'Video index is required'
      });
    }

    let progress = await CourseProgress.findOne({
      userId: req.userId,
      courseId: courseId
    });

    if (!progress) {
      progress = new CourseProgress({
        userId: req.userId,
        courseId: courseId,
        completedVideos: []
      });
    }

    // Check if video is already completed
    const alreadyCompleted = progress.completedVideos.some(
      v => v.videoIndex === videoIndex
    );

    if (!alreadyCompleted) {
      progress.completedVideos.push({
        videoIndex: videoIndex,
        completedAt: new Date()
      });
      await progress.save();
    }

    res.json({
      success: true,
      message: 'Video marked as completed',
      progress: {
        id: progress._id,
        completedVideos: progress.completedVideos
      }
    });
  } catch (error) {
    console.error('Mark video completed error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error marking video as completed'
    });
  }
});

// Submit quiz
router.post('/progress/:courseId/quiz', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { answers } = req.body; // Array of { questionIndex, selectedAnswer }

    const course = await Course.findById(courseId).populate('quizId');
    if (!course || !course.quizId) {
      return res.status(404).json({
        success: false,
        message: 'Course or quiz not found'
      });
    }

    const quiz = course.quizId;
    let score = 0;
    let totalMarks = 0;

    // Calculate score
    answers.forEach((answer, index) => {
      const questionIndex = answer.questionIndex !== undefined ? answer.questionIndex : index;
      const question = quiz.questions[questionIndex];
      if (question) {
        if (answer.selectedAnswer === question.correctAnswer) {
          score += question.points || 1;
        }
        totalMarks += question.points || 1;
      }
    });

    const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
    const passed = percentage >= course.passingMarks;

    // Update or create progress
    let progress = await CourseProgress.findOne({
      userId: req.userId,
      courseId: courseId
    });

    if (!progress) {
      progress = new CourseProgress({
        userId: req.userId,
        courseId: courseId,
        completedVideos: []
      });
    }

    progress.quizCompleted = true;
    progress.quizScore = percentage;
    progress.quizAttempts += 1;

    // If passed, generate certificate
    if (passed && !progress.certificateEarned) {
      const user = await User.findById(req.userId);
      const profile = await Profile.findOne({ userId: req.userId });
      const userName = profile?.name || user?.name || 'User';

      // Generate certificate number
      const certificateNumber = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Generate PDF certificate
      const pdfBuffer = await generateCertificatePDF({
        certificateNumber,
        userName,
        courseName: course.name,
        instituteName: course.instituteName,
        websiteName: course.certificateWebsiteName || 'ELearning',
        issueDate: new Date()
      });

      const certificate = new Certificate({
        userId: req.userId,
        courseId: courseId,
        courseProgressId: progress._id,
        certificateNumber,
        userName,
        courseName: course.name,
        instituteName: course.instituteName,
        websiteName: course.certificateWebsiteName || 'ELearning',
        issueDate: new Date(),
        pdfData: pdfBuffer.toString('base64')
      });

      await certificate.save();

      progress.certificateEarned = true;
      progress.certificateId = certificate._id;
      progress.completedAt = new Date();
    }

    await progress.save();

    res.json({
      success: true,
      message: passed ? 'Quiz passed! Certificate generated.' : 'Quiz completed. Please retake to pass.',
      result: {
        score: percentage.toFixed(2),
        totalMarks,
        passed,
        certificateEarned: progress.certificateEarned,
        certificateId: progress.certificateId
      }
    });
  } catch (error) {
    console.error('Submit quiz error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error submitting quiz'
    });
  }
});

// Get certificate
router.get('/certificate/:certificateId', authenticateToken, async (req, res) => {
  try {
    const { certificateId } = req.params;
    const certificate = await Certificate.findById(certificateId);

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    // Verify certificate belongs to user
    if (certificate.userId.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to certificate'
      });
    }

    res.json({
      success: true,
      certificate: {
        id: certificate._id,
        certificateNumber: certificate.certificateNumber,
        userName: certificate.userName,
        courseName: certificate.courseName,
        instituteName: certificate.instituteName,
        websiteName: certificate.websiteName,
        issueDate: certificate.issueDate,
        pdfData: certificate.pdfData
      }
    });
  } catch (error) {
    console.error('Get certificate error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching certificate'
    });
  }
});

// Submit course review
router.post('/review/:courseId', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Check if user has completed the course and earned certificate
    const progress = await CourseProgress.findOne({
      userId: req.userId,
      courseId: courseId,
      certificateEarned: true
    });

    if (!progress) {
      return res.status(400).json({
        success: false,
        message: 'You must complete the course and earn a certificate before reviewing'
      });
    }

    // Check if review already exists
    let review = await CourseReview.findOne({
      userId: req.userId,
      courseId: courseId
    });

    if (review) {
      // Update existing review
      review.rating = rating;
      review.comment = comment || '';
      review.certificateId = progress.certificateId;
    } else {
      // Create new review
      review = new CourseReview({
        userId: req.userId,
        courseId: courseId,
        certificateId: progress.certificateId,
        rating: rating,
        comment: comment || ''
      });
    }

    await review.save();

    res.json({
      success: true,
      message: 'Review submitted successfully',
      review: {
        id: review._id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt
      }
    });
  } catch (error) {
    console.error('Submit review error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error submitting review'
    });
  }
});

// Get course reviews
router.get('/review/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    const reviews = await CourseReview.find({ courseId: courseId })
      .populate('userId', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      reviews: reviews.map(review => ({
        id: review._id,
        userName: review.userId?.name || 'Anonymous',
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt
      })),
      total: reviews.length
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching reviews'
    });
  }
});

// Helper function to generate PDF certificate
async function generateCertificatePDF(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margin: 50
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Certificate Design
      doc.rect(0, 0, doc.page.width, doc.page.height)
         .lineWidth(20)
         .stroke('#1a237e');

      // Header
      doc.fontSize(32)
         .fillColor('#1a237e')
         .text('CERTIFICATE OF COMPLETION', 50, 100, { align: 'center' });

      doc.fontSize(16)
         .fillColor('#666')
         .text('This is to certify that', 50, 160, { align: 'center' });

      // User Name
      doc.fontSize(28)
         .fillColor('#1a237e')
         .text(data.userName, 50, 200, { align: 'center' });

      doc.fontSize(16)
         .fillColor('#666')
         .text('has successfully completed the course', 50, 250, { align: 'center' });

      // Course Name
      doc.fontSize(24)
         .fillColor('#1a237e')
         .text(data.courseName, 50, 290, { align: 'center' });

      doc.fontSize(16)
         .fillColor('#666')
         .text(`offered by ${data.instituteName}`, 50, 330, { align: 'center' });

      // Date
      const dateStr = new Date(data.issueDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      doc.fontSize(14)
         .fillColor('#666')
         .text(`Issued on ${dateStr}`, 50, 400, { align: 'center' });

      // Certificate Number
      doc.fontSize(12)
         .fillColor('#999')
         .text(`Certificate Number: ${data.certificateNumber}`, 50, 450, { align: 'center' });

      // Footer
      doc.fontSize(14)
         .fillColor('#1a237e')
         .text(data.websiteName, 50, doc.page.height - 100, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = router;
