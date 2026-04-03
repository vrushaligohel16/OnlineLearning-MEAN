import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-verify-otp',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './verify-otp.component.html',
  styleUrl: './verify-otp.component.css'
})
export class VerifyOtpComponent implements OnInit {
  verifyOtpForm: FormGroup;
  errorMessage: string = '';
  isLoading: boolean = false;
  email: string = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.verifyOtpForm = this.fb.group({
      otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
    });
  }

  ngOnInit() {
    // Get email from localStorage
    const storedEmail = localStorage.getItem('resetEmail');
    if (!storedEmail) {
      // If no email found, redirect to forgot password
      this.router.navigate(['/forgot-password']);
      return;
    }
    this.email = storedEmail;
  }

  onSubmit() {
    if (this.verifyOtpForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      this.authService.verifyOtp(this.email, this.verifyOtpForm.value.otp).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success && response.resetToken) {
            // Store reset token for next step
            localStorage.setItem('resetToken', response.resetToken);
            // Redirect to reset password page
            this.router.navigate(['/reset-password']);
          } else {
            this.errorMessage = response.message || 'Invalid OTP';
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.error?.message || 'An error occurred. Please try again.';
        }
      });
    }
  }

  onOtpInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/[^0-9]/g, '');
    this.verifyOtpForm.patchValue({ otp: value }, { emitEvent: false });
    input.value = value;
  }

  resendOtp() {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.forgotPassword(this.email).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          alert('OTP has been resent to your email address');
        } else {
          this.errorMessage = response.message || 'Failed to resend OTP';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'An error occurred. Please try again.';
      }
    });
  }
}

