const mongoose = require('mongoose');

const courseReviewSchema = new mongoose.Schema({
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
  certificateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Certificate',
    default: null
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

// Create compound index to ensure one review per user per course
courseReviewSchema.index({ userId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model('CourseReview', courseReviewSchema);
