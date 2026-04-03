import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';

declare var $: any;
declare var WOW: any;

@Component({
  selector: 'app-courses',
  imports: [CommonModule, RouterModule],
  templateUrl: './courses.component.html',
  styleUrl: './courses.component.css'
})
export class CoursesComponent implements OnInit, AfterViewInit {
  courses: any[] = [];
  categories: any[] = [];
  isLoading = false;
  user: any = null;
  showCategories = true;
  selectedCategory: any = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    setTimeout(() => {
      const spinner = document.getElementById('spinner');
      if (spinner) {
        spinner.classList.remove('show');
      }
    }, 1);
    
    const userStr = localStorage.getItem('user');
    if (userStr) {
      this.user = JSON.parse(userStr);
    }
    
    // Check for categoryId query parameter
    this.route.queryParams.subscribe(params => {
      const categoryId = params['categoryId'];
      if (categoryId) {
        // Load categories first, then select the category
        this.loadCategoriesAndSelect(categoryId);
      } else {
        // No category specified, just load categories
        this.loadCategories();
      }
    });
  }

  loadCategoriesAndSelect(categoryId: string) {
    this.isLoading = true;
    this.authService.getPublicCourseCategories().subscribe({
      next: (response) => {
        if (response.success && response.categories) {
          this.categories = response.categories;
          // Find and select the category
          const category = this.categories.find(cat => cat.id === categoryId);
          if (category) {
            this.selectCategory(category);
          } else {
            // Category not found, just show categories
            this.isLoading = false;
          }
        } else {
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('Error loading categories:', error);
        this.isLoading = false;
      }
    });
  }

  ngAfterViewInit() {
    if (typeof WOW !== 'undefined') {
      new WOW().init();
    }
    this.initCarousel();
  }

  initCarousel() {
    if (typeof $ !== 'undefined') {
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

  loadCategories() {
    this.isLoading = true;
    this.authService.getPublicCourseCategories().subscribe({
      next: (response) => {
        if (response.success && response.categories) {
          this.categories = response.categories;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading categories:', error);
        this.isLoading = false;
      }
    });
  }

  loadCourses(categoryId?: string) {
    this.isLoading = true;
    this.authService.getPublicCourses(categoryId).subscribe({
      next: (response) => {
        if (response.success && response.courses) {
          this.courses = response.courses;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading courses:', error);
        this.isLoading = false;
      }
    });
  }

  selectCategory(category: any) {
    this.selectedCategory = category;
    this.showCategories = false;
    this.loadCourses(category.id);
  }

  goBackToCategories() {
    this.showCategories = true;
    this.selectedCategory = null;
    this.courses = [];
  }

  goToCourse(courseId: string) {
    this.router.navigate(['/course', courseId]);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
