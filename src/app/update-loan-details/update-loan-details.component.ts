import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountDetails, AccountDetailsList } from '../models/account-details.model';
import { FirestoreService } from '../services/firestore.service';

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
  showEditModal: boolean = false;
  showRepaymentModal: boolean = false;
  saving: boolean = false;
  saveSuccess: boolean = false;
  saveError: string | null = null;
  searchTerm: string = '';

  // Form fields
  editedFundAmount: number = 0;
  editedLoanAmount: number = 0;

  // Repayment fields
  repaymentAmount: number = 0;
  repaymentDate: string = '';
  repaymentNotes: string = '';

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
  }

  openEditModal() {
    if (!this.selectedAccount) return;

    this.editedFundAmount = this.selectedAccount.fund_amount;
    this.editedLoanAmount = this.selectedAccount.loan_amount;
    this.showEditModal = true;
    this.saveSuccess = false;
    this.saveError = null;
  }

  closeModal() {
    this.showEditModal = false;
    this.saveSuccess = false;
    this.saveError = null;
  }

  openRepaymentModal() {
    if (!this.selectedAccount) return;

    this.repaymentAmount = 0;
    this.repaymentNotes = '';
    this.setTodayDate();
    this.showRepaymentModal = true;
    this.saveSuccess = false;
    this.saveError = null;
  }

  closeRepaymentModal() {
    this.showRepaymentModal = false;
    this.repaymentAmount = 0;
    this.repaymentNotes = '';
    this.saveSuccess = false;
    this.saveError = null;
  }

  setTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    this.repaymentDate = `${year}-${month}-${day}`;
  }

  async processLoanRepayment() {
    if (!this.selectedAccount) {
      return;
    }

    if (this.repaymentAmount <= 0) {
      this.saveError = 'Repayment amount must be greater than zero';
      return;
    }

    if (this.repaymentAmount > this.selectedAccount.loan_amount) {
      this.saveError = `Repayment amount cannot exceed current loan balance of ₹${this.selectedAccount.loan_amount.toFixed(2)}`;
      return;
    }

    try {
      this.saving = true;
      this.saveError = null;

      // Calculate new loan amount after repayment
      const newLoanAmount = this.selectedAccount.loan_amount - this.repaymentAmount;

      // Calculate new total interest based on remaining loan
      const newTotalInterest = (newLoanAmount / 100) * 3;


      // Update loan interest for all pending dues
      this.selectedAccount.due_payments = this.selectedAccount.due_payments.map(payment => {
        if (payment.payment_status === 'pending') {
          return {
            ...payment,
            loan_interest: newTotalInterest,
            total: payment.due_amount + newTotalInterest,
            balance_amount: payment.due_amount + newTotalInterest - payment.paid_amount
          };
        }
        return payment;
      });

      // Update the loan amount
      this.selectedAccount.loan_amount = newLoanAmount;

      // Update in Firestore
      const accountsData = await this.firestoreService.getAllDocuments('accountDetails');
      const firestoreAccount = accountsData.find(
        (acc: any) => acc.account === this.selectedAccount!.account
      );

      if (firestoreAccount) {
        await this.firestoreService.updateDocument(
          'accountDetails',
          firestoreAccount.id,
          {
            loan_amount: newLoanAmount,
            due_payments: this.selectedAccount.due_payments
          }
        );
      }

      // Log repayment transaction
      console.log('Loan repayment processed:', {
        account: this.selectedAccount.account,
        name: this.selectedAccount.name,
        repaymentAmount: this.repaymentAmount,
        previousLoanAmount: this.selectedAccount.loan_amount + this.repaymentAmount,
        newLoanAmount: newLoanAmount,
        date: this.repaymentDate,
        notes: this.repaymentNotes
      });

      this.saveSuccess = true;

      setTimeout(() => {
        this.closeRepaymentModal();
      }, 2000);

    } catch (err: any) {
      console.error('Error processing loan repayment:', err);
      this.saveError = err.message || 'Failed to process loan repayment. Please try again.';
    } finally {
      this.saving = false;
    }
  }

  async saveLoanDetails() {
    if (!this.selectedAccount) {
      return;
    }

    try {
      this.saving = true;
      this.saveError = null;

      // Calculate total interest: (loan_amount / 100) * 3
      const totalInterest = this.editedLoanAmount / 100 * 3;


      // Update loan interest for all pending dues
      this.selectedAccount.due_payments = this.selectedAccount.due_payments.map(payment => {
        if (payment.payment_status === 'pending') {
          // Update loan interest for pending dues
          return {
            ...payment,
            loan_interest: totalInterest,
            total: payment.due_amount + totalInterest,
            balance_amount: payment.due_amount + totalInterest - payment.paid_amount
          };
        }
        // Keep other payments unchanged
        return payment;
      });

      // Update the local account
      this.selectedAccount.fund_amount = this.editedFundAmount;
      this.selectedAccount.loan_amount = this.editedLoanAmount;

      // Update in Firestore
      const accountsData = await this.firestoreService.getAllDocuments('accountDetails');
      const firestoreAccount = accountsData.find(
        (acc: any) => acc.account === this.selectedAccount!.account
      );

      if (firestoreAccount) {
        await this.firestoreService.updateDocument(
          'accountDetails',
          firestoreAccount.id,
          {
            fund_amount: this.editedFundAmount,
            loan_amount: this.editedLoanAmount,
            due_payments: this.selectedAccount.due_payments
          }
        );
      }

      this.saveSuccess = true;

      setTimeout(() => {
        this.closeModal();
      }, 1500);

    } catch (err: any) {
      console.error('Error updating loan details:', err);
      this.saveError = err.message || 'Failed to update loan details. Please try again.';
    } finally {
      this.saving = false;
    }
  }
}

