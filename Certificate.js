const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  courseProgressId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CourseProgress',
    required: true
  },
  certificateNumber: {
    type: String,
    required: true,
    unique: true
  },
  userName: {
    type: String,
    required: true
  },
  courseName: {
    type: String,
    required: true
  },
  instituteName: {
    type: String,
    required: true
  },
  websiteName: {
    type: String,
    default: 'ELearning'
  },
  issueDate: {
    type: Date,
    default: Date.now
  },
  pdfData: {
    type: String, // Base64 encoded PDF
    default: ''
  }
}, {
  timestamps: true
});

// Create index on userId and courseId
certificateSchema.index({ userId: 1, courseId: 1 });

module.exports = mongoose.model('Certificate', certificateSchema);
