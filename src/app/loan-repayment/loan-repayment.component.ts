
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirestoreService } from '../services/firestore.service';
import { AuthService } from '../services/auth.service';
import { AccountDetails, AccountDetailsList } from '../models/account-details.model';
import Swal from 'sweetalert2';

interface LoanRepaymentEntry {
  date: string;
  amount: number;
  notes: string;
  timestamp: Date;
}

@Component({
  selector: 'app-loan-repayment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './loan-repayment.component.html',
  styleUrls: ['./loan-repayment.component.css']
})
export class LoanRepaymentComponent implements OnInit {
  accounts: AccountDetailsList = [];
  filteredAccounts: AccountDetailsList = [];
  loading = false;
  error: string | null = null;
  selectedAccount: AccountDetails | null = null;
  searchTerm = '';
  processing = false;
  hasEditAccess: boolean = false;

  // Repayment form fields
  repaymentAmount: number = 0;
  repaymentDate: string = '';
  repaymentNotes: string = '';

  constructor(
    private firestoreService: FirestoreService,
    private authService: AuthService
  ) {
    this.hasEditAccess = this.authService.hasEditAccess();
  }

  async ngOnInit() {
    await this.loadAccounts();
    this.setTodayDate();
  }

  setTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    this.repaymentDate = `${year}-${month}-${day}`;
  }

  async loadAccounts() {
    try {
      this.loading = true;
      this.error = null;

      const accountsData = await this.firestoreService.getAllDocuments('accountDetails');

      if (accountsData && accountsData.length > 0) {
        // Filter accounts that have outstanding loans
        this.accounts = accountsData
          .map(({ id, ...account }: any) => account)
          .filter((account: AccountDetails) => account.loan_amount > 0)
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
      const data = await response.json();
      this.accounts = data.filter((account: AccountDetails) => account.loan_amount > 0);
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
    this.repaymentAmount = 0;
    this.repaymentNotes = '';
    this.setTodayDate();
  }

  clearSelection() {
    this.selectedAccount = null;
    this.repaymentAmount = 0;

    this.repaymentNotes = '';
    this.setTodayDate();
  }

  async processRepayment() {
    if (!this.hasEditAccess) {
      Swal.fire({
        icon: 'error',
        title: 'Access Denied',
        text: 'You do not have permission to process loan repayments',
        confirmButtonColor: '#dc3545'
      });
      return;
    }

    if (!this.selectedAccount) {
      Swal.fire({
        icon: 'warning',
        title: 'No Account Selected',
        text: 'Please select an account first',
        confirmButtonColor: '#667eea'
      });
      return;
    }

    if (!this.repaymentAmount || this.repaymentAmount <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Amount',
        text: 'Please enter a valid repayment amount',
        confirmButtonColor: '#667eea'
      });
      return;
    }

    if (this.repaymentAmount > this.selectedAccount.loan_amount) {
      Swal.fire({
        icon: 'warning',
        title: 'Amount Exceeds Loan',
        text: `Repayment amount cannot exceed the outstanding loan amount of ₹${this.selectedAccount.loan_amount.toLocaleString('en-IN')}`,
        confirmButtonColor: '#667eea'
      });
      return;
    }

    if (!this.repaymentDate) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Date',
        text: 'Please select a repayment date',
        confirmButtonColor: '#667eea'
      });
      return;
    }

    // Confirm repayment
    const result = await Swal.fire({
      title: 'Confirm Loan Repayment',
      html: `
        <div style="text-align: left; padding: 10px;">
          <p><strong>Account:</strong> ${this.selectedAccount.account}</p>
          <p><strong>Name:</strong> ${this.selectedAccount.name}</p>
          <p><strong>Current Loan:</strong> ₹${this.selectedAccount.loan_amount.toLocaleString('en-IN')}</p>
          <p><strong>Repayment Amount:</strong> ₹${this.repaymentAmount.toLocaleString('en-IN')}</p>
          <p><strong>New Loan Balance:</strong> ₹${(this.selectedAccount.loan_amount - this.repaymentAmount).toLocaleString('en-IN')}</p>
          <p><strong>Date:</strong> ${new Date(this.repaymentDate).toLocaleDateString('en-IN')}</p>
          ${this.repaymentNotes ? `<p><strong>Notes:</strong> ${this.repaymentNotes}</p>` : ''}
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#48bb78',
      cancelButtonColor: '#718096',
      confirmButtonText: 'Confirm Repayment',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      this.processing = true;

      // Calculate new loan amount
      const newLoanAmount = this.selectedAccount.loan_amount - this.repaymentAmount;

      // Get the document ID for this account
      const accountsData = await this.firestoreService.getAllDocuments('accountDetails');
      const accountDoc = accountsData.find((doc: any) =>
        doc.account === this.selectedAccount!.account
      );

      if (accountDoc && accountDoc.id) {
        // Prepare repayment history entry
        const repaymentEntry: LoanRepaymentEntry = {
          date: this.repaymentDate,
          amount: this.repaymentAmount,
          notes: this.repaymentNotes,
          timestamp: new Date()
        };

        // Get existing repayment history or create new array
        const existingHistory = (accountDoc as any).loan_repayment_history || [];
        const updatedHistory = [...existingHistory, repaymentEntry];

        // Update the account with new loan amount and repayment history
        await this.firestoreService.updateDocument('accountDetails', accountDoc.id, {
          loan_amount: newLoanAmount,
          loan_repayment_history: updatedHistory
        });

        // Show success message
        await Swal.fire({
          icon: 'success',
          title: 'Repayment Successful!',
          html: `
            <p>Loan repayment of <strong>₹${this.repaymentAmount.toLocaleString('en-IN')}</strong> has been recorded.</p>
            <p>New loan balance: <strong>₹${newLoanAmount.toLocaleString('en-IN')}</strong></p>
          `,
          confirmButtonColor: '#48bb78'
        });

        // Reload accounts to reflect changes
        await this.loadAccounts();

        // Clear selection and form
        this.clearSelection();
      } else {
        console.error('Account document not found');
        Swal.fire({
          icon: 'error',
          title: 'Repayment Failed',
          text: 'Account document not found'
        });
        return;
      }
    } catch (error) {
      console.error('Error processing repayment:', error);
      Swal.fire({
        icon: 'error',
        title: 'Repayment Failed',
        text: 'Failed to process loan repayment. Please try again.',
        confirmButtonColor: '#f56565'
      });
    } finally {
      this.processing = false;
    }
  }

  getOutstandingLoanAmount(): number {
    return this.selectedAccount?.loan_amount || 0;
  }

  getNewLoanBalance(): number {
    if (!this.selectedAccount || !this.repaymentAmount) {
      return this.selectedAccount?.loan_amount || 0;
    }
    return Math.max(0, this.selectedAccount.loan_amount - this.repaymentAmount);
  }

  setFullRepayment() {
    if (this.selectedAccount) {
      this.repaymentAmount = this.selectedAccount.loan_amount;
    }
  }
}

