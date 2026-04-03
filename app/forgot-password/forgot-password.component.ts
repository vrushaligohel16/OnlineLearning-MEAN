import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent {
  forgotPasswordForm: FormGroup;
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit() {
    if (this.forgotPasswordForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      this.authService.forgotPassword(this.forgotPasswordForm.value.email).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success) {
            this.successMessage = response.message || 'OTP has been sent to your email address';
            // Store email for next step
            localStorage.setItem('resetEmail', this.forgotPasswordForm.value.email);
            // Redirect to verify OTP page after 2 seconds
            setTimeout(() => {
              this.router.navigate(['/verify-otp']);
            }, 2000);
          } else {
            this.errorMessage = response.message || 'Failed to send OTP';
          }
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Forgot password error:', error);
          // Check if it's a 404 error (route not found)
          if (error.status === 404) {
            this.errorMessage = 'Backend server route not found. Please ensure the backend server is running and restarted.';
          } else {
            this.errorMessage = error.error?.message || error.message || 'An error occurred. Please try again.';
          }
        }
      });
    }
  }
}

