import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-course-detail',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './course-detail.component.html',
  styleUrl: './course-detail.component.css'
})
export class CourseDetailComponent implements OnInit {
  course: any = null;
  progress: any = null;
  isLoading = false;
  isProgressLoading = false;
  user: any = null;
  currentVideoIndex = 0;
  quizAnswers: { questionIndex: number; selectedAnswer: number | null }[] = [];
  quizSubmitted = false;
  quizResult: any = null;
  certificate: any = null;
  reviews: any[] = [];
  userReview: { rating: number; comment: string } = { rating: 0, comment: '' };
  isSubmittingReview = false;
  hoveredStar = 0;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      this.user = JSON.parse(userStr);
    }

    this.route.params.subscribe(params => {
      const courseId = params['id'];
      if (courseId) {
        this.loadCourse(courseId);
        if (this.user) {
          this.loadProgress(courseId);
          this.loadReviews(courseId);
        }
      }
    });
  }

  loadCourse(courseId: string) {
    this.isLoading = true;
    this.authService.getPublicCourse(courseId).subscribe({
      next: (response) => {
        if (response.success && response.course) {
          this.course = response.course;
          if (this.course.quiz) {
            this.quizAnswers = this.course.quiz.questions.map((_: any, index: number) => ({
              questionIndex: index,
              selectedAnswer: null
            }));
          }
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading course:', error);
        this.isLoading = false;
      }
    });
  }

  loadProgress(courseId: string) {
    if (!this.authService.isAuthenticated()) {
      return;
    }

    this.isProgressLoading = true;
    this.authService.getCourseProgress(courseId).subscribe({
      next: (response) => {
        if (response.success) {
          this.progress = response.progress;
          if (this.progress && this.progress.certificateEarned && this.progress.certificateId) {
            this.loadCertificate(this.progress.certificateId);
          }
          if (this.progress && this.progress.quizCompleted) {
            this.quizSubmitted = true;
            this.quizResult = {
              score: this.progress.quizScore,
              passed: this.progress.quizScore >= this.course.passingMarks
            };
          }
        }
        this.isProgressLoading = false;
      },
      error: (error) => {
        console.error('Error loading progress:', error);
        this.isProgressLoading = false;
      }
    });
  }

  loadCertificate(certificateId: string) {
    this.authService.getCertificate(certificateId).subscribe({
      next: (response) => {
        if (response.success && response.certificate) {
          this.certificate = response.certificate;
        }
      },
      error: (error) => {
        console.error('Error loading certificate:', error);
      }
    });
  }

  loadReviews(courseId: string) {
    this.authService.getCourseReviews(courseId).subscribe({
      next: (response) => {
        if (response.success && response.reviews) {
          this.reviews = response.reviews;
        }
      },
      error: (error) => {
        console.error('Error loading reviews:', error);
      }
    });
  }

  isVideoCompleted(videoIndex: number): boolean {
    if (!this.progress || !this.progress.completedVideos) {
      return false;
    }
    return this.progress.completedVideos.some((v: any) => v.videoIndex === videoIndex);
  }

  allVideosCompleted(): boolean {
    if (!this.course || !this.course.videos || !this.progress) {
      return false;
    }
    return this.course.videos.length === (this.progress.completedVideos?.length || 0);
  }

  canTakeQuiz(): boolean {
    return this.allVideosCompleted() && !this.quizSubmitted;
  }

  markVideoCompleted(videoIndex: number) {
    if (!this.authService.isAuthenticated()) {
      alert('Please login to track your progress');
      this.router.navigate(['/login']);
      return;
    }

    if (this.isVideoCompleted(videoIndex)) {
      return;
    }

    this.authService.markVideoCompleted(this.course.id, videoIndex).subscribe({
      next: (response) => {
        if (response.success) {
          this.loadProgress(this.course.id);
        }
      },
      error: (error) => {
        console.error('Error marking video as completed:', error);
        alert('Error marking video as completed');
      }
    });
  }

  submitQuiz() {
    if (!this.authService.isAuthenticated()) {
      alert('Please login to take the quiz');
      this.router.navigate(['/login']);
      return;
    }

    // Validate all answers
    const allAnswered = this.quizAnswers.every(answer => answer.selectedAnswer !== null);
    if (!allAnswered) {
      alert('Please answer all questions');
      return;
    }

    this.authService.submitQuiz(this.course.id, this.quizAnswers).subscribe({
      next: (response) => {
        if (response.success) {
          this.quizSubmitted = true;
          this.quizResult = response.result;
          this.loadProgress(this.course.id);
          if (this.quizResult.passed && this.quizResult.certificateId) {
            this.loadCertificate(this.quizResult.certificateId);
          }
        }
      },
      error: (error) => {
        console.error('Error submitting quiz:', error);
        alert(error.error?.message || 'Error submitting quiz');
      }
    });
  }

  downloadCertificate() {
    if (!this.certificate || !this.certificate.pdfData) {
      alert('Certificate not available');
      return;
    }

    try {
      const pdfBlob = this.base64ToBlob(this.certificate.pdfData, 'application/pdf');
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Certificate_${this.certificate.certificateNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading certificate:', error);
      alert('Error downloading certificate');
    }
  }

  base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  setRating(rating: number) {
    if (!this.authService.isAuthenticated()) {
      alert('Please login to submit a review');
      this.router.navigate(['/login']);
      return;
    }

    if (!this.certificate) {
      alert('You must complete the course and earn a certificate before reviewing');
      return;
    }

    this.userReview.rating = rating;
  }

  submitReview() {
    if (!this.authService.isAuthenticated()) {
      alert('Please login to submit a review');
      this.router.navigate(['/login']);
      return;
    }

    if (this.userReview.rating === 0) {
      alert('Please select a rating');
      return;
    }

    this.isSubmittingReview = true;
    this.authService.submitCourseReview(
      this.course.id,
      this.userReview.rating,
      this.userReview.comment
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.userReview = { rating: 0, comment: '' };
          this.loadReviews(this.course.id);
          alert('Review submitted successfully');
        }
        this.isSubmittingReview = false;
      },
      error: (error) => {
        console.error('Error submitting review:', error);
        alert(error.error?.message || 'Error submitting review');
        this.isSubmittingReview = false;
      }
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
