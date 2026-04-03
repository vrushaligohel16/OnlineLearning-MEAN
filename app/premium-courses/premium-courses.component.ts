import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-premium-courses',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './premium-courses.component.html',
  styleUrl: './premium-courses.component.css'
})
export class PremiumCoursesComponent implements OnInit {
  premiumSubscriptions: any[] = [];
  isLoading = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadPremiumSubscriptions();
  }

  loadPremiumSubscriptions() {
    this.isLoading = true;
    this.errorMessage = '';
    this.premiumSubscriptions = [];

    this.authService.getPublicSubscriptions().subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.subscriptions) {
          this.premiumSubscriptions = response.subscriptions;
        } else {
          this.premiumSubscriptions = [];
          this.errorMessage = response.message || 'Failed to load premium courses.';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.premiumSubscriptions = [];
        this.errorMessage = error.error?.message || 'Error loading premium courses.';
      }
    });
  }

  goToPayment(courseId: string) {
    if (!courseId) {
      return;
    }
    // Require login first
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: `/payment/${courseId}` } });
      return;
    }
    this.router.navigate(['/payment', courseId]);
  }

  goToCourse(courseId: string) {
    if (!courseId) {
      return;
    }
    this.router.navigate(['/course', courseId]);
  }
}

