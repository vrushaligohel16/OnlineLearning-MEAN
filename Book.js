const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    author: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    category: {
      type: String,
      trim: true
    },
    pdfData: {
      type: String, // base64 encoded PDF
      required: true
    },
    pdfMimeType: {
      type: String,
      default: 'application/pdf'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Book', bookSchema);

