
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
  recentAccounts: any[] = [];
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
        this.userName = user.email?.split('@')[0] || 'User';
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

      // Get recent 5 accounts
      this.recentAccounts = accountsData.slice(0, 5);

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

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN');
  }
}

