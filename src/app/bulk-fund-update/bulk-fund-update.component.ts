
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirestoreService } from '../services/firestore.service';
import { AuthService } from '../services/auth.service';
import { AccountDetails } from '../models/account-details.model';
import Swal from 'sweetalert2';

interface BulkUpdateAccount extends AccountDetails {
  selected: boolean;
  newFundAmount: number;
  status?: 'pending' | 'processing' | 'success' | 'error';
  errorMessage?: string;
}

@Component({
  selector: 'app-bulk-fund-update',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bulk-fund-update.component.html',
  styleUrls: ['./bulk-fund-update.component.css']
})
export class BulkFundUpdateComponent implements OnInit {
  accounts: BulkUpdateAccount[] = [];
  filteredAccounts: BulkUpdateAccount[] = [];
  loading = false;
  processing = false;
  hasEditAccess: boolean = false;
  searchTerm = '';

  // Bulk update controls
  selectAll = false;
  bulkFundAmount: number = 0;

  // Progress tracking
  progressPercentage = 0;
  processedCount = 0;
  totalCount = 0;
  successCount = 0;
  errorCount = 0;

  constructor(
    private firestoreService: FirestoreService,
    private authService: AuthService
  ) {
    this.hasEditAccess = this.authService.hasEditAccess();
  }

  async ngOnInit() {
    if (!this.hasEditAccess) {
      Swal.fire({
        icon: 'error',
        title: 'Access Denied',
        text: 'You do not have permission to access this page',
        confirmButtonColor: '#dc3545'
      }).then(() => {
        window.history.back();
      });
      return;
    }
    await this.loadAccounts();
  }

  async loadAccounts() {
    try {
      this.loading = true;

      const accountsData = await this.firestoreService.getAllDocuments('accountDetails');

      if (accountsData && accountsData.length > 0) {
        this.accounts = accountsData
          .map(({ id, ...account }: any) => ({
            ...account,
            selected: false,
            newFundAmount: account.fund_amount || 0,
            status: 'pending' as const
          }))
          .sort((a: any, b: any) => a.account.localeCompare(b.account));
        this.filteredAccounts = [...this.accounts];
      }
    } catch (err) {
      console.error('Error loading accounts:', err);
      Swal.fire({
        icon: 'error',
        title: 'Loading Failed',
        text: 'Failed to load account details. Please try again later.',
        confirmButtonColor: '#dc3545'
      });
    } finally {
      this.loading = false;
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

  toggleSelectAll() {
    this.selectAll = !this.selectAll;
    this.filteredAccounts.forEach(account => {
      account.selected = this.selectAll;
    });
  }

  toggleAccountSelection(account: BulkUpdateAccount) {
    account.selected = !account.selected;
    this.updateSelectAllState();
  }

  updateSelectAllState() {
    const visibleAccounts = this.filteredAccounts.length;
    const selectedVisibleAccounts = this.filteredAccounts.filter(a => a.selected).length;
    this.selectAll = visibleAccounts > 0 && selectedVisibleAccounts === visibleAccounts;
  }

  getSelectedCount(): number {
    return this.accounts.filter(a => a.selected).length;
  }

  applyBulkAmount() {
    if (this.bulkFundAmount < 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Amount',
        text: 'Fund amount cannot be negative',
        confirmButtonColor: '#2563eb'
      });
      return;
    }

    const selectedAccounts = this.accounts.filter(a => a.selected);
    if (selectedAccounts.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No Accounts Selected',
        text: 'Please select at least one account',
        confirmButtonColor: '#2563eb'
      });
      return;
    }

    selectedAccounts.forEach(account => {
      account.newFundAmount = this.bulkFundAmount;
    });

    Swal.fire({
      icon: 'success',
      title: 'Amount Applied',
      text: `Fund amount of ₹${this.bulkFundAmount.toLocaleString('en-IN')} applied to ${selectedAccounts.length} account(s)`,
      confirmButtonColor: '#10b981',
      timer: 2000
    });
  }

  async processBulkUpdate() {
    const selectedAccounts = this.accounts.filter(a => a.selected);

    if (selectedAccounts.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No Accounts Selected',
        text: 'Please select at least one account to update',
        confirmButtonColor: '#2563eb'
      });
      return;
    }

    // Validate all new amounts
    const invalidAccounts = selectedAccounts.filter(a => a.newFundAmount < 0);
    if (invalidAccounts.length > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Amounts',
        text: 'Some accounts have negative fund amounts. Please correct them before proceeding.',
        confirmButtonColor: '#2563eb'
      });
      return;
    }

    // Confirm bulk update
    const result = await Swal.fire({
      title: 'Confirm Bulk Update',
      html: `
        <div style="text-align: left; padding: 10px;">
          <p><strong>Accounts to update:</strong> ${selectedAccounts.length}</p>
          <p><strong>Total new fund amount:</strong> ₹${selectedAccounts.reduce((sum, a) => sum + a.newFundAmount, 0).toLocaleString('en-IN')}</p>
          <p style="margin-top: 15px; color: #dc3545;">This action will update the fund amounts in the database.</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#718096',
      confirmButtonText: 'Update Fund Amounts',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) {
      return;
    }

    // Start processing
    this.processing = true;
    this.processedCount = 0;
    this.totalCount = selectedAccounts.length;
    this.successCount = 0;
    this.errorCount = 0;
    this.progressPercentage = 0;

    // Process accounts one by one
    for (const account of selectedAccounts) {
      account.status = 'processing';

      try {
        // Get the document ID
        const accountsData = await this.firestoreService.getAllDocuments('accountDetails');
        const accountDoc = accountsData.find((doc: any) => doc.account === account.account);

        if (accountDoc && accountDoc.id) {
          await this.firestoreService.updateDocument('accountDetails', accountDoc.id, {
            fund_amount: account.newFundAmount
          });

          account.status = 'success';
          account.fund_amount = account.newFundAmount;
          this.successCount++;
        } else {
          console.error('Account document not found');
          account.status = 'error';
          account.errorMessage = 'Account document not found';
          this.errorCount++;
        }
      } catch (error) {
        console.error(`Error updating account ${account.account}:`, error);
        account.status = 'error';
        account.errorMessage = 'Update failed';
        this.errorCount++;
      }

      this.processedCount++;
      this.progressPercentage = Math.round((this.processedCount / this.totalCount) * 100);

      // Small delay to show progress
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.processing = false;

    // Show completion message
    if (this.errorCount === 0) {
      await Swal.fire({
        icon: 'success',
        title: 'Update Complete!',
        html: `
          <p>Successfully updated <strong>${this.successCount}</strong> account(s)</p>
        `,
        confirmButtonColor: '#10b981'
      });
    } else {
      await Swal.fire({
        icon: 'warning',
        title: 'Update Complete with Errors',
        html: `
          <p>Successfully updated: <strong>${this.successCount}</strong> account(s)</p>
          <p style="color: #dc3545;">Failed: <strong>${this.errorCount}</strong> account(s)</p>
        `,
        confirmButtonColor: '#2563eb'
      });
    }

    // Reload accounts
    await this.loadAccounts();
  }

  resetSelection() {
    this.accounts.forEach(account => {
      account.selected = false;
      account.newFundAmount = account.fund_amount || 0;
      account.status = 'pending';
      account.errorMessage = undefined;
    });
    this.selectAll = false;
    this.bulkFundAmount = 0;
  }

  getStatusClass(status?: string): string {
    switch (status) {
      case 'processing': return 'status-processing';
      case 'success': return 'status-success';
      case 'error': return 'status-error';
      default: return '';
    }
  }

  getStatusIcon(status?: string): string {
    switch (status) {
      case 'processing': return '⏳';
      case 'success': return '✓';
      case 'error': return '✗';
      default: return '';
    }
  }
}
