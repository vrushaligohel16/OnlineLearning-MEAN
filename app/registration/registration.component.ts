import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-registration',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './registration.component.html',
  styleUrl: './registration.component.css'
})
export class RegistrationComponent {
  registrationForm: FormGroup;    // Reactive form group for registration form
  errorMessage: string = '';      // To store error messages
  successMessage: string = '';    // To store success messages
  isLoading: boolean = false;     // Used to show loading spinner / disable button

   // Constructor for dependency injection
  constructor(
    private fb: FormBuilder,            // Helps to create form 
    private authService: AuthService,   // Service to communicate with backend
    private router: Router              // Router for navigation    
  ) {
    this.registrationForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],     // Name validation
      email: ['', [Validators.required, Validators.email]],           // Email validation  
      password: ['', [Validators.required, Validators.minLength(6)]], // Password validation
      confirmPassword: ['', [Validators.required]]                    // Confirm Password validation
    }, { validators: this.passwordMatchValidator });    // Custom validator for matching passwords
  }

  //Custom validator function to check whether password and confirmPassword match
  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');      // Get password field value
    const confirmPassword = form.get('confirmPassword');  // Get confirmPassword field value
    
      // Check if both fields exist and values do not match
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });  // Set error on confirmPassword field
      return { passwordMismatch: true };  // Return error object
    }
    return null;  // Return null if no errors
  }

  // Function to handle form submission
  onSubmit() {
    if (this.registrationForm.valid) {  // Check if form is valid
      this.isLoading = true;               // Set loading state to true
      this.errorMessage = '';          // Reset messages
      this.successMessage = '';        // Reset messages   

      // Remove confirmPassword before sending data to backend
      const { confirmPassword, ...userData } = this.registrationForm.value;
      
      this.authService.register(userData).subscribe({   // Call register API from AuthService
        next: (response) => {             // Handle successful response
          this.isLoading = false;
          if (response.success) {
            this.successMessage = 'Registration successful! Redirecting to login...';
            setTimeout(() => {
              this.router.navigate(['/login']);   // Redirect to login page after 2 seconds
            }, 2000);
          } else {
            this.errorMessage = response.message || 'Registration failed';       // Show error message from backend
          }
        },
        error: (error) => {             // If API or network error occurs
          this.isLoading = false;
          this.errorMessage = error.error?.message || 'An error occurred during registration';
        }
      });
    }
  }
}
