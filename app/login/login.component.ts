import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {

  // Reactive form for login
  loginForm: FormGroup;

  // UI state variables
  errorMessage: string = '';
  isLoading: boolean = false;
  private returnUrl: string | null = null;

  constructor(
    private fb: FormBuilder,          // Form builder service
    private authService: AuthService, // Authentication API service
    private router: Router,           // Router for navigation
    private route: ActivatedRoute     // For reading returnUrl
  ) {
    // Initialize login form with validations
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    // Capture returnUrl from query params if present
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
  }

  // Handle login form submission
  onSubmit() {
    if (this.loginForm.valid) {

      const email = this.loginForm.value.email;
      const password = this.loginForm.value.password;

      // Hardcoded admin login check
      if (email === 'admin@gmail.com' && password === 'admin123') {
        this.isLoading = true;
        this.errorMessage = '';

        // Store admin session in localStorage
        localStorage.setItem('token', 'admin-token');
        localStorage.setItem(
          'user',
          JSON.stringify({
            id: 'admin',
            name: 'Admin',
            email: 'admin@gmail.com',
            role: 'admin'
          })
        );

        // Redirect to admin dashboard or returnUrl if provided
        setTimeout(() => {
          this.isLoading = false;
          const target = this.returnUrl || '/admin-dashboard';
          this.router.navigateByUrl(target);
        }, 500);
        return;
      }

      // Regular user login via backend
      this.isLoading = true;
      this.errorMessage = '';

      this.authService.login(this.loginForm.value).subscribe({

        next: (response) => {
          this.isLoading = false;

          if (response.success && response.token && response.user) {
            // Save user session data
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));

            // Redirect to returnUrl if present, otherwise dashboard
            const target = this.returnUrl || '/dashboard';
            this.router.navigateByUrl(target);
          } else {
            this.errorMessage = response.message || 'Login failed';
          }
        },

        error: (error) => {
          this.isLoading = false;
          this.errorMessage =
            error.error?.message || 'An error occurred during login';
        }
      });
    }
  }
}
