import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-admin-dashboard',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit {
  user: any = null;
  activeTab: string = 'students';
  isLoading: boolean = false;
  errorMessage: string = '';
  
  // Students from database
  students: any[] = [];
  
  // Mentors from database
  mentors: any[] = [];
  
  // Courses from database
  courses: any[] = [];
  
  // Subscriptions from database
  subscriptions: any[] = [];
  
  books: any[] = [
  ];
  
  contacts: any[] = [];
  
  // Certificates and reviews from database
  certificates: any[] = [];
  reviews: any[] = [];
  // Contact messages
  replyLoading: { [id: string]: boolean } = {};

  // Course Categories
  courseCategories: any[] = [];
  isCategoryFormOpen: boolean = false;
  isEditingCategory: boolean = false;
  editingCategoryId: string | null = null;
  categoryForm = {
    name: '',
    image: ''
  };
  selectedCategoryImage: File | null = null;
  categoryImagePreview: string | null = null;
  successMessage: string = '';

  // Mentor form properties
  isMentorFormOpen: boolean = false;
  isEditingMentor: boolean = false;
  editingMentorId: string | null = null;
  mentorForm = {
    name: '',
    email: '',
    image: '',
    educationHistory: '',
    experience: '',
    githubLink: '',
    linkedinLink: '',
    youtubeLink: '',
    courseSpecialization: ''
  };
  selectedMentorImage: File | null = null;
  mentorImagePreview: string | null = null;

  // Course form properties
  isCourseFormOpen: boolean = false;
  isEditingCourse: boolean = false;
  editingCourseId: string | null = null;
  courseForm = {
    name: '',
    image: '',
    instituteName: '',
    mentorId: '',
    categoryId: '',
    duration: '',
    numberOfSessions: 1,
    videos: [] as any[],
    quizData: {
      questions: [] as any[]
    },
    passingMarks: 70,
    certificateWebsiteName: 'ELearning',
    status: 'Draft',
    subscription: {
      enabled: false,
      plan: '',
      price: 0,
      duration: '',
      description: ''
    }
  };
  selectedCourseImage: File | null = null;
  courseImagePreview: string | null = null;

  // Book form properties
  isBookFormOpen: boolean = false;
  isAddingBook: boolean = false;
  bookForm = {
    title: '',
    author: '',
    description: '',
    category: ''
  };
  selectedBookFile: File | null = null;

  // Subscription form properties
  isSubscriptionFormOpen: boolean = false;
  isEditingSubscription: boolean = false;
  editingSubscriptionId: string | null = null;
  subscriptionForm = {
    courseId: '',
    plan: '',
    price: 0,
    duration: '',
    description: ''
  };

  // Predefined subscription plans (₹)
  subscriptionPlans = [
    { key: '', label: 'Free', price: 0 },
    { key: 'Foundation', label: 'Foundation', price: 999 },
    { key: 'Advance', label: 'Advance', price: 1999 },
    { key: 'Mastery', label: 'Mastery', price: 2999 }
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      this.user = JSON.parse(userStr);
      if (this.user.role !== 'admin') {
        this.router.navigate(['/dashboard']);
      } else {
        this.loadStudents();
        this.loadCourseCategories();
        this.loadMentors();
        this.loadCourses();
      }
    } else {
      this.router.navigate(['/login']);
    }
  }

  loadStudents() {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.authService.getStudents().subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.students) {
          this.students = response.students;
        } else {
          this.errorMessage = response.message || 'Failed to load students';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Error loading students';
        console.error('Load students error:', error);
      }
    });
  }

  deleteStudent(studentId: string) {
    if (confirm('Are you sure you want to delete this student?')) {
      this.isLoading = true;
      this.errorMessage = '';
      
      this.authService.deleteStudent(studentId).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success) {
            // Remove student from list
            this.students = this.students.filter(s => s.id !== studentId);
            alert('Student deleted successfully');
          } else {
            this.errorMessage = response.message || 'Failed to delete student';
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.error?.message || 'Error deleting student';
          console.error('Delete student error:', error);
        }
      });
    }
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
    if (tab === 'course-categories') {
      this.loadCourseCategories();
    } else if (tab === 'mentors') {
      this.loadMentors();
    } else if (tab === 'courses') {
      this.loadCourses();
    } else if (tab === 'certificates') {
      this.loadCertificates();
    } else if (tab === 'feedback') {
      this.loadReviews();
    } else if (tab === 'contacts') {
      this.loadContacts();
    } else if (tab === 'books') {
      this.loadBooks();
    } else if (tab === 'subscriptions') {
      this.loadSubscriptions();
    }
  }

  getTotalActiveSubscriptions(): number {
    return this.subscriptions.reduce((total, sub) => total + (sub.activeUsers || 0), 0);
  }

  getAverageRating(): number {
    if (this.reviews.length === 0) return 0;
    const total = this.reviews.reduce((sum, f) => sum + f.rating, 0);
    return Number((total / this.reviews.length).toFixed(1));
  }

  // Load certificates
  loadCertificates() {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.authService.getCertificates().subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.certificates) {
          this.certificates = response.certificates;
        } else {
          this.errorMessage = response.message || 'Failed to load certificates';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Error loading certificates';
        console.error('Load certificates error:', error);
      }
    });
  }

  // Load reviews/feedback
  loadReviews() {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.authService.getReviews().subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.reviews) {
          this.reviews = response.reviews;
        } else {
          this.errorMessage = response.message || 'Failed to load reviews';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Error loading reviews';
        console.error('Load reviews error:', error);
      }
    });
  }

  // Load contact messages
  loadContacts() {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.getAllContacts().subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.contacts) {
          this.contacts = response.contacts;
        } else {
          this.errorMessage = response.message || 'Failed to load contact messages';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Error loading contact messages';
        console.error('Load contacts error:', error);
      }
    });
  }

  respondToContact(contact: any) {
    const reply = window.prompt(`Reply to ${contact.name} (${contact.email})`, contact.adminReply || '');
    if (!reply || reply.trim() === '') {
      return;
    }
    this.replyLoading[contact.id] = true;
    this.authService.replyToContact(contact.id, reply.trim(), 'Answered').subscribe({
      next: (response) => {
        this.replyLoading[contact.id] = false;
        if (response.success && response.contact) {
          const updated = response.contact;
          const index = this.contacts.findIndex((c: any) => c.id === contact.id);
          if (index !== -1) {
            this.contacts[index] = {
              ...this.contacts[index],
              adminReply: updated.adminReply,
              status: updated.status,
              repliedAt: updated.repliedAt
            };
          }
          alert(response.message || 'Reply sent successfully');
        } else {
          alert(response.message || 'Failed to send reply');
        }
      },
      error: (error) => {
        this.replyLoading[contact.id] = false;
        console.error('Reply contact error:', error);
        alert(error.error?.message || 'Error sending reply');
      }
    });
  }

  // Format date
  formatDate(date: string | Date): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // Course Categories Methods
  loadCourseCategories() {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.authService.getCourseCategories().subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.categories) {
          this.courseCategories = response.categories;
        } else {
          this.errorMessage = response.message || 'Failed to load course categories';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Error loading course categories';
        console.error('Load course categories error:', error);
      }
    });
  }

  openCategoryForm(category?: any) {
    if (category) {
      this.isEditingCategory = true;
      this.editingCategoryId = category.id;
      this.categoryForm = {
        name: category.name,
        image: category.image || ''
      };
      this.categoryImagePreview = category.image || null;
    } else {
      this.isEditingCategory = false;
      this.editingCategoryId = null;
      this.categoryForm = {
        name: '',
        image: ''
      };
      this.categoryImagePreview = null;
    }
    this.selectedCategoryImage = null;
    this.isCategoryFormOpen = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeCategoryForm() {
    this.isCategoryFormOpen = false;
    this.isEditingCategory = false;
    this.editingCategoryId = null;
    this.categoryForm = {
      name: '',
      image: ''
    };
    this.selectedCategoryImage = null;
    this.categoryImagePreview = null;
    this.errorMessage = '';
    this.successMessage = '';
  }

  onCategoryImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      // Validate file type
      if (!file.type.match(/image\/(jpeg|jpg|png|gif|webp)/)) {
        this.errorMessage = 'Please select a valid image file (JPEG, PNG, GIF, or WEBP)';
        return;
      }
      
      // Validate file size (max 15MB)
      if (file.size > 15 * 1024 * 1024) {
        this.errorMessage = 'PDF size should be less than 15MB';
        return;
      }
      
      this.selectedCategoryImage = file;
      this.errorMessage = '';
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.categoryImagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  async convertImageToBase64(file: File): Promise<string> {
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

  async saveCategory() {
    if (!this.categoryForm.name || this.categoryForm.name.trim() === '') {
      this.errorMessage = 'Category name is required';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      let imageData = this.categoryForm.image;
      
      // Convert selected image to base64 if a new image was selected
      if (this.selectedCategoryImage) {
        imageData = await this.convertImageToBase64(this.selectedCategoryImage);
      }

      const categoryData = {
        name: this.categoryForm.name.trim(),
        image: imageData
      };

      if (this.isEditingCategory && this.editingCategoryId) {
        // Update existing category
        this.authService.updateCourseCategory(this.editingCategoryId, categoryData).subscribe({
          next: (response) => {
            this.isLoading = false;
            if (response.success) {
              this.successMessage = response.message || 'Category updated successfully!';
              this.loadCourseCategories();
              setTimeout(() => {
                this.closeCategoryForm();
              }, 1500);
            } else {
              this.errorMessage = response.message || 'Failed to update category';
            }
          },
          error: (error) => {
            this.isLoading = false;
            this.errorMessage = error.error?.message || 'Error updating category';
            console.error('Update category error:', error);
          }
        });
      } else {
        // Create new category
        this.authService.createCourseCategory(categoryData).subscribe({
          next: (response) => {
            this.isLoading = false;
            if (response.success) {
              this.successMessage = response.message || 'Category created successfully!';
              this.loadCourseCategories();
              setTimeout(() => {
                this.closeCategoryForm();
              }, 1500);
            } else {
              this.errorMessage = response.message || 'Failed to create category';
            }
          },
          error: (error) => {
            this.isLoading = false;
            this.errorMessage = error.error?.message || 'Error creating category';
            console.error('Create category error:', error);
          }
        });
      }
    } catch (error) {
      this.isLoading = false;
      this.errorMessage = 'Error processing image. Please try again.';
      console.error('Image conversion error:', error);
    }
  }

  deleteCategory(categoryId: string) {
    if (confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      this.isLoading = true;
      this.errorMessage = '';
      
      this.authService.deleteCourseCategory(categoryId).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success) {
            this.successMessage = response.message || 'Category deleted successfully!';
            this.loadCourseCategories();
            setTimeout(() => {
              this.successMessage = '';
            }, 3000);
          } else {
            this.errorMessage = response.message || 'Failed to delete category';
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.error?.message || 'Error deleting category';
          console.error('Delete category error:', error);
        }
      });
    }
  }

  // Mentor Methods
  loadMentors() {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.authService.getMentors().subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.mentors) {
          this.mentors = response.mentors;
        } else {
          this.errorMessage = response.message || 'Failed to load mentors';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Error loading mentors';
        console.error('Load mentors error:', error);
      }
    });
  }

  openMentorForm(mentor?: any) {
    if (mentor) {
      this.isEditingMentor = true;
      this.editingMentorId = mentor.id;
      this.mentorForm = {
        name: mentor.name || '',
        email: mentor.email || '',
        image: mentor.image || '',
        educationHistory: mentor.educationHistory || '',
        experience: mentor.experience || '',
        githubLink: mentor.githubLink || '',
        linkedinLink: mentor.linkedinLink || '',
        youtubeLink: mentor.youtubeLink || '',
        courseSpecialization: mentor.courseSpecialization || ''
      };
      this.mentorImagePreview = mentor.image || null;
    } else {
      this.isEditingMentor = false;
      this.editingMentorId = null;
      this.mentorForm = {
        name: '',
        email: '',
        image: '',
        educationHistory: '',
        experience: '',
        githubLink: '',
        linkedinLink: '',
        youtubeLink: '',
        courseSpecialization: ''
      };
      this.mentorImagePreview = null;
    }
    this.selectedMentorImage = null;
    this.isMentorFormOpen = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeMentorForm() {
    this.isMentorFormOpen = false;
    this.isEditingMentor = false;
    this.editingMentorId = null;
    this.mentorForm = {
      name: '',
      email: '',
      image: '',
      educationHistory: '',
      experience: '',
      githubLink: '',
      linkedinLink: '',
      youtubeLink: '',
      courseSpecialization: ''
    };
    this.selectedMentorImage = null;
    this.mentorImagePreview = null;
    this.errorMessage = '';
    this.successMessage = '';
  }

  onMentorImageSelected(event: Event) {
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
      
      this.selectedMentorImage = file;
      this.errorMessage = '';
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.mentorImagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  async saveMentor() {
    if (!this.mentorForm.name || this.mentorForm.name.trim() === '') {
      this.errorMessage = 'Mentor name is required';
      return;
    }

    if (!this.mentorForm.email || this.mentorForm.email.trim() === '') {
      this.errorMessage = 'Email address is required';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      let imageData = this.mentorForm.image;
      
      // Convert selected image to base64 if a new image was selected
      if (this.selectedMentorImage) {
        imageData = await this.convertImageToBase64(this.selectedMentorImage);
      }

      const mentorData = {
        name: this.mentorForm.name.trim(),
        email: this.mentorForm.email.trim(),
        image: imageData,
        educationHistory: this.mentorForm.educationHistory.trim(),
        experience: this.mentorForm.experience.trim(),
        githubLink: this.mentorForm.githubLink.trim(),
        linkedinLink: this.mentorForm.linkedinLink.trim(),
        youtubeLink: this.mentorForm.youtubeLink.trim(),
        courseSpecialization: this.mentorForm.courseSpecialization.trim()
      };

      if (this.isEditingMentor && this.editingMentorId) {
        // Update existing mentor
        this.authService.updateMentor(this.editingMentorId, mentorData).subscribe({
          next: (response) => {
            this.isLoading = false;
            if (response.success) {
              this.successMessage = response.message || 'Mentor updated successfully!';
              this.loadMentors();
              setTimeout(() => {
                this.closeMentorForm();
              }, 1500);
            } else {
              this.errorMessage = response.message || 'Failed to update mentor';
            }
          },
          error: (error) => {
            this.isLoading = false;
            this.errorMessage = error.error?.message || 'Error updating mentor';
            console.error('Update mentor error:', error);
          }
        });
      } else {
        // Create new mentor
        this.authService.createMentor(mentorData).subscribe({
          next: (response) => {
            this.isLoading = false;
            if (response.success) {
              this.successMessage = response.message || 'Mentor created successfully!';
              this.loadMentors();
              setTimeout(() => {
                this.closeMentorForm();
              }, 1500);
            } else {
              this.errorMessage = response.message || 'Failed to create mentor';
            }
          },
          error: (error) => {
            this.isLoading = false;
            this.errorMessage = error.error?.message || 'Error creating mentor';
            console.error('Create mentor error:', error);
          }
        });
      }
    } catch (error) {
      this.isLoading = false;
      this.errorMessage = 'Error processing image. Please try again.';
      console.error('Image conversion error:', error);
    }
  }

  deleteMentor(mentorId: string) {
    if (confirm('Are you sure you want to delete this mentor? This action cannot be undone.')) {
      this.isLoading = true;
      this.errorMessage = '';
      
      this.authService.deleteMentor(mentorId).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success) {
            this.successMessage = response.message || 'Mentor deleted successfully!';
            this.loadMentors();
            setTimeout(() => {
              this.successMessage = '';
            }, 3000);
          } else {
            this.errorMessage = response.message || 'Failed to delete mentor';
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.error?.message || 'Error deleting mentor';
          console.error('Delete mentor error:', error);
        }
      });
    }
  }

  // Course Methods
  loadCourses() {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.authService.getCourses().subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.courses) {
          this.courses = response.courses;
        } else {
          this.errorMessage = response.message || 'Failed to load courses';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Error loading courses';
        console.error('Load courses error:', error);
      }
    });
  }

  openCourseForm(course?: any) {
    // Ensure categories and mentors are loaded
    if (this.courseCategories.length === 0) {
      this.loadCourseCategories();
    }
    if (this.mentors.length === 0) {
      this.loadMentors();
    }

    if (course) {
      this.isEditingCourse = true;
      this.editingCourseId = course.id;
      this.authService.getCourse(course.id).subscribe({
        next: (response) => {
          if (response.success && response.course) {
            const c = response.course;
            this.courseForm = {
              name: c.name || '',
              image: c.image || '',
              instituteName: c.instituteName || '',
              mentorId: c.mentorId || '',
              categoryId: c.categoryId || '',
              duration: c.duration || '',
              numberOfSessions: c.numberOfSessions || 1,
              videos: c.videos || [],
              quizData: {
                questions: c.quiz?.questions || []
              },
              passingMarks: c.passingMarks || 70,
              certificateWebsiteName: c.certificateWebsiteName || 'ELearning',
              status: c.status || 'Draft',
              subscription: {
                enabled: false,
                plan: '',
                price: 0,
                duration: '',
                description: ''
              }
            };
            this.courseImagePreview = c.image || null;
            this.updateVideoFields();
          }
        }
      });
    } else {
      this.isEditingCourse = false;
      this.editingCourseId = null;
      this.courseForm = {
        name: '',
        image: '',
        instituteName: '',
        mentorId: '',
        categoryId: '',
        duration: '',
        numberOfSessions: 1,
        videos: [],
        quizData: {
          questions: []
        },
        passingMarks: 70,
        certificateWebsiteName: 'ELearning',
        status: 'Draft',
        subscription: {
          enabled: false,
          plan: '',
          price: 0,
          duration: '',
          description: ''
        }
      };
      this.courseImagePreview = null;
      this.updateVideoFields();
    }
    this.selectedCourseImage = null;
    this.isCourseFormOpen = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeCourseForm() {
    this.isCourseFormOpen = false;
    this.isEditingCourse = false;
    this.editingCourseId = null;
    this.courseForm = {
      name: '',
      image: '',
      instituteName: '',
      mentorId: '',
      categoryId: '',
      duration: '',
      numberOfSessions: 1,
      videos: [],
      quizData: {
        questions: []
      },
      passingMarks: 70,
      certificateWebsiteName: 'ELearning',
      status: 'Draft',
      subscription: {
        enabled: false,
        plan: '',
        price: 0,
        duration: '',
        description: ''
      }
    };
    this.selectedCourseImage = null;
    this.courseImagePreview = null;
    this.errorMessage = '';
    this.successMessage = '';
  }

  onCourseImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      if (!file.type.match(/image\/(jpeg|jpg|png|gif|webp)/)) {
        this.errorMessage = 'Please select a valid image file (JPEG, PNG, GIF, or WEBP)';
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage = 'Image size should be less than 5MB';
        return;
      }
      
      this.selectedCourseImage = file;
      this.errorMessage = '';
      
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.courseImagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  updateVideoFields() {
    const currentVideos = this.courseForm.videos || [];
    const numberOfSessions = this.courseForm.numberOfSessions || 1;
    
    // Adjust videos array to match numberOfSessions
    if (currentVideos.length < numberOfSessions) {
      // Add empty video objects
      for (let i = currentVideos.length; i < numberOfSessions; i++) {
        currentVideos.push({
          title: '',
          duration: '',
          videoUrl: ''
        });
      }
    } else if (currentVideos.length > numberOfSessions) {
      // Remove extra videos
      this.courseForm.videos = currentVideos.slice(0, numberOfSessions);
    }
  }

  addQuizQuestion() {
    this.courseForm.quizData.questions.push({
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      points: 1
    });
  }

  removeQuizQuestion(index: number) {
    this.courseForm.quizData.questions.splice(index, 1);
  }

  async saveCourse() {
    if (!this.courseForm.name || !this.courseForm.instituteName || !this.courseForm.mentorId || 
        !this.courseForm.categoryId || !this.courseForm.duration || !this.courseForm.numberOfSessions) {
      this.errorMessage = 'Please fill in all required fields';
      return;
    }

    // Validate videos
    if (this.courseForm.videos.length !== this.courseForm.numberOfSessions) {
      this.errorMessage = 'Number of videos must match number of sessions';
      return;
    }

    for (let i = 0; i < this.courseForm.videos.length; i++) {
      if (!this.courseForm.videos[i].title || !this.courseForm.videos[i].duration) {
        this.errorMessage = `Please fill in title and duration for video ${i + 1}`;
        return;
      }
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      let imageData = this.courseForm.image;
      
      if (this.selectedCourseImage) {
        imageData = await this.convertImageToBase64(this.selectedCourseImage);
      }

      const courseData = {
        name: this.courseForm.name.trim(),
        image: imageData,
        instituteName: this.courseForm.instituteName.trim(),
        mentorId: this.courseForm.mentorId,
        categoryId: this.courseForm.categoryId,
        duration: Number(this.courseForm.duration),
        numberOfSessions: Number(this.courseForm.numberOfSessions),
        videos: this.courseForm.videos.map(v => ({
          title: v.title.trim(),
          duration: Number(v.duration),
          videoUrl: v.videoUrl || ''
        })),
        quizData: this.courseForm.quizData.questions.length > 0 ? {
          questions: this.courseForm.quizData.questions.map(q => ({
            question: q.question.trim(),
            options: q.options.map((opt: string) => opt.trim()),
            correctAnswer: Number(q.correctAnswer),
            points: Number(q.points) || 1
          }))
        } : null,
        subscriptionData: this.courseForm.subscription.enabled
          ? {
              plan: this.courseForm.subscription.plan || '',
              price: Number(this.courseForm.subscription.price) || 0,
              duration: this.courseForm.subscription.duration.trim() || '',
              description: this.courseForm.subscription.description.trim() || ''
            }
          : null,
        passingMarks: Number(this.courseForm.passingMarks),
        certificateWebsiteName: this.courseForm.certificateWebsiteName.trim(),
        status: this.courseForm.status
      };

      if (this.isEditingCourse && this.editingCourseId) {
        this.authService.updateCourse(this.editingCourseId, courseData).subscribe({
          next: (response) => {
            this.isLoading = false;
            if (response.success) {
              this.successMessage = response.message || 'Course updated successfully!';
              this.loadCourses();
              setTimeout(() => {
                this.closeCourseForm();
              }, 1500);
            } else {
              this.errorMessage = response.message || 'Failed to update course';
            }
          },
          error: (error) => {
            this.isLoading = false;
            this.errorMessage = error.error?.message || 'Error updating course';
            console.error('Update course error:', error);
          }
        });
      } else {
        this.authService.createCourse(courseData).subscribe({
          next: (response) => {
            this.isLoading = false;
            if (response.success) {
              this.successMessage = response.message || 'Course created successfully!';
              this.loadCourses();
              this.loadCourseCategories(); // Refresh categories to update course count
              setTimeout(() => {
                this.closeCourseForm();
              }, 1500);
            } else {
              this.errorMessage = response.message || 'Failed to create course';
            }
          },
          error: (error) => {
            this.isLoading = false;
            this.errorMessage = error.error?.message || 'Error creating course';
            console.error('Create course error:', error);
          }
        });
      }
    } catch (error) {
      this.isLoading = false;
      this.errorMessage = 'Error processing image. Please try again.';
      console.error('Image conversion error:', error);
    }
  }

  deleteCourse(courseId: string) {
    if (confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      this.isLoading = true;
      this.errorMessage = '';
      
      this.authService.deleteCourse(courseId).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success) {
            this.successMessage = response.message || 'Course deleted successfully!';
            this.loadCourses();
            this.loadCourseCategories(); // Refresh categories to update course count
            setTimeout(() => {
              this.successMessage = '';
            }, 3000);
          } else {
            this.errorMessage = response.message || 'Failed to delete course';
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.error?.message || 'Error deleting course';
          console.error('Delete course error:', error);
        }
      });
    }
  }

  // Book methods
  loadBooks() {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.getAdminBooks().subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.books) {
          this.books = response.books;
        } else {
          this.errorMessage = response.message || 'Failed to load books';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Error loading books';
        console.error('Load books error:', error);
      }
    });
  }

  openBookForm() {
    this.isBookFormOpen = true;
    this.isAddingBook = false;
    this.bookForm = {
      title: '',
      author: '',
      description: '',
      category: ''
    };
    this.selectedBookFile = null;
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeBookForm() {
    this.isBookFormOpen = false;
    this.isAddingBook = false;
    this.bookForm = {
      title: '',
      author: '',
      description: '',
      category: ''
    };
    this.selectedBookFile = null;
  }

  onBookFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      if (file.type !== 'application/pdf') {
        this.errorMessage = 'Please select a valid PDF file';
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        this.errorMessage = 'PDF size should be less than 10MB';
        return;
      }

      this.selectedBookFile = file;
      this.errorMessage = '';
    }
  }

  async saveBook() {
    if (!this.bookForm.title.trim() || !this.bookForm.author.trim()) {
      this.errorMessage = 'Title and author are required';
      return;
    }
    if (!this.selectedBookFile) {
      this.errorMessage = 'Please select a PDF file';
      return;
    }

    this.isLoading = true;
    this.isAddingBook = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const pdfBase64 = await this.convertFileToBase64(this.selectedBookFile);

      const payload = {
        title: this.bookForm.title.trim(),
        author: this.bookForm.author.trim(),
        description: this.bookForm.description.trim(),
        category: this.bookForm.category.trim(),
        pdfData: pdfBase64,
        pdfMimeType: this.selectedBookFile.type
      };

      this.authService.createBook(payload).subscribe({
        next: (response) => {
          this.isLoading = false;
          this.isAddingBook = false;
          if (response.success) {
            this.successMessage = response.message || 'Book added successfully';
            this.loadBooks();
            setTimeout(() => {
              this.closeBookForm();
            }, 1500);
          } else {
            this.errorMessage = response.message || 'Failed to add book';
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.isAddingBook = false;
          this.errorMessage = error.error?.message || 'Error adding book';
          console.error('Create book error:', error);
        }
      });
    } catch (error) {
      this.isLoading = false;
      this.isAddingBook = false;
      this.errorMessage = 'Error reading PDF file. Please try again.';
      console.error('PDF conversion error:', error);
    }
  }

  async convertFileToBase64(file: File): Promise<string> {
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

  deleteBook(bookId: string) {
    if (!bookId) return;
    if (!confirm('Are you sure you want to delete this book? This action cannot be undone.')) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.deleteBook(bookId).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.successMessage = response.message || 'Book deleted successfully';
          this.loadBooks();
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        } else {
          this.errorMessage = response.message || 'Failed to delete book';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Error deleting book';
        console.error('Delete book error:', error);
      }
    });
  }

  // Subscription methods
  loadSubscriptions() {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.getSubscriptions().subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.subscriptions) {
          this.subscriptions = response.subscriptions;
        } else {
          this.errorMessage = response.message || 'Failed to load subscriptions';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Error loading subscriptions';
        console.error('Load subscriptions error:', error);
      }
    });
  }

  openSubscriptionForm(sub?: any) {
    if (sub) {
      this.isEditingSubscription = true;
      this.editingSubscriptionId = sub.id;
      this.subscriptionForm = {
        courseId: sub.courseId || '',
        plan: sub.plan || '',
        price: sub.price || 0,
        duration: sub.duration || '',
        description: sub.description || ''
      };
    } else {
      this.isEditingSubscription = false;
      this.editingSubscriptionId = null;
      this.subscriptionForm = {
        courseId: '',
        plan: '',
        price: 0,
        duration: '',
        description: ''
      };
    }
    this.isSubscriptionFormOpen = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeSubscriptionForm() {
    this.isSubscriptionFormOpen = false;
    this.isEditingSubscription = false;
    this.editingSubscriptionId = null;
    this.subscriptionForm = {
      courseId: '',
      plan: '',
      price: 0,
      duration: '',
      description: ''
    };
  }

  saveSubscription() {
    if (!this.subscriptionForm.courseId || !this.subscriptionForm.plan.trim() || !this.subscriptionForm.duration.trim()) {
      this.errorMessage = 'Course, plan and duration are required';
      return;
    }
    if (this.subscriptionForm.price < 0) {
      this.errorMessage = 'Price cannot be negative';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = {
      courseId: this.subscriptionForm.courseId,
      plan: this.subscriptionForm.plan.trim(),
      price: Number(this.subscriptionForm.price),
      duration: this.subscriptionForm.duration.trim(),
      description: this.subscriptionForm.description.trim()
    };

    if (this.isEditingSubscription && this.editingSubscriptionId) {
      this.authService.updateSubscription(this.editingSubscriptionId, payload).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success) {
            this.successMessage = response.message || 'Subscription updated successfully';
            this.loadSubscriptions();
            setTimeout(() => this.closeSubscriptionForm(), 1500);
          } else {
            this.errorMessage = response.message || 'Failed to update subscription';
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.error?.message || 'Error updating subscription';
          console.error('Update subscription error:', error);
        }
      });
    } else {
      this.authService.createSubscription(payload).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success) {
            this.successMessage = response.message || 'Subscription created successfully';
            this.loadSubscriptions();
            setTimeout(() => this.closeSubscriptionForm(), 1500);
          } else {
            this.errorMessage = response.message || 'Failed to create subscription';
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.error?.message || 'Error creating subscription';
          console.error('Create subscription error:', error);
        }
      });
    }
  }

  deleteSubscription(subId: string) {
    if (!subId) return;
    if (!confirm('Are you sure you want to delete this subscription? This action cannot be undone.')) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.deleteSubscription(subId).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.successMessage = response.message || 'Subscription deleted successfully';
          this.loadSubscriptions();
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        } else {
          this.errorMessage = response.message || 'Failed to delete subscription';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Error deleting subscription';
        console.error('Delete subscription error:', error);
      }
    });
  }

  // Update course subscription price when plan changes
  onCourseSubscriptionPlanChange() {
    const planKey = this.courseForm.subscription.plan;
    const found = this.subscriptionPlans.find(p => p.key === planKey);
    this.courseForm.subscription.price = found ? found.price : 0;
  }
}
