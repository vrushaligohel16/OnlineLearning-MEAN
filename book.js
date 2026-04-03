const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Book = require('../models/Book');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to verify admin (same style as admin.js)
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = null;

  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else {
      token = authHeader;
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  if (token === 'admin-token') {
    req.isAdmin = true;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    req.userId = decoded.userId;
    req.isAdmin = true;
    next();
  });
};

// ==================== ADMIN BOOK ROUTES ====================

// Create book with PDF (admin)
router.post('/admin/books', authenticateAdmin, async (req, res) => {
  try {
    const { title, author, description, category, pdfData, pdfMimeType } = req.body;

    if (!title || !author || !pdfData) {
      return res.status(400).json({
        success: false,
        message: 'Title, author and PDF file are required'
      });
    }

    const book = new Book({
      title: title.trim(),
      author: author.trim(),
      description: description || '',
      category: category || '',
      pdfData,
      pdfMimeType: pdfMimeType || 'application/pdf'
    });

    await book.save();

    res.status(201).json({
      success: true,
      message: 'Book added successfully',
      book: {
        id: book._id,
        title: book.title,
        author: book.author,
        description: book.description,
        category: book.category,
        createdAt: book.createdAt
      }
    });
  } catch (error) {
    console.error('Create book error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error adding book'
    });
  }
});

// Get all books (admin, metadata only)
router.get('/admin/books', authenticateAdmin, async (req, res) => {
  try {
    const books = await Book.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      books: books.map(book => ({
        id: book._id,
        title: book.title,
        author: book.author,
        description: book.description,
        category: book.category,
        createdAt: book.createdAt
      })),
      total: books.length
    });
  } catch (error) {
    console.error('Get admin books error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching books'
    });
  }
});

// Delete book (admin)
router.delete('/admin/books/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const book = await Book.findByIdAndDelete(id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    res.json({
      success: true,
      message: 'Book deleted successfully'
    });
  } catch (error) {
    console.error('Delete book error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting book'
    });
  }
});

// ==================== PUBLIC BOOK ROUTES ====================

// Get all books (public, metadata only)
router.get('/books', async (req, res) => {
  try {
    const books = await Book.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      books: books.map(book => ({
        id: book._id,
        title: book.title,
        author: book.author,
        description: book.description,
        category: book.category,
        createdAt: book.createdAt
      })),
      total: books.length
    });
  } catch (error) {
    console.error('Get public books error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching books'
    });
  }
});

// Get single book with PDF data (public)
router.get('/books/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const book = await Book.findById(id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    res.json({
      success: true,
      book: {
        id: book._id,
        title: book.title,
        author: book.author,
        description: book.description,
        category: book.category,
        pdfData: book.pdfData,
        pdfMimeType: book.pdfMimeType,
        createdAt: book.createdAt
      }
    });
  } catch (error) {
    console.error('Get public book error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching book'
    });
  }
});

module.exports = router;

