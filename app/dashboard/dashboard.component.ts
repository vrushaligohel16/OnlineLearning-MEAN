import { Component, OnInit, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';

declare var $: any;
declare var WOW: any;

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, AfterViewInit {
  user: any = null;
  courseCategories: any[] = [];
  isLoadingCategories: boolean = false;
  mentors: any[] = [];
  isLoadingMentors: boolean = false;
  courses: any[] = [];
  isLoadingCourses: boolean = false;
  premiumSubscriptions: any[] = [];
  isLoadingPremium: boolean = false;
  subscriptionsByCourse: { [courseId: string]: any } = {};
  private courseAccessCache: { [courseId: string]: boolean } = {};
  private purchasedCourses: { [courseId: string]: boolean } = {};
  
  // Mentor details modal
  selectedMentor: any = null;
  isMentorModalOpen: boolean = false;
  isLoadingMentorDetails: boolean = false;
  
  // Search functionality
  searchQuery: string = '';
  searchedCourses: any[] = [];
  showSearchResults: boolean = false;
  isSearching: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    // Load user data if logged in (optional - dashboard is public)
    this.loadUserData();
    // Load purchased courses for logged-in users
    if (this.authService.isAuthenticated()) {
      this.loadPurchasedCourses();
    }
    // Load course categories and mentors for public view
    this.loadCourseCategories();
    this.loadMentors();
    this.loadCourses();
    // Always load premium subscriptions; UI will handle empty state
    this.loadPremiumSubscriptions();
  }

  loadUserData() {
    // Guard for SSR: localStorage only exists in the browser
    if (typeof window === 'undefined') {
      this.user = null;
      return;
    }

    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        this.user = JSON.parse(userStr);
      } catch (e) {
        this.user = null;
      }
    } else {
      this.user = null;
    }
  }

  ngAfterViewInit() {
    // Hide spinner after view is initialized
    setTimeout(() => {
      const spinner = document.getElementById('spinner');
      if (spinner) {
        spinner.classList.remove('show');
      }
    }, 100);
    
    // Initialize WOW.js
    if (typeof WOW !== 'undefined') {
      new WOW().init();
    }

    // Initialize carousels and other jQuery plugins
    this.initCarousels();
    this.initScrollEffects();
  }

  initCarousels() {
    if (typeof $ !== 'undefined') {
      // Header carousel
      $('.header-carousel').owlCarousel({
        autoplay: true,
        smartSpeed: 1500,
        items: 1,
        dots: false,
        loop: true,
        nav: true,
        navText: [
          '<i class="bi bi-chevron-left"></i>',
          '<i class="bi bi-chevron-right"></i>'
        ]
      });

      // Testimonials carousel
      $('.testimonial-carousel').owlCarousel({
        autoplay: true,
        smartSpeed: 1000,
        center: true,
        margin: 24,
        dots: true,
        loop: true,
        nav: false,
        responsive: {
          0: { items: 1 },
          768: { items: 2 },
          992: { items: 3 }
        }
      });
    }
  }

  initScrollEffects() {
    if (typeof $ !== 'undefined') {
      // Sticky Navbar
      $(window).scroll(() => {
        if ($(this).scrollTop() > 300) {
          $('.sticky-top').css('top', '0px');
        } else {
          $('.sticky-top').css('top', '-100px');
        }
      });

      // Back to top button
      $(window).scroll(() => {
        if ($(this).scrollTop() > 300) {
          $('.back-to-top').fadeIn('slow');
        } else {
          $('.back-to-top').fadeOut('slow');
        }
      });

      $('.back-to-top').click(() => {
        $('html, body').animate({ scrollTop: 0 }, 1500, 'easeInOutExpo');
        return false;
      });
    }
  }

  onSearchInput() {
    // This method can be used for any search input handling if needed
  }

  searchCourses() {
    const query = this.searchQuery.trim();
    if (query === '') {
      this.clearSearch();
      return;
    }

    this.isSearching = true;
    this.showSearchResults = true;

    this.authService.getPublicCourses(undefined, query).subscribe({
      next: (response) => {
        this.isSearching = false;
        if (response.success && response.courses) {
          this.searchedCourses = response.courses;
          // Scroll to search results
          setTimeout(() => {
            const searchResultsElement = document.querySelector('.container-xxl.py-5');
            if (searchResultsElement) {
              searchResultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 100);
        } else {
          this.searchedCourses = [];
        }
      },
      error: (error) => {
        this.isSearching = false;
        console.error('Error searching courses:', error);
        this.searchedCourses = [];
      }
    });
  }

  clearSearch() {
    this.searchQuery = '';
    this.searchedCourses = [];
    this.showSearchResults = false;
    this.isSearching = false;
  }

  goToCourse(courseId: string) {
    // If course is free, just go to course detail (authGuard will only require login)
    if (this.isCourseFree(courseId)) {
      this.router.navigate(['/course', courseId]);
      return;
    }

    // Premium course: require login first
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: `/payment/${courseId}` } });
      return;
    }

    // If we already know user has access, go directly
    if (this.courseAccessCache[courseId]) {
      this.router.navigate(['/course', courseId]);
      return;
    }

    // Check from backend if user has active access to this course
    this.authService.hasCourseAccess(courseId).subscribe({
      next: (res) => {
        if (res.success && res.hasAccess) {
          this.courseAccessCache[courseId] = true;
          this.router.navigate(['/course', courseId]);
        } else {
          this.router.navigate(['/payment', courseId]);
        }
      },
      error: () => {
        this.router.navigate(['/payment', courseId]);
      }
    });
  }

  logout() {
    this.authService.logout();
    this.user = null; // Clear user data
    this.router.navigate(['/dashboard']); // Redirect to dashboard after logout
  }

  loadCourseCategories() {
    this.isLoadingCategories = true;
    this.courseCategories = []; // Reset categories
    
    this.authService.getPublicCourseCategories().subscribe({
      next: (response) => {
        this.isLoadingCategories = false;
        if (response.success && response.categories) {
          this.courseCategories = response.categories;
        } else {
          this.courseCategories = [];
        }
      },
      error: (error) => {
        this.isLoadingCategories = false;
        this.courseCategories = [];
      }
    });
  }

  loadMentors() {
    this.isLoadingMentors = true;
    
    this.authService.getPublicMentors().subscribe({
      next: (response) => {
        this.isLoadingMentors = false;
        if (response.success && response.mentors) {
          this.mentors = response.mentors;
        } else {
          this.mentors = [];
        }
      },
      error: (error) => {
        this.isLoadingMentors = false;
        this.mentors = [];
      }
    });
  }

  loadCourses() {
    this.isLoadingCourses = true;
    this.courses = [];

    this.authService.getPublicCourses().subscribe({
      next: (response) => {
        this.isLoadingCourses = false;
        if (response.success && response.courses) {
          this.courses = response.courses;
        } else {
          console.error('Failed to load courses:', response.message);
          this.courses = [];
        }
      },
      error: (error) => {
        this.isLoadingCourses = false;
        console.error('Error loading courses:', error);
        this.courses = [];
      }
    });
  }

  loadPremiumSubscriptions() {
    this.isLoadingPremium = true;
    this.premiumSubscriptions = [];
    this.subscriptionsByCourse = {};

    this.authService.getPublicSubscriptions().subscribe({
      next: (response) => {
        this.isLoadingPremium = false;
        if (response.success && response.subscriptions) {
          this.premiumSubscriptions = response.subscriptions;
          // Build lookup map by courseId
          for (const sub of this.premiumSubscriptions) {
            if (sub.courseId) {
              this.subscriptionsByCourse[sub.courseId] = sub;
            }
          }
        } else {
          this.premiumSubscriptions = [];
        }
      },
      error: (error) => {
        this.isLoadingPremium = false;
        console.error('Error loading premium subscriptions:', error);
        this.premiumSubscriptions = [];
      }
    });
  }

  loadPurchasedCourses() {
    if (!this.authService.isAuthenticated()) {
      this.purchasedCourses = {};
      return;
    }

    this.authService.getMyPurchasedCourses().subscribe({
      next: (res) => {
        if (res.success && res.courses) {
          for (const c of res.courses) {
            if (c.courseId) {
              this.purchasedCourses[c.courseId] = true;
              this.courseAccessCache[c.courseId] = true;
            }
          }
        }
      },
      error: () => {
        this.purchasedCourses = {};
      }
    });
  }

  goToPayment(courseId: string) {
    // If user is not logged in, redirect to login first
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: `/payment/${courseId}` } });
      return;
    }

    this.router.navigate(['/payment', courseId]);
  }

  // Helpers to determine course pricing
  private getSubscriptionForCourse(courseId: string): any | null {
    return this.subscriptionsByCourse[courseId] || null;
  }

  isCourseFree(courseId: string): boolean {
    const sub = this.getSubscriptionForCourse(courseId);
    return !sub || !sub.plan || !sub.price || sub.price === 0;
  }

  getCoursePriceLabel(courseId: string): string {
    const sub = this.getSubscriptionForCourse(courseId);
    if (!sub || !sub.plan || !sub.price || sub.price === 0) {
      return 'Free';
    }
    return `${sub.plan} - ₹${sub.price}`;
  }

  isCoursePurchased(courseId: string): boolean {
    return !!this.purchasedCourses[courseId];
  }

  openMentorDetails(mentorId: string) {
    this.isMentorModalOpen = true;
    this.isLoadingMentorDetails = true;
    this.selectedMentor = null;
    
    this.authService.getPublicMentor(mentorId).subscribe({
      next: (response) => {
        this.isLoadingMentorDetails = false;
        if (response.success && response.mentor) {
          this.selectedMentor = response.mentor;
        } else {
          console.error('Failed to load mentor details:', response.message);
          this.closeMentorModal();
        }
      },
      error: (error) => {
        this.isLoadingMentorDetails = false;
        console.error('Error loading mentor details:', error);
        this.closeMentorModal();
      }
    });
  }

  closeMentorModal() {
    this.isMentorModalOpen = false;
    this.selectedMentor = null;
    this.isLoadingMentorDetails = false;
  }

  navigateToCategoryCourses(categoryId: string) {
    // Require login before showing category-specific course list
    if (!this.authService.isAuthenticated()) {
      const returnUrl = `/courses?categoryId=${categoryId}`;
      this.router.navigate(['/login'], { queryParams: { returnUrl } });
      return;
    }

    this.router.navigate(['/courses'], { queryParams: { categoryId: categoryId } });
  }
}
