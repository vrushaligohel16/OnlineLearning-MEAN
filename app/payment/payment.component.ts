import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './payment.component.html',
  styleUrl: './payment.component.css'
})
export class PaymentComponent implements OnInit {
  courseId = '';
  planInfo: any = null;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  invoicePdfData: string | null = null;
  paymentMethod: 'UPI' | 'CARD' | 'NET_BANKING' | 'WALLET' = 'UPI';
  canGoToCourse = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.courseId = this.route.snapshot.paramMap.get('courseId') || '';
    if (!this.courseId) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.loadPlanInfo();
  }

  loadPlanInfo() {
    this.isLoading = true;
    this.errorMessage = '';
    this.authService.getPublicSubscriptions().subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success && res.subscriptions) {
          this.planInfo = res.subscriptions.find(s => s.courseId === this.courseId) || null;
        }
        if (!this.planInfo) {
          this.errorMessage = 'No premium plan found for this course.';
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Error loading subscription plan.';
      }
    });
  }

  payNow() {
    if (!this.planInfo) {
      this.errorMessage = 'No subscription plan found for this course.';
      return;
    }
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: `/payment/${this.courseId}` } });
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.makePayment(this.courseId, this.planInfo.id, this.paymentMethod).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success && res.invoice && res.invoice.pdfData) {
          this.successMessage = 'Payment successful! You can download your invoice.';
          this.invoicePdfData = res.invoice.pdfData;
          this.canGoToCourse = true;
        } else {
          this.errorMessage = res.message || 'Payment completed, but invoice is not available.';
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Error processing payment.';
      }
    });
  }

  goToCourse() {
    if (!this.courseId) {
      return;
    }
    this.router.navigate(['/course', this.courseId]);
  }

  downloadInvoice() {
    if (!this.invoicePdfData) {
      return;
    }
    const blob = this.base64ToBlob(this.invoicePdfData, 'application/pdf');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'invoice.pdf';
    a.click();
    URL.revokeObjectURL(url);
  }

  private base64ToBlob(base64: string, contentType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = Array.from({ length: byteCharacters.length }, (_, i) =>
      byteCharacters.charCodeAt(i)
    );
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: contentType });
  }
}

