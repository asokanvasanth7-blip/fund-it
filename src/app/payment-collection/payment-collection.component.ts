
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountDetails, AccountDetailsList, PaymentEntry } from '../models/account-details.model';
import { FirestoreService } from '../services/firestore.service';

@Component({
  selector: 'app-payment-collection',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment-collection.component.html',
  styleUrls: ['./payment-collection.component.css']
})
export class PaymentCollectionComponent implements OnInit {
  accounts: AccountDetailsList = [];
  filteredAccounts: AccountDetailsList = [];
  loading: boolean = true;
  error: string | null = null;
  selectedAccount: AccountDetails | null = null;
  selectedPayment: PaymentEntry | null = null;
  showPaymentModal: boolean = false;
  processing: boolean = false;
  paymentSuccess: boolean = false;
  paymentError: string | null = null;
  searchTerm: string = '';

  // Payment form fields
  amountToPay: number = 0;
  paymentDate: string = '';
  paymentMethod: string = 'cash';
  paymentNotes: string = '';

  constructor(private firestoreService: FirestoreService) {}

  async ngOnInit() {
    await this.loadAccounts();
    this.setTodayDate();
  }

  setTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    this.paymentDate = `${year}-${month}-${day}`;
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

  openPaymentModal(payment: PaymentEntry) {
    this.selectedPayment = payment;
    this.amountToPay = payment.total - payment.paid_amount; // Default to remaining balance
    this.showPaymentModal = true;
    this.paymentSuccess = false;
    this.paymentError = null;
    this.paymentNotes = '';
  }

  closePaymentModal() {
    this.showPaymentModal = false;
    this.selectedPayment = null;
    this.amountToPay = 0;
    this.paymentSuccess = false;
    this.paymentError = null;
    this.paymentNotes = '';
  }

  getRemainingBalance(payment: PaymentEntry): number {
    return payment.total - payment.paid_amount;
  }

  async collectPayment() {
    if (!this.selectedAccount || !this.selectedPayment) {
      return;
    }

    if (this.amountToPay <= 0) {
      this.paymentError = 'Payment amount must be greater than zero';
      return;
    }

    const remainingBalance = this.getRemainingBalance(this.selectedPayment);
    if (this.amountToPay > remainingBalance) {
      this.paymentError = `Payment amount cannot exceed remaining balance of ₹${remainingBalance.toFixed(2)}`;
      return;
    }

    try {
      this.processing = true;
      this.paymentError = null;

      // Find the payment index
      const paymentIndex = this.selectedAccount.due_payments.findIndex(
        p => p.due_no === this.selectedPayment!.due_no
      );

      if (paymentIndex === -1) {
        throw new Error('Payment not found');
      }

      // Update payment details
      const updatedPayment = { ...this.selectedPayment };
      updatedPayment.paid_amount += this.amountToPay;
      updatedPayment.balance_amount = updatedPayment.total - updatedPayment.paid_amount;

      // Update payment status
      if (updatedPayment.balance_amount === 0) {
        updatedPayment.payment_status = 'paid';
      } else if (updatedPayment.paid_amount > 0) {
        updatedPayment.payment_status = 'partial';
      }

      // Update in local array
      this.selectedAccount.due_payments[paymentIndex] = updatedPayment;

      // Update fund_amount - add the payment amount to account's fund
      this.selectedAccount.fund_amount += this.amountToPay;

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
            due_payments: this.selectedAccount.due_payments,
            fund_amount: this.selectedAccount.fund_amount
          }
        );
      }

      // Log payment transaction (you can store this separately if needed)
      console.log('Payment collected:', {
        account: this.selectedAccount.account,
        name: this.selectedAccount.name,
        due_no: this.selectedPayment.due_no,
        amount: this.amountToPay,
        date: this.paymentDate,
        method: this.paymentMethod,
        notes: this.paymentNotes
      });

      this.paymentSuccess = true;
      this.selectedPayment = updatedPayment;

      setTimeout(() => {
        this.closePaymentModal();
      }, 2000);

    } catch (err: any) {
      console.error('Error collecting payment:', err);
      this.paymentError = err.message || 'Failed to process payment. Please try again.';
    } finally {
      this.processing = false;
    }
  }

  getPendingPayments(account: AccountDetails): PaymentEntry[] {
    return account.due_payments.filter(p =>
      p.payment_status === 'pending' || p.payment_status === 'partial' || p.payment_status === 'overdue'
    );
  }

  getTotalPendingAmount(account: AccountDetails): number {
    return this.getPendingPayments(account).reduce((sum, p) => sum + (p.total - p.paid_amount), 0);
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

  canCollectPayment(payment: PaymentEntry): boolean {
    const today = new Date();
    const currentMonth = today.getMonth(); // 0-11
    const currentYear = today.getFullYear();

    // Parse the due date (format: "DD MMM YYYY" e.g., "21 Oct 2025")
    const dueDate = this.parseDueDate(payment.due_date);

    if (!dueDate) {
      return false; // Invalid date format
    }

    const dueMonth = dueDate.getMonth();
    const dueYear = dueDate.getFullYear();

    // Allow payment collection for any due in the current month and year
    // This allows collecting payments for dues that are in the current month,
    // even if the specific due date has passed
    return dueMonth === currentMonth && dueYear === currentYear;
  }

  parseDueDate(dueDateStr: string): Date | null {
    try {
      // Parse date format: "DD MMM YYYY" (e.g., "21 Oct 2025")
      const months: { [key: string]: number } = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };

      const parts = dueDateStr.trim().split(' ');
      if (parts.length !== 3) {
        return null;
      }

      const day = parseInt(parts[0], 10);
      const monthStr = parts[1];
      const year = parseInt(parts[2], 10);

      const month = months[monthStr];
      if (month === undefined) {
        return null;
      }

      return new Date(year, month, day);
    } catch (err) {
      console.error('Error parsing due date:', err);
      return null;
    }
  }
}
