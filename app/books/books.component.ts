import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService, Book } from '../services/auth.service';
import { SafeUrlPipe } from '../shared/safe-url.pipe';

@Component({
  selector: 'app-books',
  standalone: true,
  imports: [CommonModule, SafeUrlPipe],
  templateUrl: './books.component.html',
  styleUrl: './books.component.css'
})
export class BooksComponent implements OnInit {
  books: Book[] = [];
  selectedBook: Book | null = null;
  pdfUrl: string | null = null;
  isLoading: boolean = false;
  isLoadingPdf: boolean = false;
  errorMessage: string = '';

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.loadBooks();
  }

  loadBooks() {
    this.isLoading = true;
    this.errorMessage = '';
    this.authService.getPublicBooks().subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.books) {
          this.books = response.books;
        } else {
          this.errorMessage = response.message || 'Failed to load books';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Error loading books';
        console.error('Public load books error:', error);
      }
    });
  }

  openBook(book: Book) {
    if (!book.id) return;
    this.selectedBook = book;
    this.pdfUrl = null;
    this.isLoadingPdf = true;
    this.errorMessage = '';

    this.authService.getPublicBook(book.id).subscribe({
      next: (response) => {
        this.isLoadingPdf = false;
        if (response.success && response.book && response.book.pdfData) {
          const mimeType = response.book.pdfMimeType || 'application/pdf';
          // pdfData is stored as data URL string (e.g., data:application/pdf;base64,....)
          // Use it directly in the iframe
          this.pdfUrl = response.book.pdfData.startsWith('data:')
            ? response.book.pdfData
            : `data:${mimeType};base64,${response.book.pdfData}`;
        } else {
          this.errorMessage = response.message || 'Failed to load book PDF';
        }
      },
      error: (error) => {
        this.isLoadingPdf = false;
        this.errorMessage = error.error?.message || 'Error loading book PDF';
        console.error('Public get book error:', error);
      }
    });
  }

  clearSelection() {
    this.selectedBook = null;
    this.pdfUrl = null;
  }
}

