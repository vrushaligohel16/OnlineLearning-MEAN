const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    plan: {
      type: String,
      required: true,
      trim: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    duration: {
      type: String,
      required: true,
      trim: true
    },
    activeUsers: {
      type: Number,
      default: 0,
      min: 0
    },
    description: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

subscriptionSchema.index({ courseId: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);

