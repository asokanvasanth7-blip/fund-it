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
  saving: boolean = false;
  saveSuccess: boolean = false;
  saveError: string | null = null;
  searchTerm: string = '';

  // Form fields
  editedFundAmount: number = 0;
  editedLoanAmount: number = 0;

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

  async saveLoanDetails() {
    if (!this.selectedAccount) {
      return;
    }

    try {
      this.saving = true;
      this.saveError = null;

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
            loan_amount: this.editedLoanAmount
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

