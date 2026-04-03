import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService, PurchasedCourse } from '../services/auth.service';

@Component({
  selector: 'app-profile',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {

  // Logged-in user basic info (from localStorage)
  user: any = null;

  // Full profile data (from backend)
  profile: any = null;

  // Reactive form for profile editing
  profileForm: FormGroup;

  // UI state flags
  isEditing = false;
  isLoading = false;

  // UI messages
  successMessage = '';
  errorMessage = '';

  // Completed courses and certificates data
  completedCourses: any[] = [];
  certificates: any[] = [];

  // Purchased courses (active subscriptions)
  purchasedCourses: PurchasedCourse[] = [];

  // Image upload properties
  selectedImage: File | null = null;
  imagePreview: string | null = null;

  constructor(
    private fb: FormBuilder,          // Form builder service
    private authService: AuthService, // Auth & profile API service
    private router: Router            // Router for navigation
  ) {
    // Profile form initialization
    this.profileForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      address: [''],
      bio: ['']
    });
  }

  // Component initialization
  ngOnInit() {

    // Redirect to login if user is not authenticated
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    // Load user data from localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      this.user = JSON.parse(userStr);
    }

    // Fetch profile data from backend
    this.loadProfile();
    
    // Fetch completed courses and certificates
    this.loadCompletedCourses();

    // Fetch purchased courses
    this.loadPurchasedCourses();
  }

  // Load profile from backend
  loadProfile() {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.getProfile().subscribe({
      next: (response) => {
        this.isLoading = false;

        if (response.success && response.profile) {
          this.profile = response.profile;
          this.loadFormData();
        } else {
          this.errorMessage = response.message || 'Failed to load profile';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Error loading profile';
        console.error('Profile load error:', error);
      }
    });
  }

  // Populate form with profile data
  loadFormData() {
    this.profileForm.patchValue({
      name: this.profile?.name || '',
      email: this.profile?.email || '',
      phone: this.profile?.phone || '',
      address: this.profile?.address || '',
      bio: this.profile?.bio || ''
    });
    
    // Load image preview if available
    if (this.profile?.image) {
      this.imagePreview = this.profile.image;
    } else {
      this.imagePreview = null;
    }
    this.selectedImage = null;
  }

  // Enable / disable edit mode
  toggleEdit() {
    this.isEditing = !this.isEditing;

    // Reset form when edit is cancelled
    if (!this.isEditing) {
      this.loadFormData();
      this.errorMessage = '';
      this.selectedImage = null;
    }
  }

  // Handle image file selection
  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      // Validate file type
      if (!file.type.match(/image\/(jpeg|jpg|png|gif|webp)/)) {
        this.errorMessage = 'Please select a valid image file (JPEG, PNG, GIF, or WEBP)';
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage = 'Image size should be less than 5MB';
        return;
      }
      
      this.selectedImage = file;
      this.errorMessage = '';
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  // Convert image file to base64
  convertImageToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        resolve(base64String);
      };
      reader.onerror = (error) => {
        reject(error);
      };
      reader.readAsDataURL(file);
    });
  }

  // Save updated profile
  async saveProfile() {
    if (this.profileForm.valid) {

      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      try {
        // Prepare profile data for API
        let imageData = this.profile?.image || '';
        
        // Convert selected image to base64 if a new image was selected
        if (this.selectedImage) {
          imageData = await this.convertImageToBase64(this.selectedImage);
        }

        const profileData = {
          name: this.profileForm.value.name,
          email: this.profileForm.value.email,
          phone: this.profileForm.value.phone || '',
          address: this.profileForm.value.address || '',
          bio: this.profileForm.value.bio || '',
          image: imageData
        };

        this.authService.updateProfile(profileData).subscribe({
          next: (response) => {
            this.isLoading = false;

            if (response.success && response.profile) {
              this.profile = response.profile;

              // Update localStorage user data
              if (this.user) {
                this.user.name = response.profile.name;
                this.user.email = response.profile.email;
                localStorage.setItem('user', JSON.stringify(this.user));
              }

              // Update image preview
              if (response.profile.image) {
                this.imagePreview = response.profile.image;
              }

              this.selectedImage = null;
              this.isEditing = false;
              this.successMessage = response.message || 'Profile updated successfully!';

              // Auto-hide success message
              setTimeout(() => {
                this.successMessage = '';
              }, 3000);
            } else {
              this.errorMessage = response.message || 'Failed to update profile';
            }
          },
          error: (error) => {
            this.isLoading = false;
            this.errorMessage = error.error?.message || 'Error updating profile';
            console.error('Profile update error:', error);
          }
        });
      } catch (error) {
        this.isLoading = false;
        this.errorMessage = 'Error processing image. Please try again.';
        console.error('Image conversion error:', error);
      }

    } else {
      this.errorMessage = 'Please fill in all required fields correctly.';
    }
  }

  // Load completed courses and certificates
  loadCompletedCourses() {
    this.authService.getCompletedCourses().subscribe({
      next: (response) => {
        if (response.success) {
          this.completedCourses = response.completedCourses || [];
          this.certificates = response.certificates || [];
        } else {
          console.error('Failed to load completed courses:', response.message);
        }
      },
      error: (error) => {
        console.error('Error loading completed courses:', error);
      }
    });
  }

  // Load purchased courses
  loadPurchasedCourses() {
    this.authService.getMyPurchasedCourses().subscribe({
      next: (res) => {
        if (res.success && res.courses) {
          this.purchasedCourses = res.courses;
        } else {
          this.purchasedCourses = [];
        }
      },
      error: (error) => {
        console.error('Error loading purchased courses:', error);
        this.purchasedCourses = [];
      }
    });
  }

  // Download invoice for a purchased course
  downloadInvoice(purchase: PurchasedCourse) {
    if (!purchase || !purchase.invoiceId) {
      this.errorMessage = 'Invoice not available';
      return;
    }

    this.authService.getInvoice(purchase.invoiceId).subscribe({
      next: (res) => {
        if (res.success && res.invoice && res.invoice.pdfData) {
          try {
            const pdfBlob = this.base64ToBlob(res.invoice.pdfData, 'application/pdf');
            const url = window.URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Invoice_${res.invoice.invoiceNumber || 'course'}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
          } catch (error) {
            console.error('Error downloading invoice:', error);
            this.errorMessage = 'Error downloading invoice';
          }
        } else {
          this.errorMessage = res.message || 'Invoice not available';
        }
      },
      error: (error) => {
        console.error('Error fetching invoice:', error);
        this.errorMessage = error.error?.message || 'Error fetching invoice';
      }
    });
  }

  // Download certificate
  downloadCertificate(certificate: any) {
    if (!certificate || !certificate.pdfData) {
      this.errorMessage = 'Certificate not available';
      return;
    }

    try {
      const pdfBlob = this.base64ToBlob(certificate.pdfData, 'application/pdf');
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Certificate_${certificate.certificateNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading certificate:', error);
      this.errorMessage = 'Error downloading certificate';
    }
  }

  // Convert base64 to Blob
  base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  // Format date
  formatDate(date: string | Date): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  // Logout user and redirect to login
  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
