const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
// After (supports up to ~15MB safely)
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// MongoDB Connection (reads from .env)
const MONGODB_URI = process.env.MONGODB_URI;

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB successfully');
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  });

// Routes
const authRoutes = require('./routers/auth');
const profileRoutes = require('./routers/profile');
const adminRoutes = require('./routers/admin');
const contactRoutes = require('./routers/contact');
const courseRoutes = require('./routers/course');
const bookRoutes = require('./routers/book');
const paymentRoutes = require('./routers/payment');
const CourseCategory = require('./models/CourseCategory');
const Mentor = require('./models/Mentor');
const Course = require('./models/Course');
const Subscription = require('./models/Subscription');

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/course', courseRoutes);
app.use('/api/book', bookRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/payment', paymentRoutes);

// Public route for course categories (no authentication required)
app.get('/api/course-categories', async (req, res) => {
  try {
    console.log('📥 Public course categories request received');
    const categories = await CourseCategory.find().sort({ createdAt: -1 });
    console.log(`📦 Found ${categories.length} categories`);
    
    const formattedCategories = categories.map(cat => ({
      id: cat._id,
      name: cat.name,
      image: cat.image || '',
      numberOfCourses: cat.numberOfCourses || 0,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt
    }));
    
    res.json({
      success: true,
      categories: formattedCategories,
      total: categories.length
    });
  } catch (error) {
    console.error('❌ Get public course categories error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching course categories'
    });
  }
});

// Public route for mentors (no authentication required)
app.get('/api/mentors', async (req, res) => {
  try {
    console.log('📥 Public mentors request received');
    const mentors = await Mentor.find().sort({ createdAt: -1 });
    console.log(`📦 Found ${mentors.length} mentors`);
    
    const formattedMentors = mentors.map(mentor => ({
      id: mentor._id,
      name: mentor.name,
      email: mentor.email,
      image: mentor.image || '',
      educationHistory: mentor.educationHistory || '',
      experience: mentor.experience || '',
      githubLink: mentor.githubLink || '',
      linkedinLink: mentor.linkedinLink || '',
      youtubeLink: mentor.youtubeLink || '',
      courseSpecialization: mentor.courseSpecialization || '',
      createdAt: mentor.createdAt,
      updatedAt: mentor.updatedAt
    }));
    
    res.json({
      success: true,
      mentors: formattedMentors,
      total: mentors.length
    });
  } catch (error) {
    console.error('❌ Get public mentors error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching mentors'
    });
  }
});

// Public route for single mentor (no authentication required)
app.get('/api/mentors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📥 Public mentor detail request received for ID:', id);
    const mentor = await Mentor.findById(id);
    
    if (!mentor) {
      return res.status(404).json({
        success: false,
        message: 'Mentor not found'
      });
    }
    
    res.json({
      success: true,
      mentor: {
        id: mentor._id,
        name: mentor.name,
        email: mentor.email,
        image: mentor.image || '',
        educationHistory: mentor.educationHistory || '',
        experience: mentor.experience || '',
        githubLink: mentor.githubLink || '',
        linkedinLink: mentor.linkedinLink || '',
        youtubeLink: mentor.youtubeLink || '',
        courseSpecialization: mentor.courseSpecialization || '',
        createdAt: mentor.createdAt,
        updatedAt: mentor.updatedAt
      }
    });
  } catch (error) {
    console.error('❌ Get public mentor detail error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching mentor details'
    });
  }
});

// Public route for courses (no authentication required)
app.get('/api/courses', async (req, res) => {
  try {
    const { categoryId, search } = req.query;
    console.log('📥 Public courses request received', categoryId ? `for category: ${categoryId}` : '', search ? `search: ${search}` : '');
    
    // Build query filter
    const query = { status: 'Active' };
    if (categoryId) {
      query.categoryId = categoryId;
    }
    
    let courses = await Course.find(query)
      .populate('mentorId', 'name courseSpecialization')
      .populate('categoryId', 'name')
      .sort({ createdAt: -1 });
    
    // Apply search filter if provided
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      courses = courses.filter(course => {
        return (
          searchRegex.test(course.name) ||
          searchRegex.test(course.instituteName) ||
          (course.mentorId && searchRegex.test(course.mentorId.name)) ||
          (course.categoryId && searchRegex.test(course.categoryId.name))
        );
      });
    }
    
    console.log(`📦 Found ${courses.length} courses`);
    
    const formattedCourses = courses.map(course => ({
      id: course._id,
      name: course.name,
      image: course.image || '',
      instituteName: course.instituteName,
      mentorId: course.mentorId?._id || null,
      mentorName: course.mentorId?.name || '',
      categoryId: course.categoryId?._id || null,
      categoryName: course.categoryId?.name || '',
      duration: course.duration,
      numberOfSessions: course.numberOfSessions,
      status: course.status,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt
    }));
    
    res.json({
      success: true,
      courses: formattedCourses,
      total: formattedCourses.length
    });
  } catch (error) {
    console.error('❌ Get public courses error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching courses'
    });
  }
});

// Public route for subscriptions/premium plans (no authentication required)
app.get('/api/subscriptions', async (req, res) => {
  try {
    console.log('📥 Public subscriptions request received');
    const subs = await Subscription.find({ price: { $gt: 0 } })
      .populate('courseId', 'name image instituteName')
      .sort({ createdAt: -1 });

    const formatted = subs.map(sub => ({
      id: sub._id,
      courseId: sub.courseId?._id || null,
      courseName: sub.courseId?.name || '',
      courseImage: sub.courseId?.image || '',
      instituteName: sub.courseId?.instituteName || '',
      plan: sub.plan,
      price: sub.price,
      duration: sub.duration,
      activeUsers: sub.activeUsers || 0,
      description: sub.description || '',
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt
    }));

    res.json({
      success: true,
      subscriptions: formatted,
      total: formatted.length
    });
  } catch (error) {
    console.error('❌ Get public subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching subscriptions'
    });
  }
});

// Public route for single course (no authentication required)
app.get('/api/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📥 Public course detail request received for ID:', id);
    const course = await Course.findById(id)
      .populate('mentorId', 'name email courseSpecialization image')
      .populate('categoryId', 'name')
      .populate('quizId');
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }
    
    res.json({
      success: true,
      course: {
        id: course._id,
        name: course.name,
        image: course.image || '',
        instituteName: course.instituteName,
        mentorId: course.mentorId?._id || null,
        mentor: course.mentorId || null,
        categoryId: course.categoryId?._id || null,
        category: course.categoryId || null,
        duration: course.duration,
        numberOfSessions: course.numberOfSessions,
        videos: course.videos || [],
        quizId: course.quizId?._id || null,
        quiz: course.quizId || null,
        passingMarks: course.passingMarks,
        certificateWebsiteName: course.certificateWebsiteName,
        status: course.status,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt
      }
    });
  } catch (error) {
    console.error('❌ Get public course detail error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching course details'
    });
  }
});

console.log('✅ Routes registered:');
console.log('   - /api/auth (login, register, forgot-password, verify-otp, reset-password)');
console.log('   - /api/profile');
console.log('   - /api/admin');
console.log('   - /api/course-categories (public)');
console.log('   - /api/mentors (public)');
console.log('   - /api/courses (public)');
console.log('   - /api/subscriptions (public)');

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`❌ Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 API endpoint: http://localhost:${PORT}/api`);
});
