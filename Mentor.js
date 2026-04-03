const mongoose = require('mongoose');

const mentorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  image: {
    type: String,
    default: ''
  },
  educationHistory: {
    type: String,
    trim: true,
    default: ''
  },
  experience: {
    type: String,
    trim: true,
    default: ''
  },
  githubLink: {
    type: String,
    trim: true,
    default: ''
  },
  linkedinLink: {
    type: String,
    trim: true,
    default: ''
  },
  youtubeLink: {
    type: String,
    trim: true,
    default: ''
  },
  courseSpecialization: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

// Create index on email for faster queries
mentorSchema.index({ email: 1 });

module.exports = mongoose.model('Mentor', mentorSchema);
