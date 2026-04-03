import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService, ContactMessage } from '../services/auth.service';

declare var WOW: any;

@Component({
  selector: 'app-contact',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css'
})
export class ContactComponent implements OnInit, AfterViewInit {
  contactForm: { name: string; email: string; subject: string; message: string } = {
    name: '',
    email: '',
    subject: '',
    message: ''
  };
  myContacts: ContactMessage[] = [];
  isSubmitting = false;
  isLoadingMessages = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    setTimeout(() => {
      const spinner = document.getElementById('spinner');
      if (spinner) {
        spinner.classList.remove('show');
      }
    }, 1);

    // Prefill user name/email if available
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.contactForm.name = user.name || '';
        this.contactForm.email = user.email || '';
      } catch {
        // ignore parse errors
      }
    }

    this.loadMyMessages();
  }

  ngAfterViewInit() {
    if (typeof WOW !== 'undefined') {
      new WOW().init();
    }
  }

  loadMyMessages() {
    this.isLoadingMessages = true;
    this.errorMessage = '';
    this.authService.getMyContactMessages().subscribe({
      next: (response) => {
        this.isLoadingMessages = false;
        if (response.success && response.contacts) {
          this.myContacts = response.contacts;
        } else {
          this.errorMessage = response.message || 'Failed to load your messages';
        }
      },
      error: (error) => {
        this.isLoadingMessages = false;
        this.errorMessage = error.error?.message || 'Error loading your messages';
        console.error('Load user contacts error:', error);
      }
    });
  }

  submitContact() {
    if (!this.contactForm.subject || !this.contactForm.message) {
      this.errorMessage = 'Subject and message are required';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.sendContactMessage({
      name: this.contactForm.name,
      email: this.contactForm.email,
      subject: this.contactForm.subject,
      message: this.contactForm.message
    }).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        if (response.success) {
          this.successMessage = response.message || 'Message sent successfully';
          this.contactForm.subject = '';
          this.contactForm.message = '';
          this.loadMyMessages();
        } else {
          this.errorMessage = response.message || 'Failed to send message';
        }
      },
      error: (error) => {
        this.isSubmitting = false;
        this.errorMessage = error.error?.message || 'Error sending message';
        console.error('Send contact message error:', error);
      }
    });
  }

  deleteMessage(contact: ContactMessage) {
    if (!contact.id) {
      return;
    }
    if (!confirm('Are you sure you want to delete this message?')) {
      return;
    }
    this.authService.deleteMyContactMessage(contact.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.myContacts = this.myContacts.filter(c => c.id !== contact.id);
        }
      },
      error: (error) => {
        console.error('Delete contact message error:', error);
      }
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
