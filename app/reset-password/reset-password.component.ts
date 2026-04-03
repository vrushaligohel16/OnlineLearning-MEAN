import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-reset-password',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css'
})
export class ResetPasswordComponent implements OnInit {
  resetPasswordForm: FormGroup;
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.resetPasswordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const newPassword = control.get('newPassword');
    const confirmPassword = control.get('confirmPassword');
    
    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  ngOnInit() {
    // Check if reset token exists
    const resetToken = localStorage.getItem('resetToken');
    if (!resetToken) {
      // If no token found, redirect to forgot password
      this.router.navigate(['/forgot-password']);
      return;
    }
  }

  onSubmit() {
    if (this.resetPasswordForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const resetToken = localStorage.getItem('resetToken');
      if (!resetToken) {
        this.errorMessage = 'Invalid session. Please start over.';
        this.isLoading = false;
        return;
      }

      this.authService.resetPassword(
        resetToken,
        this.resetPasswordForm.value.newPassword,
        this.resetPasswordForm.value.confirmPassword
      ).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success) {
            this.successMessage = response.message || 'Password reset successfully!';
            // Clear stored data
            localStorage.removeItem('resetToken');
            localStorage.removeItem('resetEmail');
            // Redirect to login after 2 seconds
            setTimeout(() => {
              this.router.navigate(['/login']);
            }, 2000);
          } else {
            this.errorMessage = response.message || 'Failed to reset password';
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.error?.message || 'An error occurred. Please try again.';
          // If token is invalid, redirect to forgot password
          if (error.status === 400 && error.error?.message?.includes('token')) {
            setTimeout(() => {
              this.router.navigate(['/forgot-password']);
            }, 2000);
          }
        }
      });
    }
  }
}

