
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountDetails, AccountDetailsList, PaymentEntry } from '../models/account-details.model';
import { FirestoreService } from '../services/firestore.service';

@Component({
  selector: 'app-update-due-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './update-due-details.component.html',
  styleUrls: ['./update-due-details.component.css']
})
export class UpdateDueDetailsComponent implements OnInit {
  accounts: AccountDetailsList = [];
  loading: boolean = true;
  error: string | null = null;
  selectedAccount: AccountDetails | null = null;
  selectedPayment: PaymentEntry | null = null;
  showEditModal: boolean = false;
  saving: boolean = false;
  saveSuccess: boolean = false;
  saveError: string | null = null;
  applyToAllDues: boolean = false;

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
    } catch (err) {
      console.error('Error loading mock data:', err);
    }
  }

  selectAccount(account: AccountDetails) {
    this.selectedAccount = account;
  }

  editPayment(payment: PaymentEntry) {
    this.selectedPayment = payment;
    this.editedPayment = { ...payment }; // Create a copy for editing
    this.showEditModal = true;
    this.saveSuccess = false;
    this.saveError = null;
    this.applyToAllDues = false; // Reset checkbox
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
        // Apply changes to all dues
        this.selectedAccount.due_payments = this.selectedAccount.due_payments.map((payment) => {
          return {
            ...payment,
            due_amount: this.editedPayment!.due_amount,
            loan_interest: this.editedPayment!.loan_interest,
            total: this.editedPayment!.due_amount + this.editedPayment!.loan_interest,
            // Keep original due_no and other payment-specific fields
            due_no: payment.due_no,
            due_date: payment.due_date,
            paid_amount: payment.paid_amount,
            balance_amount: payment.balance_amount,
            payment_status: payment.payment_status
          };
        });
      } else {
        // Update only the selected payment
        const paymentIndex = this.selectedAccount.due_payments.findIndex(
          p => p.due_no === this.selectedPayment!.due_no
        );

        if (paymentIndex !== -1) {
          // Update the payment in the local array
          this.selectedAccount.due_payments[paymentIndex] = { ...this.editedPayment };
        } else {
          this.saveError = 'Payment not found';
          return;
        }
      }

      // Update in Firestore
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

      // Update the selected payment reference
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

  // Export due payments to JSON file
  exportDuePaymentsJSON() {
    if (!this.selectedAccount) {
      alert('Please select an account first');
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

  // Import due payments from JSON file
  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) {
      return;
    }

    if (!this.selectedAccount) {
      alert('Please select an account first');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e: any) => {
      try {
        const jsonData = JSON.parse(e.target.result);

        // Validate the JSON structure
        if (!jsonData.due_payments || !Array.isArray(jsonData.due_payments)) {
          alert('Invalid JSON format: due_payments array is required');
          event.target.value = '';
          return;
        }

        // Validate each payment entry
        const invalidPayment = jsonData.due_payments.find((payment: any) => !this.validatePaymentEntry(payment));
        if (invalidPayment) {
          alert(`Invalid payment entry found: ${JSON.stringify(invalidPayment)}`);
          event.target.value = '';
          return;
        }

        // Confirm before importing
        if (this.selectedAccount && confirm(`Import ${jsonData.due_payments.length} payment entries for account ${this.selectedAccount.account}?`)) {
          await this.importDuePayments(jsonData.due_payments);
        }
      } catch (err: any) {
        console.error('Error importing JSON:', err);
        alert(`Failed to import JSON: ${err.message}`);
      } finally {
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  }

  // Validate payment entry structure
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

  // Import and save due payments
  private async importDuePayments(payments: PaymentEntry[]) {
    if (!this.selectedAccount) {
      return;
    }

    try {
      this.saving = true;
      this.saveError = null;

      // Update local data
      this.selectedAccount.due_payments = payments;

      // Update in Firestore
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

      alert('Due payments imported successfully!');

    } catch (err: any) {
      console.error('Error importing due payments:', err);
      alert(`Failed to import due payments: ${err.message}`);
    } finally {
      this.saving = false;
    }
  }

  // Copy JSON to clipboard
  copyDuePaymentsJSON() {
    if (!this.selectedAccount) {
      alert('Please select an account first');
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
      alert('Due payments JSON copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err);
      alert('Failed to copy to clipboard');
    });
  }
}
