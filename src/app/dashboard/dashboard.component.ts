
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { FirestoreService } from '../services/firestore.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  user$;
  userName: string = '';

  // Statistics
  totalMembers: number = 0;
  totalFundAmount: number = 0;
  totalLoanAmount: number = 0;
  availableFunds: number = 0;
  totalPendingDues: number = 0;

  // Recent activities
  recentPayments: any[] = [];
  upcomingDues: any[] = [];

  loading: boolean = true;

  constructor(
    private authService: AuthService,
    private router: Router,
    private firestoreService: FirestoreService
  ) {
    this.user$ = this.authService.user$;
  }

  async ngOnInit() {
    this.user$.subscribe((user: any) => {
      if (user) {
        this.userName = this.authService.getUserDisplayName();
      }
    });

    await this.loadDashboardData();
  }

  async loadDashboardData() {
    try {
      this.loading = true;

      // Load account details
      const accountsData = await this.firestoreService.getAllDocuments('accountDetails');

      this.totalMembers = accountsData.length;
      this.totalFundAmount = accountsData.reduce((sum: number, acc: any) => sum + (acc.fund_amount || 0), 0);
      this.totalLoanAmount = accountsData.reduce((sum: number, acc: any) => sum + (acc.loan_amount || 0), 0);
      this.availableFunds = this.totalFundAmount - this.totalLoanAmount;

      // Load recent payments from payment history
      await this.loadRecentPayments(accountsData);

      // Load due schedule
      try {
        const duesData = await this.firestoreService.getAllDocuments('dueSchedule');

        // Calculate pending dues (dues with payment_date not set or empty)
        const pendingDues = duesData.filter((due: any) => !due.payment_date);
        this.totalPendingDues = pendingDues.reduce((sum: number, due: any) => sum + (due.due_amount || 0), 0);

        // Get upcoming dues (next 5)
        this.upcomingDues = duesData
          .filter((due: any) => !due.payment_date)
          .sort((a: any, b: any) => {
            const dateA = a.due_date ? new Date(a.due_date).getTime() : 0;
            const dateB = b.due_date ? new Date(b.due_date).getTime() : 0;
            return dateA - dateB;
          })
          .slice(0, 5);
      } catch (error) {
        console.error('Error loading due schedule:', error);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      this.loading = false;
    }
  }

  async loadRecentPayments(accountsData: any[]) {
    try {
      // Collect all payments from all accounts
      const allPayments: any[] = [];

      accountsData.forEach((account: any) => {
        if (account.due_payments && Array.isArray(account.due_payments)) {
          account.due_payments.forEach((payment: any) => {
            // Only include paid or partial payments
            if (payment.payment_status === 'paid' || payment.payment_status === 'partial') {
              allPayments.push({
                account_id: account.account,
                account_name: account.name,
                due_no: payment.due_no,
                payment_date: payment.payment_date || payment.due_date,
                paid_amount: payment.paid_amount,
                payment_status: payment.payment_status,
                due_amount: payment.due_amount
              });
            }
          });
        }
      });

      // Sort by payment date (most recent first) and get last 5
      this.recentPayments = allPayments
        .filter(p => p.payment_date)
        .sort((a, b) => {
          const dateA = new Date(a.payment_date).getTime();
          const dateB = new Date(b.payment_date).getTime();
          return dateB - dateA; // Descending order
        })
        .slice(0, 5);

    } catch (error) {
      console.error('Error loading recent payments:', error);
      this.recentPayments = [];
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN');
  }

  getPaymentStatusClass(status: string): string {
    switch (status) {
      case 'paid': return 'status-paid';
      case 'partial': return 'status-partial';
      default: return '';
    }
  }
}

