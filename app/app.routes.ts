import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { RegistrationComponent } from './registration/registration.component';
import { HomeComponent } from './home/home.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ProfileComponent } from './profile/profile.component';
import { AboutComponent } from './about/about.component';
import { CoursesComponent } from './courses/courses.component';
import { CourseDetailComponent } from './course-detail/course-detail.component';
import { ContactComponent } from './contact/contact.component';
import { TeamComponent } from './team/team.component';
import { TestimonialComponent } from './testimonial/testimonial.component';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { VerifyOtpComponent } from './verify-otp/verify-otp.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { BooksComponent } from './books/books.component';
import { authGuard } from './auth.guard';
import { PaymentComponent } from './payment/payment.component';
import { PremiumCoursesComponent } from './premium-courses/premium-courses.component';

export const routes: Routes = [
  // Default route shows dashboard directly
  { path: '', component: DashboardComponent },
  { path: 'login', component: LoginComponent },
  { path: 'registration', component: RegistrationComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'verify-otp', component: VerifyOtpComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'home', component: HomeComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'profile', component: ProfileComponent },
  { path: 'about', component: AboutComponent },
  { path: 'courses', component: CoursesComponent },
  { path: 'premium-courses', component: PremiumCoursesComponent },
  { path: 'course/:id', component: CourseDetailComponent, canActivate: [authGuard] },
  { path: 'contact', component: ContactComponent },
  { path: 'books', component: BooksComponent },
  { path: 'payment/:courseId', component: PaymentComponent, canActivate: [authGuard] },
  { path: 'team', component: TeamComponent },
  { path: 'testimonial', component: TestimonialComponent },
  { path: 'admin-dashboard', component: AdminDashboardComponent },
  // Fallback: any unknown route goes to dashboard
  { path: '**', redirectTo: '/dashboard' }
];
