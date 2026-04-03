const mongoose = require('mongoose');

const courseCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  image: {
    type: String,
    default: ''
  },
  numberOfCourses: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Create index on name for faster queries
courseCategorySchema.index({ name: 1 });

module.exports = mongoose.model('CourseCategory', courseCategorySchema);
