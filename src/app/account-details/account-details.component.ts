import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AccountDetails, AccountDetailsList, PaymentEntry } from '../models/account-details.model';
import { FirestoreService } from '../services/firestore.service';
import { AuthService } from '../services/auth.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-account-details',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './account-details.component.html',
  styleUrls: ['./account-details.component.css']
})
export class AccountDetailsComponent implements OnInit {
  accounts: AccountDetailsList = [];
  filteredAccounts: AccountDetailsList = [];
  loading: boolean = true;
  error: string | null = null;
  selectedAccount: AccountDetails | null = null;
  showPaymentDetails: boolean = false;
  showAddAccountForm: boolean = false;
  newAccountName: string = '';
  addingAccount: boolean = false;
  searchQuery: string = '';
  isEditingName: boolean = false;
  editedName: string = '';
  updatingName: boolean = false;
  isEditingMobile: boolean = false;
  editedMobile: string = '';
  updatingMobile: boolean = false;
  hasEditAccess: boolean = false;

  constructor(
    private firestoreService: FirestoreService,
    private authService: AuthService
  ) {
    this.hasEditAccess = this.authService.hasEditAccess();
  }

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

  searchAccounts() {
    const query = this.searchQuery.toLowerCase().trim();

    if (!query) {
      this.filteredAccounts = [...this.accounts];
      return;
    }

    this.filteredAccounts = this.accounts.filter(account =>
      account.account.toLowerCase().includes(query) ||
      account.name.toLowerCase().includes(query)
    );
  }

  clearSearch() {
    this.searchQuery = '';
    this.filteredAccounts = [...this.accounts];
  }

  // Export all accounts to JSON file
  exportAllAccountsJSON() {
    if (this.accounts.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No Accounts',
        text: 'No accounts to export',
        confirmButtonColor: '#2D5016'
      });
      return;
    }

    const exportData = {
      exportDate: new Date().toISOString(),
      totalAccounts: this.accounts.length,
      totalFundAmount: this.getTotalFundAmount(),
      totalLoanAmount: this.getTotalLoanAmount(),
      accounts: this.accounts
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    link.download = `FundIT_AllAccounts_${timestamp}.json`;
    link.click();
    window.URL.revokeObjectURL(url);

    Swal.fire({
      icon: 'success',
      title: 'Export Successful!',
      text: `Successfully exported ${this.accounts.length} accounts to JSON file!`,
      confirmButtonColor: '#28a745',
      timer: 3000,
      timerProgressBar: true
    });
  }

  // Import accounts from JSON file
  async importAccountsJSON(event: any) {
    if (!this.hasEditAccess) {
      await Swal.fire({
        icon: 'error',
        title: 'Access Denied',
        text: 'You do not have permission to import accounts',
        confirmButtonColor: '#dc3545'
      });
      event.target.value = '';
      return;
    }

    const file: File = event.target.files[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e: any) => {
      try {
        const jsonData = JSON.parse(e.target.result);

        // Validate JSON structure
        if (!jsonData.accounts || !Array.isArray(jsonData.accounts)) {
          await Swal.fire({
            icon: 'error',
            title: 'Invalid JSON Format',
            text: '"accounts" array is required in the JSON file',
            confirmButtonColor: '#dc3545'
          });
          event.target.value = '';
          return;
        }

        // Validate each account entry
        const invalidAccount = jsonData.accounts.find((acc: any) => !this.validateAccountEntry(acc));
        if (invalidAccount) {
          await Swal.fire({
            icon: 'error',
            title: 'Invalid Account Entry',
            text: 'Please check the JSON structure. One or more accounts have invalid data.',
            confirmButtonColor: '#dc3545'
          });
          event.target.value = '';
          return;
        }

        // Show confirmation
        const result = await Swal.fire({
          icon: 'warning',
          title: 'Import Accounts?',
          html: `
            <p>This will import <strong>${jsonData.accounts.length}</strong> accounts.</p>
            <p class="text-warning"><strong>Warning:</strong> This may overwrite existing accounts with the same account numbers.</p>
          `,
          showCancelButton: true,
          confirmButtonText: 'Yes, Import',
          cancelButtonText: 'Cancel',
          confirmButtonColor: '#28a745',
          cancelButtonColor: '#6c757d',
          reverseButtons: true
        });

        if (result.isConfirmed) {
          await this.importAccountsData(jsonData.accounts);
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

  // Validate account entry structure
  private validateAccountEntry(account: any): boolean {
    return (
      typeof account.account === 'string' &&
      typeof account.name === 'string' &&
      typeof account.fund_amount === 'number' &&
      typeof account.loan_amount === 'number' &&
      Array.isArray(account.due_payments) &&
      account.due_payments.every((payment: any) => this.validatePaymentEntry(payment))
    );
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

  // Import and save accounts data
  private async importAccountsData(accounts: AccountDetails[]) {
    try {
      this.loading = true;
      let importedCount = 0;
      let updatedCount = 0;

      for (const account of accounts) {
        // Check if account already exists
        const accountsData = await this.firestoreService.getAllDocuments('accountDetails');
        const existingAccount = accountsData.find((acc: any) => acc.account === account.account);

        if (existingAccount) {
          // Update existing account
          await this.firestoreService.updateDocument('accountDetails', existingAccount.id, account);
          updatedCount++;
        } else {
          // Add new account
          await this.firestoreService.addDocument('accountDetails', account);
          importedCount++;
        }
      }

      // Reload accounts
      await this.loadAccounts();

      await Swal.fire({
        icon: 'success',
        title: 'Import Completed!',
        html: `
          <p><strong>New accounts added:</strong> ${importedCount}</p>
          <p><strong>Existing accounts updated:</strong> ${updatedCount}</p>
          <p><strong>Total processed:</strong> ${accounts.length}</p>
        `,
        confirmButtonColor: '#28a745',
        confirmButtonText: 'Great!'
      });
    } catch (err: any) {
      console.error('Error importing accounts:', err);
      await Swal.fire({
        icon: 'error',
        title: 'Import Failed',
        text: `Failed to import accounts: ${err.message}`,
        confirmButtonColor: '#dc3545'
      });
    } finally {
      this.loading = false;
    }
  }

  viewAccountDetails(account: AccountDetails) {
    this.selectedAccount = account;
    this.isEditingMobile = false;
    this.editedMobile = '';
    this.showPaymentDetails = true;
    this.isEditingName = false;
    this.editedName = '';
  }

  closeDetails() {
    this.showPaymentDetails = false;
    this.isEditingMobile = false;
    this.editedMobile = '';
    this.selectedAccount = null;
    this.isEditingName = false;
    this.editedName = '';
  }

  startEditName() {
    if (!this.hasEditAccess) {
      Swal.fire({
        icon: 'error',
        title: 'Access Denied',
        text: 'You do not have permission to edit account details',
        confirmButtonColor: '#dc3545'
      });
      return;
    }

    if (this.selectedAccount) {
      this.isEditingName = true;
      this.editedName = this.selectedAccount.name;
    }
  }

  cancelEditName() {
    this.isEditingName = false;
    this.editedName = '';
  }

  startEditMobile() {
    if (!this.hasEditAccess) {
      Swal.fire({
        icon: 'error',
        title: 'Access Denied',
        text: 'You do not have permission to edit account details',
        confirmButtonColor: '#dc3545'
      });
      return;
    }

    if (this.selectedAccount) {
      this.isEditingMobile = true;
      this.editedMobile = this.selectedAccount.mobile || '';
    }
  }

  cancelEditMobile() {
    this.isEditingMobile = false;
    this.editedMobile = '';
  }

  async saveAccountMobile() {
    if (!this.selectedAccount) {
      await Swal.fire({
        icon: 'warning',
        title: 'No Account Selected',
        text: 'Please select an account first',
        confirmButtonColor: '#ffc107'
      });
      return;
    }

    if (!this.hasEditAccess) {
      await Swal.fire({
        icon: 'error',
        title: 'Access Denied',
        text: 'You do not have permission to edit account details',
        confirmButtonColor: '#dc3545'
      });
      return;
    }

    // Validate mobile number (10 digits)
    const mobilePattern = /^[0-9]{10}$/;
    if (this.editedMobile.trim() && !mobilePattern.test(this.editedMobile.trim())) {
      await Swal.fire({
        icon: 'warning',
        title: 'Invalid Mobile Number',
        text: 'Please enter a valid 10-digit mobile number',
        confirmButtonColor: '#ffc107'
      });
      return;
    }

    if (this.editedMobile.trim() === this.selectedAccount.mobile) {
      this.cancelEditMobile();
      return;
    }

    try {
      this.updatingMobile = true;

      // Find the document ID for this account
      const accountsData = await this.firestoreService.getAllDocuments('accountDetails');
      const accountDoc = accountsData.find((acc: any) => acc.account === this.selectedAccount!.account);

      if (accountDoc && accountDoc.id) {
        // Update the mobile in Firestore
        await this.firestoreService.updateDocument('accountDetails', accountDoc.id, {
          mobile: this.editedMobile.trim()
        });

        // Update local data
        this.selectedAccount.mobile = this.editedMobile.trim();
        const accountIndex = this.accounts.findIndex(acc => acc.account === this.selectedAccount!.account);
        if (accountIndex !== -1) {
          this.accounts[accountIndex].mobile = this.editedMobile.trim();
        }
        const filteredIndex = this.filteredAccounts.findIndex(acc => acc.account === this.selectedAccount!.account);
        if (filteredIndex !== -1) {
          this.filteredAccounts[filteredIndex].mobile = this.editedMobile.trim();
        }

        this.isEditingMobile = false;
        this.editedMobile = '';

        await Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Mobile number updated successfully!',
          confirmButtonColor: '#28a745',
          timer: 2000,
          timerProgressBar: true
        });
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Not Found',
          text: 'Account not found in database',
          confirmButtonColor: '#dc3545'
        });
      }
    } catch (error) {
      console.error('Error updating mobile number:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: 'Failed to update mobile number. Please try again.',
        confirmButtonColor: '#dc3545'
      });
    } finally {
      this.updatingMobile = false;
    }
  }

  async saveAccountName() {
    if (!this.hasEditAccess) {
      await Swal.fire({
        icon: 'error',
        title: 'Access Denied',
        text: 'You do not have permission to edit account details',
        confirmButtonColor: '#dc3545'
      });
      return;
    }

    if (!this.selectedAccount || !this.editedName.trim()) {
      await Swal.fire({
        icon: 'warning',
        title: 'Invalid Name',
        text: 'Please enter a valid name',
        confirmButtonColor: '#ffc107'
      });
      return;
    }

    if (this.editedName.trim() === this.selectedAccount.name) {
      this.cancelEditName();
      return;
    }

    try {
      this.updatingName = true;

      // Find the document ID for this account
      const accountsData = await this.firestoreService.getAllDocuments('accountDetails');
      const accountDoc = accountsData.find((acc: any) => acc.account === this.selectedAccount!.account);

      if (accountDoc && accountDoc.id) {
        // Update the name in Firestore
        await this.firestoreService.updateDocument('accountDetails', accountDoc.id, {
          name: this.editedName.trim()
        });

        // Update local data
        this.selectedAccount.name = this.editedName.trim();
        const accountIndex = this.accounts.findIndex(acc => acc.account === this.selectedAccount!.account);
        if (accountIndex !== -1) {
          this.accounts[accountIndex].name = this.editedName.trim();
        }
        const filteredIndex = this.filteredAccounts.findIndex(acc => acc.account === this.selectedAccount!.account);
        if (filteredIndex !== -1) {
          this.filteredAccounts[filteredIndex].name = this.editedName.trim();
        }

        this.isEditingName = false;
        this.editedName = '';

        await Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Account name updated successfully!',
          confirmButtonColor: '#28a745',
          timer: 2000,
          timerProgressBar: true
        });
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Not Found',
          text: 'Account not found in database',
          confirmButtonColor: '#dc3545'
        });
      }
    } catch (error) {
      console.error('Error updating account name:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: 'Failed to update account name. Please try again.',
        confirmButtonColor: '#dc3545'
      });
    } finally {
      this.updatingName = false;
    }
  }

  getTotalFundAmount(): number {
    return this.filteredAccounts.reduce((sum, account) => sum + account.fund_amount, 0);
  }

  getTotalLoanAmount(): number {
    return this.filteredAccounts.reduce((sum, account) => sum + account.loan_amount, 0);
  }

  getTotalAccounts(): number {
    return this.accounts.length;
  }

  getPendingPaymentsCount(account: AccountDetails): number {
    return account.due_payments.filter(p => p.payment_status === 'pending').length;
  }

  getPaidPaymentsCount(account: AccountDetails): number {
    return account.due_payments.filter(p => p.payment_status === 'paid').length;
  }

  getTotalDueAmount(account: AccountDetails): number {
    return account.due_payments.reduce((sum, payment) => sum + payment.due_amount, 0);
  }

  getTotalPaidAmount(account: AccountDetails): number {
    return account.due_payments.reduce((sum, payment) => sum + payment.paid_amount, 0);
  }

  getTotalBalanceAmount(account: AccountDetails): number {
    return account.due_payments.reduce((sum, payment) => sum + payment.balance_amount, 0);
  }

  getPaymentStatusClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      paid: 'status-paid',
      pending: 'status-pending',
      partial: 'status-partial',
      overdue: 'status-overdue'
    };
    return statusMap[status] || '';
  }

  openAddAccountForm() {
    this.showAddAccountForm = true;
    this.newAccountName = '';
  }

  closeAddAccountForm() {
    this.showAddAccountForm = false;
    this.newAccountName = '';
  }

  async getNextAccountNumber(): Promise<string> {
    try {
      const accountsData = await this.firestoreService.getAllDocuments('accountDetails');

      if (!accountsData || accountsData.length === 0) {
        return 'AZH-001';
      }

      const accountNumbers = accountsData.map((acc: any) => {
        const match = acc.account.match(/AZH-(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      });

      const maxNumber = Math.max(...accountNumbers);
      const nextNumber = maxNumber + 1;

      return `AZH-${nextNumber.toString().padStart(3, '0')}`;
    } catch (error) {
      console.error('Error getting next account number:', error);
      throw error;
    }
  }

  generateDuePayments(): PaymentEntry[] {
    const duePayments: PaymentEntry[] = [];
    const startDate = new Date();

    for (let i = 1; i <= 24; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      const formattedDate = dueDate.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

      duePayments.push({
        due_no: i,
        due_date: formattedDate,
        due_amount: 0,
        loan_interest: 0,
        total: 0,
        paid_amount: 0,
        balance_amount: 0,
        payment_status: 'pending'
      });
    }

    return duePayments;
  }

  async addNewAccount() {
    if (!this.newAccountName.trim()) {
      await Swal.fire({
        icon: 'warning',
        title: 'Missing Information',
        text: 'Please enter account holder name',
        confirmButtonColor: '#ffc107'
      });
      return;
    }

    try {
      this.addingAccount = true;

      const nextAccountNumber = await this.getNextAccountNumber();

      const newAccount: AccountDetails = {
        account: nextAccountNumber,
        name: this.newAccountName.trim(),
        mobile: '',
        fund_amount: 0,
        loan_amount: 0,
        due_payments: this.generateDuePayments()
      };

      await this.firestoreService.addDocument('accountDetails', newAccount);
      await this.loadAccounts();

      this.closeAddAccountForm();

      await Swal.fire({
        icon: 'success',
        title: 'Account Created!',
        html: `
          <p>Account <strong>${nextAccountNumber}</strong></p>
          <p>successfully created for</p>
          <p><strong>${this.newAccountName}</strong></p>
        `,
        confirmButtonColor: '#28a745',
        timer: 3000,
        timerProgressBar: true
      });
    } catch (error) {
      console.error('Error adding new account:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Creation Failed',
        text: 'Failed to add new account. Please try again.',
        confirmButtonColor: '#dc3545'
      });
    } finally {
      this.addingAccount = false;
    }
  }

  generatePaymentReceipt(payment: PaymentEntry, account: AccountDetails) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // App Theme Colors
    const PRIMARY_BLUE = [52, 152, 219] as [number, number, number];
    const DARK_BLUE = [52, 73, 94] as [number, number, number];
    const SUCCESS_GREEN = [40, 167, 69] as [number, number, number];
    const LIGHT_GRAY = [248, 249, 250] as [number, number, number];
    const DARK_TEXT = [44, 62, 80] as [number, number, number];

    // Helper function to format currency
    const formatCurrency = (amount: number): string => {
      return 'Rs ' + amount.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    };

    // ============ MODERN HEADER ============
    doc.setFillColor(...PRIMARY_BLUE);
    doc.rect(0, 0, pageWidth, 50, 'F');

    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, pageWidth, 3, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT RECEIPT', pageWidth / 2, 18, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('FUND IT - Fund Management System', pageWidth / 2, 28, { align: 'center' });

    // Receipt Number in header
    const receiptNo = `RCP-${account.account}-${payment.due_no.toString().padStart(3, '0')}`;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Receipt No: ${receiptNo}`, pageWidth / 2, 38, { align: 'center' });

    // ============ DATE SECTION ============
    let yPos = 60;
    const todayDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(108, 117, 125);
    doc.text('Receipt Date:', 15, yPos);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK_TEXT);
    doc.text(todayDate, 45, yPos);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(108, 117, 125);
    doc.text('Payment Status:', pageWidth - 60, yPos);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...SUCCESS_GREEN);
    doc.text(payment.payment_status.toUpperCase(), pageWidth - 25, yPos);

    // ============ ACCOUNT DETAILS CARD ============
    yPos = 70;

    doc.setFillColor(...LIGHT_GRAY);
    doc.roundedRect(15, yPos, pageWidth - 30, 30, 3, 3, 'F');

    doc.setFillColor(...PRIMARY_BLUE);
    doc.rect(15, yPos, 4, 30, 'F');

    yPos += 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK_TEXT);
    doc.text('Account Information', 25, yPos);

    yPos += 7;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(108, 117, 125);
    doc.text('Account Number:', 25, yPos);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK_TEXT);
    doc.text(account.account, 60, yPos);

    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(108, 117, 125);
    doc.text('Account Holder:', 25, yPos);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK_TEXT);
    doc.text(account.name, 60, yPos);

    // ============ PAYMENT DETAILS SECTION ============
    yPos = 113;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK_BLUE);
    doc.text('Payment Details', 15, yPos);

    doc.setDrawColor(...PRIMARY_BLUE);
    doc.setLineWidth(0.8);
    doc.line(15, yPos + 2, 60, yPos + 2);

    // Payment details table
    const paymentDetails = [
      ['Installment Number', `#${payment.due_no} of 24`],
      ['Due Date', payment.due_date],
      ['Principal Amount', formatCurrency(payment.due_amount)],
      ['Interest Amount', formatCurrency(payment.loan_interest)],
      ['Total Due Amount', formatCurrency(payment.total)]
    ];

    autoTable(doc, {
      startY: yPos + 8,
      head: [['Description', 'Details']],
      body: paymentDetails,
      theme: 'plain',
      headStyles: {
        fillColor: DARK_BLUE,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'left',
        cellPadding: 3
      },
      bodyStyles: {
        fontSize: 9,
        textColor: DARK_TEXT,
        cellPadding: 2.5
      },
      columnStyles: {
        0: {
          cellWidth: 80,
          fontStyle: 'normal',
          textColor: [108, 117, 125]
        },
        1: {
          cellWidth: 100,
          halign: 'right',
          fontStyle: 'bold',
          textColor: DARK_TEXT
        }
      },
      margin: { left: 15, right: 15 },
      tableLineColor: [222, 226, 230],
      tableLineWidth: 0.5
    });

    // ============ PAYMENT STATUS SECTION ============
    yPos = (doc as any).lastAutoTable.finalY + 12;

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK_BLUE);
    doc.text('Payment Status', 15, yPos);

    doc.setDrawColor(...PRIMARY_BLUE);
    doc.setLineWidth(0.8);
    doc.line(15, yPos + 2, 58, yPos + 2);

    // Payment status details box
    yPos += 10;
    doc.setFillColor(...LIGHT_GRAY);
    doc.roundedRect(15, yPos, pageWidth - 30, 35, 3, 3, 'F');

    doc.setFillColor(...SUCCESS_GREEN);
    doc.rect(15, yPos, 4, 35, 'F');

    yPos += 10;

    // Amount Paid
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(108, 117, 125);
    doc.text('Amount Paid:', 25, yPos);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...SUCCESS_GREEN);
    doc.setFontSize(11);
    doc.text(formatCurrency(payment.paid_amount), pageWidth - 25, yPos, { align: 'right' });

    yPos += 8;

    // Balance Amount
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(108, 117, 125);
    doc.text('Balance Amount:', 25, yPos);
    doc.setFont('helvetica', 'bold');
    const balanceColor = payment.balance_amount > 0 ? [255, 152, 0] : SUCCESS_GREEN;
    doc.setTextColor(...balanceColor as [number, number, number]);
    doc.setFontSize(11);
    doc.text(formatCurrency(payment.balance_amount), pageWidth - 25, yPos, { align: 'right' });

    yPos += 8;

    // Payment Status
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(108, 117, 125);
    doc.text('Status:', 25, yPos);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...SUCCESS_GREEN);
    doc.setFontSize(10);
    doc.text(payment.payment_status.toUpperCase(), pageWidth - 25, yPos, { align: 'right' });

    // Success message
    yPos += 15;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(108, 117, 125);
    doc.text('Payment received and processed successfully.', pageWidth / 2, yPos, { align: 'center' });

    // ============ FOOTER ============
    const footerY = pageHeight - 25;

    doc.setDrawColor(...PRIMARY_BLUE);
    doc.setLineWidth(0.5);
    doc.line(15, footerY - 5, pageWidth - 15, footerY - 5);

    doc.setFillColor(...LIGHT_GRAY);
    doc.rect(0, footerY - 3, pageWidth, 28, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK_BLUE);
    doc.text('FUND IT', pageWidth / 2, footerY + 2, { align: 'center' });

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(108, 117, 125);
    doc.text('Email: ramsatt@gmail.com  |  Phone: +91-8973576694', pageWidth / 2, footerY + 7, { align: 'center' });

    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    doc.text('This is a computer-generated receipt. No signature is required.', pageWidth / 2, footerY + 12, { align: 'center' });
    doc.text('Thank you for your payment!', pageWidth / 2, footerY + 16, { align: 'center' });

    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const fileName = `Receipt_${account.account}_Due${payment.due_no}_${timestamp}.pdf`;
    doc.save(fileName);
  }

  async sendReportToWhatsApp() {
    if (this.filteredAccounts.length === 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'No Data',
        text: 'No account data available to send',
        confirmButtonColor: '#667eea'
      });
      return;
    }

    // Create summary message
    const message = this.generateWhatsAppMessage();

    // WhatsApp number (India format)
    const phoneNumber = '917200005070'; // +91 7200005070

    // Encode message for URL
    const encodedMessage = encodeURIComponent(message);

    // Use api.whatsapp.com which works on both mobile and desktop
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodedMessage}`;

    // Show confirmation dialog
    const result = await Swal.fire({
      title: 'Send Report via WhatsApp',
      html: `
        <div style="text-align: left; padding: 10px;">
          <p><strong>Recipient:</strong> +91 7200005070</p>
          <p><strong>Total Accounts:</strong> ${this.filteredAccounts.length}</p>
          <p><strong>Total Fund:</strong> ₹${this.getTotalFundAmount().toLocaleString('en-IN')}</p>
          <p><strong>Total Loan:</strong> ₹${this.getTotalLoanAmount().toLocaleString('en-IN')}</p>
          <br>
          <p style="font-size: 13px; color: #666;">
            <i class="fa fa-info-circle"></i> This will open WhatsApp with a pre-filled message.
            You can review and edit before sending.
          </p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#25D366',
      cancelButtonColor: '#718096',
      confirmButtonText: '<i class="fab fa-whatsapp"></i> Open WhatsApp',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      // Open WhatsApp - will open app on mobile, web on desktop
      window.open(whatsappUrl, '_blank');

      await Swal.fire({
        icon: 'success',
        title: 'WhatsApp Opened!',
        text: 'Please review and send the message from WhatsApp',
        confirmButtonColor: '#25D366',
        timer: 3000,
        timerProgressBar: true
      });
    }
  }

  generateWhatsAppMessage(): string {
    const today = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    let message = `📊 *FUND IT - Account Details Report*\n`;
    message += `📅 Date: ${today}\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    message += `📈 *SUMMARY*\n`;
    message += `Total Accounts: ${this.filteredAccounts.length}\n`;
    message += `Total Fund Amount: ₹${this.getTotalFundAmount().toLocaleString('en-IN')}\n`;
    message += `Total Loan Amount: ₹${this.getTotalLoanAmount().toLocaleString('en-IN')}\n\n`;

    message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `👥 *ACCOUNT DETAILS*\n\n`;

    this.filteredAccounts.forEach((account, index) => {
      const pendingCount = this.getPendingPaymentsCount(account);
      const paidCount = this.getPaidPaymentsCount(account);

      message += `${index + 1}. *${account.account}*\n`;
      message += `   Name: ${account.name}\n`;
      message += `   Fund: ₹${account.fund_amount.toLocaleString('en-IN')}\n`;
      message += `   Loan: ₹${account.loan_amount.toLocaleString('en-IN')}\n`;
      message += `   Payments: ${paidCount} paid, ${pendingCount} pending\n\n`;
    });

    message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `Generated by FUND IT System\n`;
    message += `📧 ramsatt@gmail.com\n`;
    message += `📱 +91-8973576694`;

    return message;
  }

  async sendPaymentReminderWhatsApp(payment: PaymentEntry, account: AccountDetails) {
    if (!account.mobile) {
      await Swal.fire({
        icon: 'warning',
        title: 'No Mobile Number',
        text: 'This account does not have a mobile number. Please add one first.',
        confirmButtonColor: '#667eea'
      });
      return;
    }

    // Generate reminder message
    const message = this.generatePaymentReminderMessage(payment, account);

    // Format mobile number for WhatsApp (remove leading 0 if present, add 91 country code)
    let mobileNumber = account.mobile;
    if (mobileNumber.startsWith('0')) {
      mobileNumber = mobileNumber.substring(1);
    }
    const whatsappNumber = `91${mobileNumber}`;

    // Encode message for URL
    const encodedMessage = encodeURIComponent(message);

    // Use api.whatsapp.com which works on both mobile and desktop
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${encodedMessage}`;

    // Show confirmation dialog
    const result = await Swal.fire({
      title: 'Send Payment Reminder',
      html: `
        <div style="text-align: left; padding: 10px;">
          <p><strong>Account:</strong> ${account.account}</p>
          <p><strong>Name:</strong> ${account.name}</p>
          <p><strong>Mobile:</strong> +91 ${account.mobile}</p>
          <p><strong>Due No:</strong> ${payment.due_no}</p>
          <p><strong>Due Date:</strong> ${payment.due_date}</p>
          <p><strong>Amount Due:</strong> ₹${payment.balance_amount.toLocaleString('en-IN')}</p>
          <br>
          <p style="font-size: 13px; color: #666;">
            <i class="fa fa-info-circle"></i> This will open WhatsApp with a pre-filled reminder message.
          </p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#25D366',
      cancelButtonColor: '#718096',
      confirmButtonText: '📱 Send Reminder',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      // Open WhatsApp - will open app on mobile, web on desktop
      window.open(whatsappUrl, '_blank');

      await Swal.fire({
        icon: 'success',
        title: 'WhatsApp Opened!',
        text: 'Please send the reminder message from WhatsApp',
        confirmButtonColor: '#25D366',
        timer: 3000,
        timerProgressBar: true
      });
    }
  }

  generatePaymentReminderMessage(payment: PaymentEntry, account: AccountDetails): string {
    const today = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    let message = `🔔 *AZHISUKKUDI Amavasai FUND (2025 - 2027) - PAYMENT REMINDER*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    message += `Dear *${account.name}*,\n\n`;
    message += `This is a friendly reminder for your upcoming payment:\n\n`;

    message += `📋 *Payment Details*\n`;
    message += `Account: *${account.account}*\n`;
    message += `Due No: *${payment.due_no} of 24*\n`;
    message += `Due Date: *${payment.due_date}*\n\n`;

    message += `💰 *Amount Breakdown*\n`;
    message += `Principal Amount: ₹${payment.due_amount.toLocaleString('en-IN')}\n`;
    message += `Interest Amount: ₹${payment.loan_interest.toLocaleString('en-IN')}\n`;
    message += `Total Payable: *₹${payment.total.toLocaleString('en-IN')}*\n`;

    if (payment.paid_amount > 0) {
      message += `\nAmount Paid: ₹${payment.paid_amount.toLocaleString('en-IN')}\n`;
      message += `Balance Due: *₹${payment.balance_amount.toLocaleString('en-IN')}*\n`;
    }

    message += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `Please make the payment at your earliest convenience.\n\n`;

    message += `For any queries, please contact:\n`;
    message += `📧 ramsatt@gmail.com\n`;
    message += `📱 +91-8973576694\n\n`;

    message += `Thank you!\n`;
    message += `*Admin - Azhisukudi Amavasi Fund*`;

    return message;
  }

  async sendPaymentReceiptWhatsApp(payment: PaymentEntry, account: AccountDetails) {
    if (!account.mobile) {
      await Swal.fire({
        icon: 'warning',
        title: 'No Mobile Number',
        text: 'This account does not have a mobile number. Please add one first.',
        confirmButtonColor: '#667eea'
      });
      return;
    }

    // Show initial confirmation with PDF generation option
    const result = await Swal.fire({
      title: 'Send Payment Receipt',
      html: `
        <div style="text-align: left; padding: 10px;">
          <p><strong>Account:</strong> ${account.account}</p>
          <p><strong>Name:</strong> ${account.name}</p>
          <p><strong>Mobile:</strong> +91 ${account.mobile}</p>
          <p><strong>Due No:</strong> ${payment.due_no}</p>
          <p><strong>Amount Paid:</strong> ₹${payment.paid_amount.toLocaleString('en-IN')}</p>
          <p><strong>Payment Status:</strong> ${payment.payment_status.toUpperCase()}</p>
          <br>
          <p style="font-size: 13px; color: #666; margin-bottom: 8px;">
            <i class="fa fa-info-circle"></i> Choose how to send the receipt:
          </p>
          <div style="background: #f8f9fa; padding: 10px; border-radius: 5px; font-size: 12px;">
            <p style="margin: 5px 0;"><strong>📱 Text Only:</strong> Send receipt details as text message</p>
            <p style="margin: 5px 0;"><strong>📄 With PDF:</strong> Download PDF + Open WhatsApp (you can attach the PDF manually)</p>
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonColor: '#25D366',
      denyButtonColor: '#0088cc',
      cancelButtonColor: '#718096',
      confirmButtonText: '<i class="fas fa-comment"></i> Text Only',
      denyButtonText: '<i class="fas fa-file-pdf"></i> With PDF',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed || result.isDenied) {
      // Generate receipt message
      const message = this.generatePaymentReceiptMessage(payment, account);

      // Format mobile number for WhatsApp
      let mobileNumber = account.mobile;
      if (mobileNumber.startsWith('0')) {
        mobileNumber = mobileNumber.substring(1);
      }
      const whatsappNumber = `91${mobileNumber}`;

      // Encode message for URL
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${encodedMessage}`;

      // If user chose PDF option, generate and download PDF first
      if (result.isDenied) {
        try {
          // Generate the PDF receipt
          this.generatePaymentReceipt(payment, account);

          // Wait a moment for download to start
          await new Promise(resolve => setTimeout(resolve, 500));

          // Show instructions
          await Swal.fire({
            icon: 'info',
            title: 'PDF Downloaded!',
            html: `
              <div style="text-align: left; padding: 10px;">
                <p style="margin-bottom: 15px;">✅ PDF receipt has been downloaded to your device.</p>
                <p style="margin-bottom: 10px;"><strong>Next Steps:</strong></p>
                <ol style="text-align: left; padding-left: 20px; line-height: 1.8;">
                  <li>Click 'Open WhatsApp' below</li>
                  <li>In WhatsApp, click the <strong>📎 attachment icon</strong></li>
                  <li>Select <strong>Document</strong></li>
                  <li>Choose the downloaded PDF receipt</li>
                  <li>Add the pre-filled message and send</li>
                </ol>
                <p style="margin-top: 15px; font-size: 12px; color: #666;">
                  <i class="fa fa-info-circle"></i> The PDF is saved in your Downloads folder
                </p>
              </div>
            `,
            confirmButtonColor: '#25D366',
            confirmButtonText: '<i class="fab fa-whatsapp"></i> Open WhatsApp',
            showCancelButton: true,
            cancelButtonText: 'Close'
          }).then((instructionResult) => {
            if (instructionResult.isConfirmed) {
              window.open(whatsappUrl, '_blank');
            }
          });
        } catch (error) {
          console.error('Error generating PDF:', error);
          await Swal.fire({
            icon: 'error',
            title: 'PDF Generation Failed',
            text: 'Could not generate PDF. Opening WhatsApp with text message only.',
            confirmButtonColor: '#25D366'
          });
          window.open(whatsappUrl, '_blank');
        }
      } else {
        // Text only - just open WhatsApp
        window.open(whatsappUrl, '_blank');

        await Swal.fire({
          icon: 'success',
          title: 'WhatsApp Opened!',
          text: 'Please review and send the receipt message',
          confirmButtonColor: '#25D366',
          timer: 3000,
          timerProgressBar: true
        });
      }
    }
  }

  generatePaymentReceiptMessage(payment: PaymentEntry, account: AccountDetails): string {
    const today = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const receiptNo = `RCP-${account.account}-${payment.due_no.toString().padStart(3, '0')}`;

    let message = `🧾 *PAYMENT RECEIPT*\n`;
    message += `*AZHISUKKUDI Amavasai FUND (2025 - 2027)*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    message += `Receipt No: *${receiptNo}*\n`;
    message += `Date: ${today}\n\n`;

    message += `👤 *Account Information*\n`;
    message += `Account: *${account.account}*\n`;
    message += `Name: *${account.name}*\n\n`;

    message += `📋 *Payment Details*\n`;
    message += `Installment: *${payment.due_no} of 24*\n`;
    message += `Due Date: ${payment.due_date}\n\n`;

    message += `💰 *Amount Details*\n`;
    message += `Principal Amount: ₹${payment.due_amount.toLocaleString('en-IN')}\n`;
    message += `Interest Amount: ₹${payment.loan_interest.toLocaleString('en-IN')}\n`;
    message += `Total Due: ₹${payment.total.toLocaleString('en-IN')}\n\n`;

    message += `✅ *Payment Status*\n`;
    message += `Amount Paid: *₹${payment.paid_amount.toLocaleString('en-IN')}*\n`;
    message += `Balance Amount: ₹${payment.balance_amount.toLocaleString('en-IN')}\n`;
    message += `Status: *${payment.payment_status.toUpperCase()}*\n\n`;

    if (payment.payment_status === 'paid') {
      message += `✨ Payment received and processed successfully!\n\n`;
    } else if (payment.payment_status === 'partial') {
      message += `⚠️ Partial payment received. Balance remaining: ₹${payment.balance_amount.toLocaleString('en-IN')}\n\n`;
    }

    message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `Thank you for your payment!\n\n`;

    message += `*AZHISUKKUDI Amavasai FUND*\n`;
    message += `📧 ramsatt@gmail.com\n`;
    message += `📱 +91-8973576694\n\n`;

    message += `_This is a computer-generated receipt._`;

    return message;
  }

  exportAllAccountsToPDF() {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // App Theme Colors
    const PRIMARY_BLUE = [52, 152, 219] as [number, number, number];
    const DARK_BLUE = [52, 73, 94] as [number, number, number];
    const SUCCESS_GREEN = [40, 167, 69] as [number, number, number];
    const LIGHT_GRAY = [248, 249, 250] as [number, number, number];
    const DARK_TEXT = [44, 62, 80] as [number, number, number];

    // Helper function to format currency
    const formatCurrency = (amount: number): string => {
      return 'Rs ' + amount.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    };

    // ============ MODERN HEADER ============
    doc.setFillColor(...PRIMARY_BLUE);
    doc.rect(0, 0, pageWidth, 45, 'F');

    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, pageWidth, 3, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('FUND IT', 15, 18);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('All Accounts Report', 15, 28);

    const todayDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Generated On:', pageWidth - 65, 18, { align: 'left' });
    doc.setFont('helvetica', 'normal');
    doc.text(todayDate, pageWidth - 65, 24, { align: 'left' });

    // ============ SUMMARY SECTION ============
    let yPos = 55;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK_TEXT);
    doc.text('Summary', 15, yPos);

    doc.setDrawColor(...PRIMARY_BLUE);
    doc.setLineWidth(0.8);
    doc.line(15, yPos + 2, 40, yPos + 2);

    yPos += 8;
    doc.setFillColor(...LIGHT_GRAY);
    doc.roundedRect(15, yPos, pageWidth - 30, 20, 3, 3, 'F');

    doc.setFillColor(...PRIMARY_BLUE);
    doc.rect(15, yPos, 4, 20, 'F');

    yPos += 8;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(108, 117, 125);
    doc.text('Total Accounts:', 25, yPos);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK_TEXT);
    doc.text(this.getTotalAccounts().toString(), 60, yPos);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(108, 117, 125);
    doc.text('Total Fund Amount:', pageWidth / 2 - 10, yPos);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...SUCCESS_GREEN);
    doc.text(formatCurrency(this.getTotalFundAmount()), pageWidth / 2 + 30, yPos);

    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(108, 117, 125);
    doc.text('Total Loan Amount:', pageWidth / 2 - 10, yPos);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 152, 0);
    doc.text(formatCurrency(this.getTotalLoanAmount()), pageWidth / 2 + 30, yPos);

    // ============ ACCOUNTS TABLE ============
    yPos += 15;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK_TEXT);
    doc.text('All Accounts', 15, yPos);

    doc.setDrawColor(...PRIMARY_BLUE);
    doc.setLineWidth(0.8);
    doc.line(15, yPos + 2, 50, yPos + 2);

    // Prepare table data
    const tableData = this.filteredAccounts.map(account => [
      account.account,
      account.name,
      formatCurrency(account.fund_amount),
      formatCurrency(account.loan_amount),
      this.getPendingPaymentsCount(account).toString(),
      this.getPaidPaymentsCount(account).toString()
    ]);

    autoTable(doc, {
      startY: yPos + 8,
      head: [['Account ID', 'Name', 'Fund Amount', 'Loan Amount', 'Pending', 'Paid']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: DARK_BLUE,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center',
        cellPadding: 3
      },
      bodyStyles: {
        fontSize: 8,
        textColor: DARK_TEXT,
        cellPadding: 2.5
      },
      columnStyles: {
        0: { cellWidth: 25, halign: 'left', fontStyle: 'bold' },
        1: { cellWidth: 45, halign: 'left' },
        2: { cellWidth: 30, halign: 'right', textColor: SUCCESS_GREEN },
        3: { cellWidth: 30, halign: 'right', textColor: [255, 152, 0] as [number, number, number] },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 20, halign: 'center' }
      },
      alternateRowStyles: {
        fillColor: LIGHT_GRAY
      },
      margin: { left: 15, right: 15 },
      tableLineColor: [222, 226, 230],
      tableLineWidth: 0.3
    });

    // ============ FOOTER ============
    const footerY = pageHeight - 20;

    doc.setDrawColor(...PRIMARY_BLUE);
    doc.setLineWidth(0.5);
    doc.line(15, footerY - 5, pageWidth - 15, footerY - 5);

    doc.setFillColor(...LIGHT_GRAY);
    doc.rect(0, footerY - 3, pageWidth, 23, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK_BLUE);
    doc.text('FUND IT', pageWidth / 2, footerY + 2, { align: 'center' });

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(108, 117, 125);
    doc.text('Fund Management System', pageWidth / 2, footerY + 7, { align: 'center' });

    doc.setFontSize(7);
    doc.text('Email: ramsatt@gmail.com  |  Phone: +91-8973576694', pageWidth / 2, footerY + 12, { align: 'center' });

    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    doc.text('This is a computer-generated report. No signature is required.', pageWidth / 2, footerY + 16, { align: 'center' });

    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const fileName = `FundIT_AllAccounts_${timestamp}.pdf`;
    doc.save(fileName);
  }

  exportAccountToPDF(account: AccountDetails) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // App Theme Colors - matching your application
    const PRIMARY_BLUE = [52, 152, 219] as [number, number, number]; // #3498db
    const DARK_BLUE = [52, 73, 94] as [number, number, number]; // #34495e
    const SUCCESS_GREEN = [40, 167, 69] as [number, number, number]; // #28a745
    const WARNING_ORANGE = [255, 152, 0] as [number, number, number];
    const LIGHT_GRAY = [248, 249, 250] as [number, number, number];
    const DARK_TEXT = [44, 62, 80] as [number, number, number]; // #2c3e50

    // Helper function to format currency
    const formatCurrency = (amount: number): string => {
      return 'Rs ' + amount.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    };

    // ============ MODERN HEADER ============
    doc.setFillColor(...PRIMARY_BLUE);
    doc.rect(0, 0, pageWidth, 50, 'F');

    // Top accent bar
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, pageWidth, 3, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('FUND IT', 15, 22);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Account Statement Report', 15, 32);

    // Date badge
    const todayDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Generated On:', pageWidth - 65, 22, { align: 'left' });
    doc.setFont('helvetica', 'normal');
    doc.text(todayDate, pageWidth - 65, 28, { align: 'left' });

    // ============ ACCOUNT INFORMATION CARD ============
    let yPos = 60;

    // Card background with shadow effect
    doc.setFillColor(...LIGHT_GRAY);
    doc.roundedRect(15, yPos, pageWidth - 30, 38, 3, 3, 'F');

    // Left accent border
    doc.setFillColor(...PRIMARY_BLUE);
    doc.rect(15, yPos, 4, 38, 'F');

    yPos += 10;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK_TEXT);
    doc.text('Account Information', 25, yPos);

    yPos += 8;
    const labelX = 25;
    const valueX = 65;

    // Account Number
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(108, 117, 125);
    doc.text('Account Number:', labelX, yPos);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK_TEXT);
    doc.setFontSize(10);
    doc.text(account.account, valueX, yPos);

    // Account Holder
    yPos += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(108, 117, 125);
    doc.text('Account Holder:', labelX, yPos);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK_TEXT);
    doc.setFontSize(10);
    doc.text(account.name, valueX, yPos);

    // Financial Info on the right side
    const rightX = pageWidth - 80;
    yPos = 78;

    // Fund Amount
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(108, 117, 125);
    doc.text('Fund Amount:', rightX, yPos);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...SUCCESS_GREEN);
    doc.setFontSize(10);
    doc.text(formatCurrency(account.fund_amount), rightX + 30, yPos);

    // Loan Amount
    yPos += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(108, 117, 125);
    doc.text('Loan Amount:', rightX, yPos);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WARNING_ORANGE);
    doc.setFontSize(10);
    doc.text(formatCurrency(account.loan_amount), rightX + 30, yPos);

    // ============ PAYMENT SUMMARY SECTION ============
    yPos = 108;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK_BLUE);
    doc.text('Payment Summary', 15, yPos);

    // Underline accent
    doc.setDrawColor(...PRIMARY_BLUE);
    doc.setLineWidth(0.8);
    doc.line(15, yPos + 2, 70, yPos + 2);

    const totalDue = this.getTotalDueAmount(account);
    const totalPaid = this.getTotalPaidAmount(account);
    const totalBalance = this.getTotalBalanceAmount(account);
    const pendingCount = this.getPendingPaymentsCount(account);
    const paidCount = this.getPaidPaymentsCount(account);

    const summaryData = [
      ['Total Installments', '24 Months'],
      ['Completed Payments', `${paidCount} Installments`],
      ['Pending Payments', `${pendingCount} Installments`],
      ['Total Due Amount', formatCurrency(totalDue)],
      ['Total Amount Paid', formatCurrency(totalPaid)],
      ['Total Balance', formatCurrency(totalBalance)]
    ];

    autoTable(doc, {
      startY: yPos + 8,
      head: [['Description', 'Value']],
      body: summaryData,
      theme: 'grid',
      headStyles: {
        fillColor: DARK_BLUE,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'left',
        cellPadding: 4
      },
      bodyStyles: {
        fontSize: 9,
        textColor: DARK_TEXT,
        cellPadding: 3.5
      },
      columnStyles: {
        0: {
          cellWidth: 100,
          fontStyle: 'normal',
          textColor: [108, 117, 125]
        },
        1: {
          cellWidth: 80,
          halign: 'right',
          fontStyle: 'bold',
          textColor: DARK_TEXT
        }
      },
      alternateRowStyles: {
        fillColor: LIGHT_GRAY
      },
      margin: { left: 15, right: 15 },
      tableLineColor: [222, 226, 230],
      tableLineWidth: 0.3
    });

    // ============ PAYMENT SCHEDULE SECTION ============
    yPos = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK_BLUE);
    doc.text('Payment Schedule', 15, yPos);

    // Underline accent
    doc.setDrawColor(...PRIMARY_BLUE);
    doc.setLineWidth(0.8);
    doc.line(15, yPos + 2, 70, yPos + 2);

    const scheduleData = account.due_payments.map(p => [
      p.due_no.toString(),
      p.due_date,
      formatCurrency(p.due_amount).replace('Rs ', ''),
      formatCurrency(p.loan_interest).replace('Rs ', ''),
      formatCurrency(p.total).replace('Rs ', ''),
      formatCurrency(p.paid_amount).replace('Rs ', ''),
      formatCurrency(p.balance_amount).replace('Rs ', ''),
      p.payment_status.toUpperCase()
    ]);

    autoTable(doc, {
      startY: yPos + 8,
      head: [['No.', 'Due Date', 'Principal', 'Interest', 'Total', 'Paid', 'Balance', 'Status']],
      body: scheduleData,
      theme: 'grid',
      headStyles: {
        fillColor: DARK_BLUE,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
        cellPadding: 3
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: DARK_TEXT,
        cellPadding: 2.5
      },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 24, halign: 'center', fontSize: 7 },
        2: { cellWidth: 24, halign: 'right' },
        3: { cellWidth: 24, halign: 'right' },
        4: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
        5: { cellWidth: 24, halign: 'right' },
        6: { cellWidth: 24, halign: 'right' },
        7: { cellWidth: 24, halign: 'center', fontSize: 7, fontStyle: 'bold' }
      },
      alternateRowStyles: {
        fillColor: LIGHT_GRAY
      },
      margin: { left: 15, right: 15 },
      tableLineColor: [222, 226, 230],
      tableLineWidth: 0.3,
      tableWidth: 'auto',
      didParseCell: function(data: any) {
        if (data.column.index === 7 && data.section === 'body') {
          const status = data.cell.raw.toLowerCase();
          if (status === 'paid') {
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fillColor = [40, 167, 69];
            data.cell.styles.fontStyle = 'bold';
          } else if (status === 'pending') {
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fillColor = [255, 152, 0];
            data.cell.styles.fontStyle = 'bold';
          } else if (status === 'partial') {
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fillColor = [52, 152, 219];
            data.cell.styles.fontStyle = 'bold';
          } else if (status === 'overdue') {
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fillColor = [220, 53, 69];
            data.cell.styles.fontStyle = 'bold';
          }
        }

        // Highlight Total column
        if (data.column.index === 4 && data.section === 'body') {
          data.cell.styles.textColor = PRIMARY_BLUE;
        }
      }
    });

    // ============ MODERN FOOTER ============
    const footerY = pageHeight - 20;

    // Footer separator line
    doc.setDrawColor(...PRIMARY_BLUE);
    doc.setLineWidth(0.5);
    doc.line(15, footerY - 5, pageWidth - 15, footerY - 5);

    // Footer background
    doc.setFillColor(...LIGHT_GRAY);
    doc.rect(0, footerY - 3, pageWidth, 23, 'F');

    // Company name
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK_BLUE);
    doc.text('FUND IT', pageWidth / 2, footerY + 2, { align: 'center' });

    // Tagline
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(108, 117, 125);
    doc.text('Fund Management System', pageWidth / 2, footerY + 7, { align: 'center' });

    // Contact info
    doc.setFontSize(7);
    doc.text('Email: ramsatt@gmail.com  |  Phone: +91-8973576694', pageWidth / 2, footerY + 12, { align: 'center' });

    // Disclaimer
    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    doc.text('This is a computer-generated document. No signature is required.', pageWidth / 2, footerY + 16, { align: 'center' });

    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const fileName = `FundIT_Statement_${account.account}_${timestamp}.pdf`;
    doc.save(fileName);
  }
}

