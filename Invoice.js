const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema(
  {
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
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    plan: {
      type: String,
      required: true,
      trim: true
    },
    invoiceNumber: {
      type: String,
      required: true,
      trim: true
    },
    pdfData: {
      type: String, // base64-encoded PDF
      required: true
    },
    validUntil: {
      type: Date,
      required: false
    },
    paymentMethod: {
      type: String,
      enum: ['UPI', 'CARD', 'NET_BANKING', 'WALLET'],
      required: false
    }
  },
  {
    timestamps: true
  }
);

invoiceSchema.index({ userId: 1 });
invoiceSchema.index({ courseId: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);

