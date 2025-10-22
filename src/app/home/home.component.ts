import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { FirestoreService } from '../services/firestore.service';
import { AccountDetails } from '../models/account-details.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html'
})
export class HomeComponent implements OnInit {
  user$;
  totalMembers: number = 0;
  totalFundAmount: number = 0;
  totalLoanAmount: number = 0;

  constructor(
    private authService: AuthService,
    private router: Router,
    private firestoreService: FirestoreService
  ) {
    this.user$ = this.authService.user$;
  }

  async ngOnInit() {
    await this.loadStatistics();
  }

  async loadStatistics() {
    try {
      const accountsData = await this.firestoreService.getAllDocuments('accountDetails');

      this.totalMembers = accountsData.length;
      this.totalFundAmount = accountsData.reduce((sum: number, acc: any) => sum + (acc.fund_amount || 0), 0);
      this.totalLoanAmount = accountsData.reduce((sum: number, acc: any) => sum + (acc.loan_amount || 0), 0);
    } catch (error) {
      console.error('Error loading statistics:', error);
      // Set default values if error occurs
      this.totalMembers = 0;
      this.totalFundAmount = 0;
      this.totalLoanAmount = 0;
    }
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }


  async logout() {
    try {
      await this.authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
}

