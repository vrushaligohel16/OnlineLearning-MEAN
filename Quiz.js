const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  questions: [{
    question: {
      type: String,
      required: true,
      trim: true
    },
    options: [{
      type: String,
      required: true,
      trim: true
    }],
    correctAnswer: {
      type: Number,
      required: true,
      min: 0
    },
    points: {
      type: Number,
      default: 1,
      min: 1
    }
  }],
  passingMarks: {
    type: Number,
    default: 70,
    min: 0,
    max: 100
  },
  totalMarks: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Create index on courseId
quizSchema.index({ courseId: 1 });

module.exports = mongoose.model('Quiz', quizSchema);
