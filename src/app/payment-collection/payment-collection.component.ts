import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountDetails, AccountDetailsList, PaymentEntry } from '../models/account-details.model';
import { FirestoreService } from '../services/firestore.service';
import {AuthService} from '../services/auth.service';

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
  hasEditAccess: boolean = false;
  paymentFilter: string = 'all'; // 'all', 'pending', 'paid', 'partial'

  // Payment form fields
  amountToPay: number = 0;
  paymentDate: string = '';
  paymentMethod: string = 'cash';
  paymentNotes: string = '';

  constructor(
    private firestoreService: FirestoreService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    this.hasEditAccess = this.authService.hasEditAccess();
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
    if (!this.hasEditAccess) {
      this.paymentError = 'You do not have permission to collect payments';
      return;
    }

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

  getFilteredPayments(account: AccountDetails): PaymentEntry[] {
    if (this.paymentFilter === 'all') {
      return account.due_payments || [];
    } else if (this.paymentFilter === 'pending') {
      return account.due_payments.filter(p => p.payment_status === 'pending' || p.payment_status === 'overdue');
    } else if (this.paymentFilter === 'paid') {
      return account.due_payments.filter(p => p.payment_status === 'paid');
    } else if (this.paymentFilter === 'partial') {
      return account.due_payments.filter(p => p.payment_status === 'partial');
    }
    return account.due_payments || [];
  }

  getPendingCount(account: AccountDetails): number {
    return account.due_payments?.filter(p => p.payment_status === 'pending' || p.payment_status === 'overdue').length || 0;
  }

  getPartialCount(account: AccountDetails): number {
    return account.due_payments?.filter(p => p.payment_status === 'partial').length || 0;
  }

  getPaidCount(account: AccountDetails): number {
    return account.due_payments?.filter(p => p.payment_status === 'paid').length || 0;
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

  // Helper method to get initials from name
  getInitials(name: string): string {
    if (!name) return '?';

    const words = name.trim().split(' ');
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }

    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }

  // Helper method to generate avatar color based on account ID
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

    // Generate a consistent index based on account ID
    let hash = 0;
    for (let i = 0; i < accountId.length; i++) {
      hash = accountId.charCodeAt(i) + ((hash << 5) - hash);
    }

    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }

  // Send WhatsApp receipt
  sendWhatsAppReceipt(payment: PaymentEntry) {
    if (!this.selectedAccount) return;

    const account = this.selectedAccount;
    const mobile = account.mobile || '';

    if (!mobile) {
      alert('Mobile number not available for this account');
      return;
    }

    // Clean mobile number (remove spaces, dashes, etc.)
    const cleanMobile = mobile.replace(/\D/g, '');

    // Generate receipt message
    const receiptMessage = this.generateReceiptMessage(account, payment);

    // Encode the message for URL
    const encodedMessage = encodeURIComponent(receiptMessage);

    // Open WhatsApp with pre-filled message
    const whatsappUrl = `https://wa.me/91${cleanMobile}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  }

  // Generate receipt message text
  generateReceiptMessage(account: AccountDetails, payment: PaymentEntry): string {
    const message = `
*PAYMENT RECEIPT*
━━━━━━━━━━━━━━━━━━━━

*Account Details:*
Name: ${account.name}
Account ID: ${account.account}
Mobile: ${account.mobile || 'N/A'}

*Payment Details:*
Due No: ${payment.due_no}
Due Date: ${payment.due_date}
Total Due: ₹${payment.total.toFixed(2)}
Paid Amount: ₹${payment.paid_amount.toFixed(2)}
Balance: ₹${(payment.total - payment.paid_amount).toFixed(2)}
Status: ${payment.payment_status.toUpperCase()}

━━━━━━━━━━━━━━━━━━━━
*Thank you for your payment!*

Generated on: ${new Date().toLocaleDateString('en-IN')}
    `.trim();

    return message;
  }

  // Export PDF receipt
  exportPDFReceipt(payment: PaymentEntry) {
    if (!this.selectedAccount) return;

    const account = this.selectedAccount;

    // Create a printable receipt HTML
    const receiptHTML = this.generateReceiptHTML(account, payment);

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(receiptHTML);
      printWindow.document.close();

      // Wait for content to load, then print
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  }

  // Generate receipt HTML for PDF
  generateReceiptHTML(account: AccountDetails, payment: PaymentEntry): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Payment Receipt - ${account.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 40px;
      background: #f5f5f5;
    }
    .receipt-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .receipt-header {
      text-align: center;
      border-bottom: 3px solid #667eea;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .receipt-header h1 {
      color: #667eea;
      font-size: 32px;
      margin-bottom: 10px;
    }
    .receipt-header p {
      color: #666;
      font-size: 16px;
    }
    .receipt-section {
      margin-bottom: 25px;
    }
    .receipt-section h2 {
      color: #333;
      font-size: 18px;
      margin-bottom: 15px;
      border-bottom: 2px solid #eee;
      padding-bottom: 8px;
    }
    .receipt-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .receipt-row:last-child {
      border-bottom: none;
    }
    .receipt-label {
      font-weight: 600;
      color: #555;
    }
    .receipt-value {
      color: #333;
      text-align: right;
    }
    .receipt-total {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      margin-top: 20px;
    }
    .receipt-total .receipt-row {
      border: none;
      font-size: 18px;
      font-weight: bold;
    }
    .status-badge {
      display: inline-block;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-paid { background: #d4edda; color: #155724; }
    .status-partial { background: #fff3cd; color: #856404; }
    .status-pending { background: #f8d7da; color: #721c24; }
    .receipt-footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #eee;
      text-align: center;
      color: #888;
      font-size: 14px;
    }
    @media print {
      body { background: white; padding: 0; }
      .receipt-container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="receipt-header">
      <h1>💰 PAYMENT RECEIPT</h1>
      <p>Official Payment Acknowledgement</p>
    </div>

    <div class="receipt-section">
      <h2>Account Information</h2>
      <div class="receipt-row">
        <span class="receipt-label">Account Name:</span>
        <span class="receipt-value">${account.name}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Account ID:</span>
        <span class="receipt-value">${account.account}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Mobile Number:</span>
        <span class="receipt-value">${account.mobile || 'N/A'}</span>
      </div>
    </div>

    <div class="receipt-section">
      <h2>Payment Details</h2>
      <div class="receipt-row">
        <span class="receipt-label">Due Number:</span>
        <span class="receipt-value">#${payment.due_no}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Due Date:</span>
        <span class="receipt-value">${payment.due_date}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Total Due Amount:</span>
        <span class="receipt-value">₹${payment.total.toFixed(2)}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Paid Amount:</span>
        <span class="receipt-value">₹${payment.paid_amount.toFixed(2)}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Balance Amount:</span>
        <span class="receipt-value">₹${(payment.total - payment.paid_amount).toFixed(2)}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Payment Status:</span>
        <span class="receipt-value">
          <span class="status-badge status-${payment.payment_status}">${payment.payment_status.toUpperCase()}</span>
        </span>
      </div>
    </div>

    <div class="receipt-total">
      <div class="receipt-row">
        <span class="receipt-label">Current Fund Balance:</span>
        <span class="receipt-value">₹${account.fund_amount.toFixed(2)}</span>
      </div>
    </div>

    <div class="receipt-footer">
      <p>Generated on: ${new Date().toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}</p>
      <p style="margin-top: 10px;">Thank you for your payment!</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }
}
