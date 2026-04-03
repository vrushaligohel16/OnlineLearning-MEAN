const express = require('express');
const router = express.Router();
const User = require('../models/User');
const CourseCategory = require('../models/CourseCategory');
const Course = require('../models/Course');
const Subscription = require('../models/Subscription');
const Mentor = require('../models/Mentor');
const Quiz = require('../models/Quiz');
const Certificate = require('../models/Certificate');
const CourseReview = require('../models/CourseReview');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to verify JWT token and check admin role
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = null;
  
  // Handle both "Bearer token" and direct token
  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else {
      token = authHeader;
    }
  }

  console.log('Admin auth - Token received:', token ? 'Token present' : 'No token');
  console.log('Admin auth - Auth header:', authHeader);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  // For admin login, we'll check if it's the admin token
  // In production, you should have a proper admin role check
  if (token === 'admin-token') {
    console.log('Admin token verified');
    req.isAdmin = true;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log('JWT verification failed:', err.message);
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    // In production, check if user has admin role
    req.userId = decoded.userId;
    req.isAdmin = true; // For now, allow if token is valid
    next();
  });
};

// Get all students/users (excluding admin)
router.get('/students', authenticateAdmin, async (req, res) => {
  try {
    console.log('Fetching students from database...');
    // Exclude admin user from the query
    const users = await User.find({ email: { $ne: 'admin@gmail.com' } })
      .select('-password')
      .sort({ createdAt: -1 });
    console.log(`Found ${users.length} students (admin excluded)`);

    const students = users.map(user => ({
      id: user._id,
      name: user.name,
      email: user.email,
      enrolledDate: user.createdAt ? new Date(user.createdAt).toISOString().split('T')[0] : 'N/A',
      status: 'Active'
    }));

    res.json({
      success: true,
      students: students,
      total: students.length
    });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching students'
    });
  }
});

// Delete student
router.delete('/students/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting student'
    });
  }
});

// ==================== Course Categories CRUD ====================

// Get all course categories
router.get('/course-categories', authenticateAdmin, async (req, res) => {
  try {
    const categories = await CourseCategory.find().sort({ createdAt: -1 });
    
    res.json({
      success: true,
      categories: categories.map(cat => ({
        id: cat._id,
        name: cat.name,
        image: cat.image || '',
        numberOfCourses: cat.numberOfCourses,
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt
      })),
      total: categories.length
    });
  } catch (error) {
    console.error('Get course categories error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching course categories'
    });
  }
});

// Get single course category
router.get('/course-categories/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const category = await CourseCategory.findById(id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Course category not found'
      });
    }
    
    res.json({
      success: true,
      category: {
        id: category._id,
        name: category.name,
        image: category.image || '',
        numberOfCourses: category.numberOfCourses,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt
      }
    });
  } catch (error) {
    console.error('Get course category error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching course category'
    });
  }
});

// Create course category
router.post('/course-categories', authenticateAdmin, async (req, res) => {
  try {
    const { name, image } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }
    
    // Check if category with same name already exists
    const existingCategory = await CourseCategory.findOne({ name: name.trim() });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }
    
    const category = new CourseCategory({
      name: name.trim(),
      image: image || '',
      numberOfCourses: 0
    });
    
    await category.save();
    
    res.status(201).json({
      success: true,
      message: 'Course category created successfully',
      category: {
        id: category._id,
        name: category.name,
        image: category.image || '',
        numberOfCourses: category.numberOfCourses,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt
      }
    });
  } catch (error) {
    console.error('Create course category error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating course category'
    });
  }
});

// Update course category
router.put('/course-categories/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, image } = req.body;
    
    const category = await CourseCategory.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Course category not found'
      });
    }
    
    // If name is being updated, check for duplicates
    if (name && name.trim() !== category.name) {
      const existingCategory = await CourseCategory.findOne({ 
        name: name.trim(),
        _id: { $ne: id }
      });
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists'
        });
      }
      category.name = name.trim();
    }
    
    if (image !== undefined) {
      category.image = image || '';
    }
    
    await category.save();
    
    res.json({
      success: true,
      message: 'Course category updated successfully',
      category: {
        id: category._id,
        name: category.name,
        image: category.image || '',
        numberOfCourses: category.numberOfCourses,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt
      }
    });
  } catch (error) {
    console.error('Update course category error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating course category'
    });
  }
});

// Delete course category
router.delete('/course-categories/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if category has courses
    const coursesCount = await Course.countDocuments({ categoryId: id });
    if (coursesCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. It has ${coursesCount} course(s) associated with it.`
      });
    }
    
    const category = await CourseCategory.findByIdAndDelete(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Course category not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Course category deleted successfully'
    });
  } catch (error) {
    console.error('Delete course category error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting course category'
    });
  }
});

// ==================== Course Management ====================

// Get all courses
router.get('/courses', authenticateAdmin, async (req, res) => {
  try {
    const courses = await Course.find()
      .populate('mentorId', 'name email')
      .populate('categoryId', 'name')
      .populate('quizId')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      courses: courses.map(course => ({
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
        videos: course.videos || [],
        quizId: course.quizId?._id || null,
        passingMarks: course.passingMarks,
        certificateWebsiteName: course.certificateWebsiteName,
        status: course.status,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt
      })),
      total: courses.length
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching courses'
    });
  }
});

// Get single course
router.get('/courses/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id)
      .populate('mentorId', 'name email')
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
        mentorName: course.mentorId?.name || '',
        categoryId: course.categoryId?._id || null,
        categoryName: course.categoryId?.name || '',
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
    console.error('Get course error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching course'
    });
  }
});

// Create course
router.post('/courses', authenticateAdmin, async (req, res) => {
  try {
    const { 
      name, 
      image, 
      instituteName, 
      mentorId, 
      categoryId, 
      duration, 
      numberOfSessions, 
      videos, 
      quizData,
      subscriptionData,
      passingMarks,
      certificateWebsiteName,
      status 
    } = req.body;
    
    // Validation
    if (!name || !instituteName || !mentorId || !categoryId || !duration || !numberOfSessions) {
      return res.status(400).json({
        success: false,
        message: 'Name, institute name, mentor, category, duration, and number of sessions are required'
      });
    }
    
    // Verify category exists
    const category = await CourseCategory.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Course category not found'
      });
    }
    
    // Verify mentor exists
    const mentor = await Mentor.findById(mentorId);
    if (!mentor) {
      return res.status(404).json({
        success: false,
        message: 'Mentor not found'
      });
    }
    
    // Validate videos array matches numberOfSessions
    if (videos && videos.length !== numberOfSessions) {
      return res.status(400).json({
        success: false,
        message: `Number of videos (${videos.length}) must match number of sessions (${numberOfSessions})`
      });
    }
    
    // Create course first (without quizId initially)
    const course = new Course({
      name: name.trim(),
      image: image || '',
      instituteName: instituteName.trim(),
      mentorId: mentorId,
      categoryId: categoryId,
      duration: duration,
      numberOfSessions: numberOfSessions,
      videos: videos || [],
      quizId: null, // Will be set after quiz creation
      passingMarks: passingMarks || 70,
      certificateWebsiteName: certificateWebsiteName || 'ELearning',
      status: status || 'Draft'
    });
    
    await course.save();
    
    // Create quiz if quizData is provided (now we have courseId)
    let quizId = null;
    if (quizData && quizData.questions && quizData.questions.length > 0) {
      const totalMarks = quizData.questions.reduce((sum, q) => sum + (q.points || 1), 0);
      const quiz = new Quiz({
        courseId: course._id, // Now we have the course ID
        questions: quizData.questions,
        passingMarks: passingMarks || 70,
        totalMarks: totalMarks
      });
      await quiz.save();
      quizId = quiz._id;
      
      // Update course with quizId
      course.quizId = quizId;
      await course.save();
    }
    
    // Create subscription if provided
    if (subscriptionData && subscriptionData.plan && subscriptionData.price && subscriptionData.duration) {
      const subscription = new Subscription({
        courseId: course._id,
        plan: subscriptionData.plan.trim(),
        price: subscriptionData.price,
        duration: subscriptionData.duration.trim(),
        description: subscriptionData.description || ''
      });
      await subscription.save();
    }

    // Increment category's numberOfCourses
    category.numberOfCourses += 1;
    await category.save();
    
    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      course: {
        id: course._id,
        name: course.name,
        image: course.image || '',
        instituteName: course.instituteName,
        mentorId: course.mentorId,
        categoryId: course.categoryId,
        duration: course.duration,
        numberOfSessions: course.numberOfSessions,
        videos: course.videos,
        quizId: course.quizId,
        passingMarks: course.passingMarks,
        certificateWebsiteName: course.certificateWebsiteName,
        status: course.status,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt
      }
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating course'
    });
  }
});

// Update course
router.put('/courses/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      image, 
      instituteName, 
      mentorId, 
      categoryId, 
      duration, 
      numberOfSessions, 
      videos, 
      quizData,
      subscriptionData,
      passingMarks,
      certificateWebsiteName,
      status 
    } = req.body;
    
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }
    
    // Validate videos array matches numberOfSessions if provided
    if (videos && numberOfSessions && videos.length !== numberOfSessions) {
      return res.status(400).json({
        success: false,
        message: `Number of videos (${videos.length}) must match number of sessions (${numberOfSessions})`
      });
    }
    
    // Update quiz if quizData is provided
    if (quizData && quizData.questions && quizData.questions.length > 0) {
      const totalMarks = quizData.questions.reduce((sum, q) => sum + (q.points || 1), 0);
      
      if (course.quizId) {
        // Update existing quiz
        await Quiz.findByIdAndUpdate(course.quizId, {
          questions: quizData.questions,
          passingMarks: passingMarks || course.passingMarks || 70,
          totalMarks: totalMarks
        });
      } else {
        // Create new quiz
        const quiz = new Quiz({
          courseId: course._id,
          questions: quizData.questions,
          passingMarks: passingMarks || 70,
          totalMarks: totalMarks
        });
        await quiz.save();
        course.quizId = quiz._id;
      }
    }
    
    // Update course fields
    if (name !== undefined) course.name = name.trim();
    if (image !== undefined) course.image = image || '';
    if (instituteName !== undefined) course.instituteName = instituteName.trim();
    if (mentorId !== undefined) {
      const mentor = await Mentor.findById(mentorId);
      if (!mentor) {
        return res.status(404).json({
          success: false,
          message: 'Mentor not found'
        });
      }
      course.mentorId = mentorId;
    }
    if (categoryId !== undefined) {
      const category = await CourseCategory.findById(categoryId);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Course category not found'
        });
      }
      course.categoryId = categoryId;
    }
    if (duration !== undefined) course.duration = duration;
    if (numberOfSessions !== undefined) course.numberOfSessions = numberOfSessions;
    if (videos !== undefined) course.videos = videos;
    if (passingMarks !== undefined) course.passingMarks = passingMarks;
    if (certificateWebsiteName !== undefined) course.certificateWebsiteName = certificateWebsiteName;
    if (status !== undefined) course.status = status;
    
    await course.save();

    // Optionally upsert subscription if subscriptionData is provided
    if (subscriptionData && subscriptionData.plan && subscriptionData.price && subscriptionData.duration) {
      let subscription = await Subscription.findOne({ courseId: course._id });
      if (!subscription) {
        subscription = new Subscription({
          courseId: course._id
        });
      }
      subscription.plan = subscriptionData.plan.trim();
      subscription.price = subscriptionData.price;
      subscription.duration = subscriptionData.duration.trim();
      subscription.description = subscriptionData.description || '';
      await subscription.save();
    }
    
    res.json({
      success: true,
      message: 'Course updated successfully',
      course: {
        id: course._id,
        name: course.name,
        image: course.image || '',
        instituteName: course.instituteName,
        mentorId: course.mentorId,
        categoryId: course.categoryId,
        duration: course.duration,
        numberOfSessions: course.numberOfSessions,
        videos: course.videos,
        quizId: course.quizId,
        passingMarks: course.passingMarks,
        certificateWebsiteName: course.certificateWebsiteName,
        status: course.status,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt
      }
    });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating course'
    });
  }
});

// Delete course
router.delete('/courses/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }
    
    // Delete associated quiz
    if (course.quizId) {
      await Quiz.findByIdAndDelete(course.quizId);
    }
    
    // Delete associated subscription(s)
    await Subscription.deleteMany({ courseId: course._id });

    // Decrement category's numberOfCourses
    const category = await CourseCategory.findById(course.categoryId);
    if (category && category.numberOfCourses > 0) {
      category.numberOfCourses -= 1;
      await category.save();
    }
    
    await Course.findByIdAndDelete(id);
    
    res.json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting course'
    });
  }
});

// ==================== Mentor CRUD ====================

// Get all mentors
router.get('/mentors', authenticateAdmin, async (req, res) => {
  try {
    const mentors = await Mentor.find().sort({ createdAt: -1 });
    
    res.json({
      success: true,
      mentors: mentors.map(mentor => ({
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
      })),
      total: mentors.length
    });
  } catch (error) {
    console.error('Get mentors error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching mentors'
    });
  }
});

// Get single mentor
router.get('/mentors/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
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
    console.error('Get mentor error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching mentor'
    });
  }
});

// Create mentor
router.post('/mentors', authenticateAdmin, async (req, res) => {
  try {
    const { name, email, image, educationHistory, experience, githubLink, linkedinLink, youtubeLink, courseSpecialization } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Mentor name is required'
      });
    }
    
    if (!email || email.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Email address is required'
      });
    }
    
    // Check if mentor with same email already exists
    const existingMentor = await Mentor.findOne({ email: email.trim().toLowerCase() });
    if (existingMentor) {
      return res.status(400).json({
        success: false,
        message: 'Mentor with this email already exists'
      });
    }
    
    const mentor = new Mentor({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      image: image || '',
      educationHistory: educationHistory || '',
      experience: experience || '',
      githubLink: githubLink || '',
      linkedinLink: linkedinLink || '',
      youtubeLink: youtubeLink || '',
      courseSpecialization: courseSpecialization || ''
    });
    
    await mentor.save();
    
    res.status(201).json({
      success: true,
      message: 'Mentor created successfully',
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
    console.error('Create mentor error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating mentor'
    });
  }
});

// Update mentor
router.put('/mentors/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, image, educationHistory, experience, githubLink, linkedinLink, youtubeLink, courseSpecialization } = req.body;
    
    const mentor = await Mentor.findById(id);
    if (!mentor) {
      return res.status(404).json({
        success: false,
        message: 'Mentor not found'
      });
    }
    
    // If email is being updated, check for duplicates
    if (email && email.trim().toLowerCase() !== mentor.email) {
      const existingMentor = await Mentor.findOne({ 
        email: email.trim().toLowerCase(),
        _id: { $ne: id }
      });
      if (existingMentor) {
        return res.status(400).json({
          success: false,
          message: 'Mentor with this email already exists'
        });
      }
      mentor.email = email.trim().toLowerCase();
    }
    
    if (name !== undefined) mentor.name = name.trim();
    if (image !== undefined) mentor.image = image || '';
    if (educationHistory !== undefined) mentor.educationHistory = educationHistory || '';
    if (experience !== undefined) mentor.experience = experience || '';
    if (githubLink !== undefined) mentor.githubLink = githubLink || '';
    if (linkedinLink !== undefined) mentor.linkedinLink = linkedinLink || '';
    if (youtubeLink !== undefined) mentor.youtubeLink = youtubeLink || '';
    if (courseSpecialization !== undefined) mentor.courseSpecialization = courseSpecialization || '';
    
    await mentor.save();
    
    res.json({
      success: true,
      message: 'Mentor updated successfully',
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
    console.error('Update mentor error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating mentor'
    });
  }
});

// Delete mentor
router.delete('/mentors/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const mentor = await Mentor.findByIdAndDelete(id);
    if (!mentor) {
      return res.status(404).json({
        success: false,
        message: 'Mentor not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Mentor deleted successfully'
    });
  } catch (error) {
    console.error('Delete mentor error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting mentor'
    });
  }
});

// Get all certificates
router.get('/certificates', authenticateAdmin, async (req, res) => {
  try {
    const certificates = await Certificate.find()
      .populate('userId', 'name email')
      .populate('courseId', 'name image instituteName')
      .sort({ issueDate: -1 });

    const formattedCertificates = certificates
      .filter(cert => cert.courseId && cert.userId) // Filter out deleted courses/users
      .map(cert => ({
        id: cert._id,
        certificateNumber: cert.certificateNumber,
        userId: cert.userId._id,
        userName: cert.userName,
        userEmail: cert.userId.email,
        courseId: cert.courseId._id,
        courseName: cert.courseId.name,
        courseImage: cert.courseId.image || '',
        instituteName: cert.instituteName,
        websiteName: cert.websiteName,
        issueDate: cert.issueDate,
        createdAt: cert.createdAt
      }));

    res.json({
      success: true,
      certificates: formattedCertificates,
      total: formattedCertificates.length
    });
  } catch (error) {
    console.error('Get certificates error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching certificates'
    });
  }
});

// ==================== Subscription Management ====================

// Get all subscriptions
router.get('/subscriptions', authenticateAdmin, async (req, res) => {
  try {
    const subs = await Subscription.find()
      .populate('courseId', 'name instituteName')
      .sort({ createdAt: -1 });

    const formatted = subs.map(sub => ({
      id: sub._id,
      courseId: sub.courseId?._id || null,
      courseName: sub.courseId?.name || '',
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
    console.error('Get subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching subscriptions'
    });
  }
});

// Create subscription
router.post('/subscriptions', authenticateAdmin, async (req, res) => {
  try {
    const { courseId, plan, price, duration, description } = req.body;

    if (!courseId || !plan || price === undefined || price === null || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Course, plan, price and duration are required'
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const sub = new Subscription({
      courseId,
      plan: plan.trim(),
      price,
      duration: duration.trim(),
      description: description || ''
    });

    await sub.save();

    res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      subscription: {
        id: sub._id,
        courseId: sub.courseId,
        plan: sub.plan,
        price: sub.price,
        duration: sub.duration,
        activeUsers: sub.activeUsers,
        description: sub.description,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt
      }
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating subscription'
    });
  }
});

// Update subscription
router.put('/subscriptions/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { courseId, plan, price, duration, description, activeUsers } = req.body;

    const sub = await Subscription.findById(id);
    if (!sub) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    if (courseId) {
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }
      sub.courseId = courseId;
    }

    if (plan !== undefined) sub.plan = plan.trim();
    if (price !== undefined) sub.price = price;
    if (duration !== undefined) sub.duration = duration.trim();
    if (description !== undefined) sub.description = description || '';
    if (activeUsers !== undefined) sub.activeUsers = activeUsers;

    await sub.save();

    res.json({
      success: true,
      message: 'Subscription updated successfully',
      subscription: {
        id: sub._id,
        courseId: sub.courseId,
        plan: sub.plan,
        price: sub.price,
        duration: sub.duration,
        activeUsers: sub.activeUsers,
        description: sub.description,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt
      }
    });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating subscription'
    });
  }
});

// Delete subscription
router.delete('/subscriptions/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const sub = await Subscription.findByIdAndDelete(id);

    if (!sub) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    res.json({
      success: true,
      message: 'Subscription deleted successfully'
    });
  } catch (error) {
    console.error('Delete subscription error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting subscription'
    });
  }
});

// Get all reviews/feedback
router.get('/reviews', authenticateAdmin, async (req, res) => {
  try {
    const reviews = await CourseReview.find()
      .populate('userId', 'name email')
      .populate('courseId', 'name image instituteName')
      .sort({ createdAt: -1 });

    const formattedReviews = reviews
      .filter(review => review.courseId && review.userId) // Filter out deleted courses/users
      .map(review => ({
        id: review._id,
        userId: review.userId._id,
        userName: review.userId.name,
        userEmail: review.userId.email,
        courseId: review.courseId._id,
        courseName: review.courseId.name,
        courseImage: review.courseId.image || '',
        instituteName: review.courseId.instituteName,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt
      }));

    res.json({
      success: true,
      reviews: formattedReviews,
      total: formattedReviews.length
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching reviews'
    });
  }
});

// Test route (without auth for debugging)
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Admin routes are working'
  });
});

module.exports = router;

