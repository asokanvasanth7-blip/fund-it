import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountDetails, AccountDetailsList, PaymentEntry } from '../models/account-details.model';
import { FirestoreService } from '../services/firestore.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-update-due-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './update-due-details.component.html',
  styleUrls: ['./update-due-details.component.css']
})
export class UpdateDueDetailsComponent implements OnInit {
  accounts: AccountDetailsList = [];
  filteredAccounts: AccountDetailsList = [];
  loading: boolean = true;
  error: string | null = null;
  selectedAccount: AccountDetails | null = null;
  selectedPayment: PaymentEntry | null = null;
  showEditModal: boolean = false;
  saving: boolean = false;
  saveSuccess: boolean = false;
  saveError: string | null = null;
  applyToAllDues: boolean = false;
  searchTerm: string = '';

  // Form fields
  editedPayment: PaymentEntry | null = null;

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

  editPayment(payment: PaymentEntry) {
    this.selectedPayment = payment;
    this.editedPayment = { ...payment };
    this.showEditModal = true;
    this.saveSuccess = false;
    this.saveError = null;
    this.applyToAllDues = false;
  }

  closeModal() {
    this.showEditModal = false;
    this.selectedPayment = null;
    this.editedPayment = null;
    this.saveSuccess = false;
    this.saveError = null;
  }

  async saveDueDetails() {
    if (!this.selectedAccount || !this.editedPayment || !this.selectedPayment) {
      return;
    }

    try {
      this.saving = true;
      this.saveError = null;

      if (this.applyToAllDues) {
        this.selectedAccount.due_payments = this.selectedAccount.due_payments.map((payment) => {
          return {
            ...payment,
            due_amount: this.editedPayment!.due_amount,
            loan_interest: this.editedPayment!.loan_interest,
            total: this.editedPayment!.due_amount + this.editedPayment!.loan_interest,
            due_no: payment.due_no,
            due_date: payment.due_date,
            paid_amount: payment.paid_amount,
            balance_amount: payment.balance_amount,
            payment_status: payment.payment_status
          };
        });
      } else {
        const paymentIndex = this.selectedAccount.due_payments.findIndex(
          p => p.due_no === this.selectedPayment!.due_no
        );

        if (paymentIndex !== -1) {
          this.selectedAccount.due_payments[paymentIndex] = { ...this.editedPayment };
        } else {
          this.saveError = 'Payment not found';
          return;
        }
      }

      const accountsData = await this.firestoreService.getAllDocuments('accountDetails');
      const firestoreAccount = accountsData.find(
        (acc: any) => acc.account === this.selectedAccount!.account
      );

      if (firestoreAccount) {
        await this.firestoreService.updateDocument(
          'accountDetails',
          firestoreAccount.id,
          { due_payments: this.selectedAccount.due_payments }
        );
      }

      this.saveSuccess = true;
      this.selectedPayment = { ...this.editedPayment };

      setTimeout(() => {
        this.closeModal();
      }, 1500);

    } catch (err: any) {
      console.error('Error updating due details:', err);
      this.saveError = err.message || 'Failed to update due details. Please try again.';
    } finally {
      this.saving = false;
    }
  }

  calculateTotal() {
    if (this.editedPayment) {
      this.editedPayment.total = this.editedPayment.due_amount + this.editedPayment.loan_interest;
    }
  }

  getPaymentStatusClass(status: string): string {
    switch (status) {
      case 'paid':
        return 'status-paid';
      case 'pending':
        return 'status-pending';
      case 'partial':
        return 'status-partial';
      case 'overdue':
        return 'status-overdue';
      default:
        return '';
    }
  }

  exportDuePaymentsJSON() {
    if (!this.selectedAccount) {
      Swal.fire({
        icon: 'warning',
        title: 'No Account Selected',
        text: 'Please select an account first',
        confirmButtonColor: '#667eea'
      });
      return;
    }

    const dataToExport = {
      account: this.selectedAccount.account,
      name: this.selectedAccount.name,
      exportDate: new Date().toISOString(),
      due_payments: this.selectedAccount.due_payments
    };

    const jsonString = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `due-payments-${this.selectedAccount.account}-${new Date().getTime()}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  async onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) {
      return;
    }

    if (!this.selectedAccount) {
      await Swal.fire({
        icon: 'warning',
        title: 'No Account Selected',
        text: 'Please select an account first',
        confirmButtonColor: '#667eea'
      });
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e: any) => {
      try {
        const jsonData = JSON.parse(e.target.result);

        if (!jsonData.due_payments || !Array.isArray(jsonData.due_payments)) {
          await Swal.fire({
            icon: 'error',
            title: 'Invalid JSON Format',
            text: 'due_payments array is required',
            confirmButtonColor: '#dc3545'
          });
          event.target.value = '';
          return;
        }

        const invalidPayment = jsonData.due_payments.find((payment: any) => !this.validatePaymentEntry(payment));
        if (invalidPayment) {
          await Swal.fire({
            icon: 'error',
            title: 'Invalid Payment Entry',
            text: 'One or more payment entries have invalid data',
            confirmButtonColor: '#dc3545'
          });
          event.target.value = '';
          return;
        }

        if (this.selectedAccount) {
          const result = await Swal.fire({
            icon: 'question',
            title: 'Import Due Payments?',
            html: `Import <strong>${jsonData.due_payments.length}</strong> payment entries for account <strong>${this.selectedAccount.account}</strong>?`,
            showCancelButton: true,
            confirmButtonText: 'Yes, Import',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#667eea',
            cancelButtonColor: '#6c757d',
            reverseButtons: true
          });

          if (result.isConfirmed) {
            await this.importDuePayments(jsonData.due_payments);
          }
        }
      } catch (err: any) {
        console.error('Error importing JSON:', err);
        await Swal.fire({
          icon: 'error',
          title: 'Import Failed',
          text: `Failed to import JSON: ${err.message}`,
          confirmButtonColor: '#dc3545'
        });
      } finally {
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  }

  private validatePaymentEntry(payment: any): boolean {
    return (
      typeof payment.due_no === 'number' &&
      typeof payment.due_date === 'string' &&
      typeof payment.due_amount === 'number' &&
      typeof payment.loan_interest === 'number' &&
      typeof payment.total === 'number' &&
      typeof payment.paid_amount === 'number' &&
      typeof payment.balance_amount === 'number' &&
      ['pending', 'paid', 'partial', 'overdue'].includes(payment.payment_status)
    );
  }

  private async importDuePayments(payments: PaymentEntry[]) {
    if (!this.selectedAccount) {
      return;
    }

    try {
      this.saving = true;
      this.saveError = null;

      this.selectedAccount.due_payments = payments;

      const accountsData = await this.firestoreService.getAllDocuments('accountDetails');
      const firestoreAccount = accountsData.find(
        (acc: any) => acc.account === this.selectedAccount!.account
      );

      if (firestoreAccount) {
        await this.firestoreService.updateDocument(
          'accountDetails',
          firestoreAccount.id,
          { due_payments: payments }
        );
      }

      await Swal.fire({
        icon: 'success',
        title: 'Import Successful!',
        text: 'Due payments imported successfully!',
        confirmButtonColor: '#28a745',
        timer: 2000,
        timerProgressBar: true
      });

    } catch (err: any) {
      console.error('Error importing due payments:', err);
      await Swal.fire({
        icon: 'error',
        title: 'Import Failed',
        text: `Failed to import due payments: ${err.message}`,
        confirmButtonColor: '#dc3545'
      });
    } finally {
      this.saving = false;
    }
  }

  copyDuePaymentsJSON() {
    if (!this.selectedAccount) {
      Swal.fire({
        icon: 'warning',
        title: 'No Account Selected',
        text: 'Please select an account first',
        confirmButtonColor: '#667eea'
      });
      return;
    }

    const dataToExport = {
      account: this.selectedAccount.account,
      name: this.selectedAccount.name,
      exportDate: new Date().toISOString(),
      due_payments: this.selectedAccount.due_payments
    };

    const jsonString = JSON.stringify(dataToExport, null, 2);

    navigator.clipboard.writeText(jsonString).then(() => {
      Swal.fire({
        icon: 'success',
        title: 'Copied!',
        text: 'Due payments JSON copied to clipboard!',
        confirmButtonColor: '#28a745',
        timer: 2000,
        timerProgressBar: true
      });
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err);
      Swal.fire({
        icon: 'error',
        title: 'Copy Failed',
        text: 'Failed to copy to clipboard',
        confirmButtonColor: '#dc3545'
      });
    });
  }
}

