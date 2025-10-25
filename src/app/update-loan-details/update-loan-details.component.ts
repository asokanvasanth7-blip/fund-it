import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountDetails, AccountDetailsList } from '../models/account-details.model';
import { FirestoreService } from '../services/firestore.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-update-loan-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './update-loan-details.component.html',
  styleUrls: ['./update-loan-details.component.css']
})
export class UpdateLoanDetailsComponent implements OnInit {
  accounts: AccountDetailsList = [];
  filteredAccounts: AccountDetailsList = [];
  loading: boolean = true;
  error: string | null = null;
  selectedAccount: AccountDetails | null = null;
  searchTerm: string = '';

  // Form fields
  newLoanAmount: number = 0;
  updateReason: string = '';
  isUpdating: boolean = false;

  constructor(private firestoreService: FirestoreService) {}

  async ngOnInit() {
    await this.loadAccounts();
  }

  async loadAccounts() {
    try {
      this.loading = true;
      this.error = null;

      const accountsData = await this.firestoreService.getAllDocuments('accountDetails');

      if (accountsData && accountsData.length > 0) {
        this.accounts = accountsData
          .map(({ id, ...account }: any) => account)
          .sort((a: AccountDetails, b: AccountDetails) =>
            a.account.localeCompare(b.account)
          );
        this.filteredAccounts = [...this.accounts];
      } else {
        await this.loadMockData();
      }
    } catch (err) {
      console.error('Error loading accounts:', err);
      this.error = 'Failed to load account details. Please try again later.';
      await this.loadMockData();
    } finally {
      this.loading = false;
    }
  }

  private async loadMockData() {
    try {
      const response = await fetch('/assets/account-details.mock.json');
      this.accounts = await response.json();
      this.filteredAccounts = [...this.accounts];
    } catch (err) {
      console.error('Error loading mock data:', err);
    }
  }

  filterAccounts() {
    const search = this.searchTerm.toLowerCase().trim();
    if (!search) {
      this.filteredAccounts = [...this.accounts];
    } else {
      this.filteredAccounts = this.accounts.filter(account =>
        account.account.toLowerCase().includes(search) ||
        account.name.toLowerCase().includes(search)
      );
    }
  }

  selectAccount(account: AccountDetails) {
    this.selectedAccount = account;
    this.newLoanAmount = account.loan_amount;
    this.updateReason = '';
  }

  async updateLoanAmount() {
    if (!this.selectedAccount) {
      return;
    }

    if (this.newLoanAmount < 0) {
      await Swal.fire({
        icon: 'error',
        title: 'Invalid Amount',
        text: 'Loan amount cannot be negative',
        confirmButtonColor: '#dc3545'
      });
      return;
    }

    if (this.newLoanAmount === this.selectedAccount.loan_amount) {
      await Swal.fire({
        icon: 'info',
        title: 'No Change',
        text: 'The loan amount is the same as the current value',
        confirmButtonColor: '#667eea'
      });
      return;
    }

    // Confirmation dialog
    const result = await Swal.fire({
      title: 'Update Loan Amount?',
      html: `
        <div style="text-align: left; padding: 10px;">
          <p><strong>Account:</strong> ${this.selectedAccount.name} (${this.selectedAccount.account})</p>
          <p><strong>Current Loan:</strong> ₹${this.selectedAccount.loan_amount.toLocaleString('en-IN')}</p>
          <p><strong>New Loan:</strong> ₹${this.newLoanAmount.toLocaleString('en-IN')}</p>
          <p><strong>Change:</strong>
            <span style="color: ${this.newLoanAmount > this.selectedAccount.loan_amount ? '#dc3545' : '#28a745'}">
              ${this.newLoanAmount > this.selectedAccount.loan_amount ? '+' : ''}₹${(this.newLoanAmount - this.selectedAccount.loan_amount).toLocaleString('en-IN')}
            </span>
          </p>
          ${this.updateReason ? `<p><strong>Reason:</strong> ${this.updateReason}</p>` : ''}
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#667eea',
      cancelButtonColor: '#718096',
      confirmButtonText: 'Yes, Update',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      this.isUpdating = true;

      // Find the account in Firestore
      const accountsData = await this.firestoreService.getAllDocuments('accountDetails');
      const firestoreAccount = accountsData.find(
        (acc: any) => acc.account === this.selectedAccount!.account
      );

      if (!firestoreAccount) {
        throw new Error('Account not found in database');
      }

      // Update in Firestore
      await this.firestoreService.updateDocument(
        'accountDetails',
        firestoreAccount.id,
        { loan_amount: this.newLoanAmount }
      );

      // Update local data
      this.selectedAccount.loan_amount = this.newLoanAmount;
      const accountIndex = this.accounts.findIndex(
        acc => acc.account === this.selectedAccount!.account
      );
      if (accountIndex !== -1) {
        this.accounts[accountIndex].loan_amount = this.newLoanAmount;
      }
      const filteredIndex = this.filteredAccounts.findIndex(
        acc => acc.account === this.selectedAccount!.account
      );
      if (filteredIndex !== -1) {
        this.filteredAccounts[filteredIndex].loan_amount = this.newLoanAmount;
      }

      await Swal.fire({
        icon: 'success',
        title: 'Loan Amount Updated!',
        text: `Successfully updated loan amount for ${this.selectedAccount.name}`,
        confirmButtonColor: '#28a745',
        timer: 3000,
        timerProgressBar: true
      });

      this.updateReason = '';

    } catch (err: any) {
      console.error('Error updating loan amount:', err);
      await Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: err.message || 'Failed to update loan amount. Please try again.',
        confirmButtonColor: '#dc3545'
      });
    } finally {
      this.isUpdating = false;
    }
  }

  resetForm() {
    if (this.selectedAccount) {
      this.newLoanAmount = this.selectedAccount.loan_amount;
      this.updateReason = '';
    }
  }

  getInitials(name: string): string {
    if (!name) return '?';

    const words = name.trim().split(' ');
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }

    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }

  getAvatarColor(accountId: string): string {
    const colors = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      'linear-gradient(135deg, #ff9a56 0%, #ff6a88 100%)',
      'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)',
      'linear-gradient(135deg, #f77062 0%, #fe5196 100%)',
      'linear-gradient(135deg, #2af598 0%, #009efd 100%)',
      'linear-gradient(135deg, #ee9ca7 0%, #ffdde1 100%)'
    ];

    let hash = 0;
    for (let i = 0; i < accountId.length; i++) {
      hash = accountId.charCodeAt(i) + ((hash << 5) - hash);
    }

    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }
}

