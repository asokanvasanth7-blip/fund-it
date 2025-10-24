
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirestoreService } from '../services/firestore.service';
import { PaymentEntry } from '../models/account-details.model';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DueReportEntry {
  sNo: number;
  account: string;
  name: string;
  dueAmount: number;
  loanInterest: number;
  totalPayable: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: string;
}

@Component({
  selector: 'app-due-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './due-report.component.html',
  styleUrls: ['./due-report.component.css']
})
export class DueReportComponent implements OnInit {
  availableDues: number[] = [];
  selectedDue: number | null = null;
  reportData: DueReportEntry[] = [];
  loading = false;
  showReport = false;

  // Summary totals
  totalDueAmount = 0;
  totalLoanInterest = 0;
  totalPayableAmount = 0;
  totalPaidAmount = 0;
  totalBalanceAmount = 0;

  constructor(private firestoreService: FirestoreService) {}

  async ngOnInit() {
    // Generate due numbers from 1 to 24
    this.availableDues = Array.from({ length: 24 }, (_, i) => i + 1);
  }

  async generateReport() {
    if (!this.selectedDue) {
      alert('Please select a due number');
      return;
    }

    this.loading = true;
    this.showReport = false;
    this.reportData = [];

    try {
      // Fetch all account details
      const accounts = await this.firestoreService.getAllDocuments('accountDetails');

      let serialNo = 1;
      this.totalDueAmount = 0;
      this.totalLoanInterest = 0;
      this.totalPayableAmount = 0;
      this.totalPaidAmount = 0;
      this.totalBalanceAmount = 0;

      for (const account of accounts) {
        const accountData = account as any;

        // Find the payment entry for the selected due
        // Check for both 'due_payments' and 'payments' field names
        const paymentsArray = accountData.due_payments || accountData.payments;

        if (paymentsArray && Array.isArray(paymentsArray)) {
          const payment = paymentsArray.find(
            (p: PaymentEntry) => p.due_no === this.selectedDue
          );

          if (payment) {
            const reportEntry: DueReportEntry = {
              sNo: 0, // Will be assigned after sorting
              account: accountData.account || accountData.member_id || 'N/A',
              name: accountData.name || accountData.member_name || 'N/A',
              dueAmount: payment.due_amount || 0,
              loanInterest: payment.loan_interest || 0,
              totalPayable: payment.total || (payment.due_amount + payment.loan_interest) || 0,
              paidAmount: payment.paid_amount || 0,
              balanceAmount: payment.balance_amount || 0,
              paymentStatus: this.getPaymentStatusLabel(payment.payment_status)
            };

            this.reportData.push(reportEntry);

            // Update totals
            this.totalDueAmount += reportEntry.dueAmount;
            this.totalLoanInterest += reportEntry.loanInterest;
            this.totalPayableAmount += reportEntry.totalPayable;
            this.totalPaidAmount += reportEntry.paidAmount;
            this.totalBalanceAmount += reportEntry.balanceAmount;
          }
        }
      }

      // Sort by account number
      this.reportData.sort((a, b) => a.account.localeCompare(b.account));

      // Assign serial numbers after sorting
      this.reportData.forEach((entry, index) => {
        entry.sNo = index + 1;
      });

      this.showReport = true;
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report. Please try again.');
    } finally {
      this.loading = false;
    }
  }

  getPaymentStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      'paid': 'Paid',
      'pending': 'Pending',
      'partial': 'Partial',
      'overdue': 'Overdue'
    };
    return statusMap[status] || status || 'Pending';
  }

  getStatusClass(status: string): string {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === 'paid') return 'status-paid';
    if (lowerStatus === 'pending') return 'status-pending';
    if (lowerStatus === 'partial') return 'status-partial';
    if (lowerStatus === 'overdue') return 'status-overdue';
    return 'status-pending';
  }

  exportToPDF() {
    if (!this.selectedDue || this.reportData.length === 0) {
      alert('No data to export');
      return;
    }

    const doc = new jsPDF();

    // Add title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`Due Report - Due No. ${this.selectedDue}`, 14, 20);

    // Add date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);

    // Prepare table data
    const tableData = this.reportData.map(entry => [
      entry.sNo,
      entry.account,
      entry.name,
      `${entry.dueAmount.toLocaleString('en-IN')}`,
      `${entry.loanInterest.toLocaleString('en-IN')}`,
      `${entry.totalPayable.toLocaleString('en-IN')}`,
      `${entry.paidAmount.toLocaleString('en-IN')}`,
      `${entry.balanceAmount.toLocaleString('en-IN')}`,
      entry.paymentStatus
    ]);

    // Add totals row
    tableData.push([
      '',
      '',
      'TOTAL',
      `${this.totalDueAmount.toLocaleString('en-IN')}`,
      `${this.totalLoanInterest.toLocaleString('en-IN')}`,
      `${this.totalPayableAmount.toLocaleString('en-IN')}`,
      `${this.totalPaidAmount.toLocaleString('en-IN')}`,
      `${this.totalBalanceAmount.toLocaleString('en-IN')}`,
      ''
    ]);

    // Generate table
    autoTable(doc, {
      startY: 35,
      head: [[
        'S.No.',
        'Account No.',
        'Name',
        'Due Amount',
        'Loan Interest',
        'Total Payable',
        'Paid Amount',
        'Balance Amount',
        'Status'
      ]],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 22 },
        2: { cellWidth: 35 },
        3: { cellWidth: 20, halign: 'right' },
        4: { cellWidth: 20, halign: 'right' },
        5: { cellWidth: 22, halign: 'right' },
        6: { cellWidth: 20, halign: 'right' },
        7: { cellWidth: 22, halign: 'right' },
        8: { cellWidth: 18, halign: 'center' }
      },
      didParseCell: (data) => {
        // Make the total row bold
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      }
    });

    // Save the PDF
    doc.save(`Due_Report_${this.selectedDue}_${new Date().toISOString().split('T')[0]}.pdf`);
  }
}
