const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  duration: {
    type: Number,
    required: true,
    min: 1
  },
  videoUrl: {
    type: String,
    default: ''
  }
}, { _id: true });

const courseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  image: {
    type: String,
    default: ''
  },
  instituteName: {
    type: String,
    required: true,
    trim: true
  },
  mentorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mentor',
    required: true
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CourseCategory',
    required: true
  },
  duration: {
    type: Number,
    required: true,
    min: 1
  },
  numberOfSessions: {
    type: Number,
    required: true,
    min: 1
  },
  videos: [videoSchema],
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    default: null
  },
  passingMarks: {
    type: Number,
    default: 70,
    min: 0,
    max: 100
  },
  certificateWebsiteName: {
    type: String,
    default: 'ELearning'
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Draft'],
    default: 'Draft'
  }
}, {
  timestamps: true
});

// Create indexes for faster queries
courseSchema.index({ categoryId: 1 });
courseSchema.index({ mentorId: 1 });
courseSchema.index({ status: 1 });

module.exports = mongoose.model('Course', courseSchema);
