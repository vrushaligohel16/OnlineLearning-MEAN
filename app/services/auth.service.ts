import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: any;
}

export interface Profile {
  id?: string;
  userId?: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  bio?: string;
  image?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProfileResponse {
  success: boolean;
  message?: string;
  profile?: Profile;
}

export interface CourseCategory {
  id?: string;
  name: string;
  image?: string;
  numberOfCourses?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CourseCategoryResponse {
  success: boolean;
  message?: string;
  category?: CourseCategory;
  categories?: CourseCategory[];
  total?: number;
}

export interface Mentor {
  id?: string;
  name: string;
  email: string;
  image?: string;
  educationHistory?: string;
  experience?: string;
  githubLink?: string;
  linkedinLink?: string;
  youtubeLink?: string;
  courseSpecialization?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MentorResponse {
  success: boolean;
  message?: string;
  mentor?: Mentor;
  mentors?: Mentor[];
  total?: number;
}

export interface Book {
  id?: string;
  title: string;
  author: string;
  description?: string;
  category?: string;
  pdfData?: string;
  pdfMimeType?: string;
  createdAt?: string;
}

export interface BookResponse {
  success: boolean;
  message?: string;
  book?: Book;
  books?: Book[];
  total?: number;
}

export interface SubscriptionPlan {
  id?: string;
  courseId: string;
  courseName?: string;
  instituteName?: string;
  plan: string;
  price: number;
  duration: string;
  activeUsers?: number;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubscriptionResponse {
  success: boolean;
  message?: string;
  subscription?: SubscriptionPlan;
  subscriptions?: SubscriptionPlan[];
  total?: number;
}

export interface PurchasedCourse {
  invoiceId: string;
  invoiceNumber: string;
  courseId: string;
  courseName: string;
  courseImage?: string;
  instituteName?: string;
  validUntil?: string;
  plan: string;
  amount: number;
  paymentMethod?: string | null;
}

export interface ContactMessage {
  id?: string;
  userId?: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status?: string;
  adminReply?: string;
  createdAt?: string;
  repliedAt?: string;
}

export interface ContactResponse {
  success: boolean;
  message?: string;
  contact?: ContactMessage;
  contacts?: ContactMessage[];
  total?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials);
  }

  register(userData: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, userData);
  }

  getToken(): string | null {
    // Guard for SSR / non-browser environments
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return null;
    }
    return localStorage.getItem('token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  // Profile methods
  getProfile(): Observable<ProfileResponse> {
    const token = this.getToken();
    return this.http.get<ProfileResponse>(`${this.apiUrl}/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  updateProfile(profileData: Profile): Observable<ProfileResponse> {
    const token = this.getToken();
    return this.http.put<ProfileResponse>(`${this.apiUrl}/profile`, profileData, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  // Admin methods
  getStudents(): Observable<any> {
    const token = this.getToken();
    return this.http.get<any>(`${this.apiUrl}/admin/students`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  deleteStudent(studentId: string): Observable<any> {
    const token = this.getToken();
    return this.http.delete<any>(`${this.apiUrl}/admin/students/${studentId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  // Course Category methods
  getCourseCategories(): Observable<CourseCategoryResponse> {
    const token = this.getToken();
    return this.http.get<CourseCategoryResponse>(`${this.apiUrl}/admin/course-categories`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  getCourseCategory(id: string): Observable<CourseCategoryResponse> {
    const token = this.getToken();
    return this.http.get<CourseCategoryResponse>(`${this.apiUrl}/admin/course-categories/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  createCourseCategory(categoryData: { name: string; image?: string }): Observable<CourseCategoryResponse> {
    const token = this.getToken();
    return this.http.post<CourseCategoryResponse>(`${this.apiUrl}/admin/course-categories`, categoryData, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  updateCourseCategory(id: string, categoryData: { name?: string; image?: string }): Observable<CourseCategoryResponse> {
    const token = this.getToken();
    return this.http.put<CourseCategoryResponse>(`${this.apiUrl}/admin/course-categories/${id}`, categoryData, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  deleteCourseCategory(id: string): Observable<any> {
    const token = this.getToken();
    return this.http.delete<any>(`${this.apiUrl}/admin/course-categories/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  // Course methods
  getCourses(): Observable<any> {
    const token = this.getToken();
    return this.http.get<any>(`${this.apiUrl}/admin/courses`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  getCourse(id: string): Observable<any> {
    const token = this.getToken();
    return this.http.get<any>(`${this.apiUrl}/admin/courses/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  createCourse(courseData: any): Observable<any> {
    const token = this.getToken();
    return this.http.post<any>(`${this.apiUrl}/admin/courses`, courseData, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  updateCourse(id: string, courseData: any): Observable<any> {
    const token = this.getToken();
    return this.http.put<any>(`${this.apiUrl}/admin/courses/${id}`, courseData, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  deleteCourse(id: string): Observable<any> {
    const token = this.getToken();
    return this.http.delete<any>(`${this.apiUrl}/admin/courses/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  // Public course categories (no authentication required)
  getPublicCourseCategories(): Observable<CourseCategoryResponse> {
    return this.http.get<CourseCategoryResponse>(`${this.apiUrl}/course-categories`);
  }

  // Public mentors (no authentication required)
  getPublicMentors(): Observable<MentorResponse> {
    return this.http.get<MentorResponse>(`${this.apiUrl}/mentors`);
  }

  getPublicMentor(id: string): Observable<MentorResponse> {
    return this.http.get<MentorResponse>(`${this.apiUrl}/mentors/${id}`);
  }

  // Mentor methods
  getMentors(): Observable<MentorResponse> {
    const token = this.getToken();
    return this.http.get<MentorResponse>(`${this.apiUrl}/admin/mentors`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  getMentor(id: string): Observable<MentorResponse> {
    const token = this.getToken();
    return this.http.get<MentorResponse>(`${this.apiUrl}/admin/mentors/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  createMentor(mentorData: Mentor): Observable<MentorResponse> {
    const token = this.getToken();
    return this.http.post<MentorResponse>(`${this.apiUrl}/admin/mentors`, mentorData, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  updateMentor(id: string, mentorData: Mentor): Observable<MentorResponse> {
    const token = this.getToken();
    return this.http.put<MentorResponse>(`${this.apiUrl}/admin/mentors/${id}`, mentorData, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  deleteMentor(id: string): Observable<any> {
    const token = this.getToken();
    return this.http.delete<any>(`${this.apiUrl}/admin/mentors/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  // Public course methods (no authentication required)
  getPublicCourses(categoryId?: string, search?: string): Observable<any> {
    let url = `${this.apiUrl}/courses?`;
    const params: string[] = [];
    if (categoryId) {
      params.push(`categoryId=${categoryId}`);
    }
    if (search && search.trim() !== '') {
      params.push(`search=${encodeURIComponent(search.trim())}`);
    }
    if (params.length > 0) {
      url += params.join('&');
    } else {
      url = `${this.apiUrl}/courses`;
    }
    return this.http.get<any>(url);
  }

  getPublicCourse(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/courses/${id}`);
  }

  // User course progress methods (authentication required)
  getCourseProgress(courseId: string): Observable<any> {
    const token = this.getToken();
    return this.http.get<any>(`${this.apiUrl}/course/progress/${courseId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  markVideoCompleted(courseId: string, videoIndex: number): Observable<any> {
    const token = this.getToken();
    return this.http.post<any>(`${this.apiUrl}/course/progress/${courseId}/video`, {
      videoIndex: videoIndex
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  submitQuiz(courseId: string, answers: any[]): Observable<any> {
    const token = this.getToken();
    return this.http.post<any>(`${this.apiUrl}/course/progress/${courseId}/quiz`, {
      answers: answers
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  getCertificate(certificateId: string): Observable<any> {
    const token = this.getToken();
    return this.http.get<any>(`${this.apiUrl}/course/certificate/${certificateId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  submitCourseReview(courseId: string, rating: number, comment: string): Observable<any> {
    const token = this.getToken();
    return this.http.post<any>(`${this.apiUrl}/course/review/${courseId}`, {
      rating: rating,
      comment: comment
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  getCourseReviews(courseId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/course/review/${courseId}`);
  }

  // Get user's completed courses and certificates
  getCompletedCourses(): Observable<any> {
    const token = this.getToken();
    return this.http.get<any>(`${this.apiUrl}/profile/completed-courses`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  // Admin methods for certificates and reviews
  getCertificates(): Observable<any> {
    const token = this.getToken();
    return this.http.get<any>(`${this.apiUrl}/admin/certificates`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  getReviews(): Observable<any> {
    const token = this.getToken();
    return this.http.get<any>(`${this.apiUrl}/admin/reviews`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  // Admin book methods
  getAdminBooks(): Observable<BookResponse> {
    const token = this.getToken();
    return this.http.get<BookResponse>(`${this.apiUrl}/book/admin/books`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  createBook(bookData: { title: string; author: string; description?: string; category?: string; pdfData: string; pdfMimeType?: string }): Observable<BookResponse> {
    const token = this.getToken();
    return this.http.post<BookResponse>(`${this.apiUrl}/book/admin/books`, bookData, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  deleteBook(id: string): Observable<any> {
    const token = this.getToken();
    return this.http.delete<any>(`${this.apiUrl}/book/admin/books/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  // Public book methods
  getPublicBooks(): Observable<BookResponse> {
    return this.http.get<BookResponse>(`${this.apiUrl}/book/books`);
  }

  getPublicBook(id: string): Observable<BookResponse> {
    return this.http.get<BookResponse>(`${this.apiUrl}/book/books/${id}`);
  }

  // Admin subscription methods
  getSubscriptions(): Observable<SubscriptionResponse> {
    const token = this.getToken();
    return this.http.get<SubscriptionResponse>(`${this.apiUrl}/admin/subscriptions`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  createSubscription(subData: { courseId: string; plan: string; price: number; duration: string; description?: string }): Observable<SubscriptionResponse> {
    const token = this.getToken();
    return this.http.post<SubscriptionResponse>(`${this.apiUrl}/admin/subscriptions`, subData, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  updateSubscription(id: string, subData: Partial<SubscriptionPlan>): Observable<SubscriptionResponse> {
    const token = this.getToken();
    return this.http.put<SubscriptionResponse>(`${this.apiUrl}/admin/subscriptions/${id}`, subData, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  deleteSubscription(id: string): Observable<any> {
    const token = this.getToken();
    return this.http.delete<any>(`${this.apiUrl}/admin/subscriptions/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  // Public subscription methods
  getPublicSubscriptions(): Observable<SubscriptionResponse> {
    return this.http.get<SubscriptionResponse>(`${this.apiUrl}/subscriptions`);
  }

  // Payment methods
  makePayment(courseId: string, subscriptionId: string, paymentMethod: string): Observable<any> {
    const token = this.getToken();
    return this.http.post<any>(`${this.apiUrl}/payment/pay`, {
      courseId,
      subscriptionId,
      paymentMethod
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  hasCourseAccess(courseId: string): Observable<any> {
    const token = this.getToken();
    return this.http.get<any>(`${this.apiUrl}/payment/access/${courseId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  getMyPurchasedCourses(): Observable<{ success: boolean; courses: PurchasedCourse[] }> {
    const token = this.getToken();
    return this.http.get<{ success: boolean; courses: PurchasedCourse[] }>(`${this.apiUrl}/payment/my-courses`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  getInvoice(invoiceId: string): Observable<any> {
    const token = this.getToken();
    return this.http.get<any>(`${this.apiUrl}/payment/invoice/${invoiceId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  // Contact methods (user)
  sendContactMessage(payload: { name?: string; email?: string; subject: string; message: string }): Observable<ContactResponse> {
    const token = this.getToken();
    return this.http.post<ContactResponse>(`${this.apiUrl}/contact`, payload, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  getMyContactMessages(): Observable<ContactResponse> {
    const token = this.getToken();
    return this.http.get<ContactResponse>(`${this.apiUrl}/contact/my`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  deleteMyContactMessage(id: string): Observable<any> {
    const token = this.getToken();
    return this.http.delete<any>(`${this.apiUrl}/contact/my/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  // Contact methods (admin)
  getAllContacts(): Observable<ContactResponse> {
    const token = this.getToken();
    return this.http.get<ContactResponse>(`${this.apiUrl}/contact/admin`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  replyToContact(id: string, replyMessage: string, status?: string): Observable<ContactResponse> {
    const token = this.getToken();
    return this.http.put<ContactResponse>(`${this.apiUrl}/contact/admin/${id}/reply`, {
      replyMessage,
      status
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  // Forgot Password methods
  forgotPassword(email: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/forgot-password`, { email });
  }

  verifyOtp(email: string, otp: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/verify-otp`, { email, otp });
  }

  resetPassword(resetToken: string, newPassword: string, confirmPassword: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/reset-password`, {
      resetToken,
      newPassword,
      confirmPassword
    });
  }
}

