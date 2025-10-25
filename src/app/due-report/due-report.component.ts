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

  getCurrentDate(): string {
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  exportToPDF() {
    if (!this.selectedDue || this.reportData.length === 0) {
      alert('No data to export');
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Modern Color Palette (matching web interface)
    const PRIMARY_PURPLE = [102, 126, 234] as [number, number, number]; // #667eea
    const SECONDARY_PURPLE = [118, 75, 162] as [number, number, number]; // #764ba2
    const DARK_TEXT = [45, 55, 72] as [number, number, number]; // #2d3748
    const LIGHT_GRAY = [248, 249, 250] as [number, number, number]; // #f8f9fa
    const SUCCESS_GREEN = [40, 167, 69] as [number, number, number]; // #28a745
    const DANGER_RED = [220, 53, 69] as [number, number, number]; // #dc3545
    const WARNING_ORANGE = [237, 137, 54] as [number, number, number]; // #ed8936

    // Helper function to format currency
    const formatCurrency = (amount: number): string => {
      return amount.toLocaleString('en-IN');
    };

    // ============ MODERN GRADIENT HEADER ============
    // Create gradient effect with overlapping rectangles
    doc.setFillColor(...PRIMARY_PURPLE);
    doc.rect(0, 0, pageWidth, 45, 'F');

    // Decorative lighter purple overlay
    doc.setFillColor(...SECONDARY_PURPLE);
    doc.rect(0, 0, pageWidth / 2, 45, 'F');

    // Top accent line
    doc.setFillColor(102, 126, 234);
    doc.rect(0, 0, pageWidth, 3, 'F');

    // Header Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('DUE PAYMENT REPORT', pageWidth / 2, 18, { align: 'center' });

    // Organization Name
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('AZHISUKKUDI AMAVAASAI FUND', pageWidth / 2, 26, { align: 'center' });

    doc.setFontSize(9);
    doc.text('2025 - 2027', pageWidth / 2, 32, { align: 'center' });

    // Due Number Badge (right side)
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(255, 255, 255);
    doc.roundedRect(pageWidth - 48, 36, 40, 8, 2, 2, 'FD');
    doc.setTextColor(...PRIMARY_PURPLE);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`DUE #${this.selectedDue} OF 24`, pageWidth - 28, 41, { align: 'center' });

    // ============ INFO SECTION ============
    let yPos = 55;

    // Generated date and account count
    doc.setTextColor(...DARK_TEXT);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    doc.text(`Generated: ${currentDate}`, 14, yPos);
    doc.text(`Total Accounts: ${this.reportData.length}`, pageWidth - 14, yPos, { align: 'right' });

    // ============ SUMMARY CARDS ============
    yPos = 65;
    const cardWidth = (pageWidth - 40) / 4;
    const cardHeight = 22;
    const cardGap = 4;

    // Card 1: Total Payable
    const card1X = 14;
    doc.setFillColor(...PRIMARY_PURPLE);
    doc.roundedRect(card1X, yPos, cardWidth, cardHeight, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('TOTAL PAYABLE', card1X + cardWidth / 2, yPos + 7, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(this.totalPayableAmount), card1X + cardWidth / 2, yPos + 15, { align: 'center' });

    // Card 2: Total Paid
    const card2X = card1X + cardWidth + cardGap;
    doc.setFillColor(...SUCCESS_GREEN);
    doc.roundedRect(card2X, yPos, cardWidth, cardHeight, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('TOTAL PAID', card2X + cardWidth / 2, yPos + 7, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(this.totalPaidAmount), card2X + cardWidth / 2, yPos + 15, { align: 'center' });

    // Card 3: Total Balance
    const card3X = card2X + cardWidth + cardGap;
    doc.setFillColor(...DANGER_RED);
    doc.roundedRect(card3X, yPos, cardWidth, cardHeight, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('TOTAL BALANCE', card3X + cardWidth / 2, yPos + 7, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(this.totalBalanceAmount), card3X + cardWidth / 2, yPos + 15, { align: 'center' });

    // Card 4: Collection Rate
    const card4X = card3X + cardWidth + cardGap;
    const collectionRate = this.totalPayableAmount > 0
      ? ((this.totalPaidAmount / this.totalPayableAmount) * 100).toFixed(1)
      : '0.0';
    doc.setFillColor(23, 162, 184); // Info blue
    doc.roundedRect(card4X, yPos, cardWidth, cardHeight, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('COLLECTION RATE', card4X + cardWidth / 2, yPos + 7, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${collectionRate}%`, card4X + cardWidth / 2, yPos + 15, { align: 'center' });

    // ============ MODERN TABLE ============
    yPos = 95;

    // Section Title
    doc.setTextColor(...DARK_TEXT);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Details', 14, yPos);

    // Underline
    doc.setDrawColor(...PRIMARY_PURPLE);
    doc.setLineWidth(0.8);
    doc.line(14, yPos + 1, 55, yPos + 1);

    // Prepare table data
    const tableData = this.reportData.map(entry => [
      entry.sNo,
      entry.account,
      entry.name,
      formatCurrency(entry.dueAmount),
      formatCurrency(entry.loanInterest),
      formatCurrency(entry.totalPayable),
      formatCurrency(entry.paidAmount),
      formatCurrency(entry.balanceAmount),
      entry.paymentStatus
    ]);

    // Generate modern table
    autoTable(doc, {
      startY: yPos + 5,
      head: [[
        '#',
        'Account',
        'Name',
        'Due Amount',
        'Interest',
        'Total',
        'Paid',
        'Balance',
        'Status'
      ]],
      body: tableData,
      foot: [[
        '',
        '',
        'GRAND TOTAL',
        formatCurrency(this.totalDueAmount),
        formatCurrency(this.totalLoanInterest),
        formatCurrency(this.totalPayableAmount),
        formatCurrency(this.totalPaidAmount),
        formatCurrency(this.totalBalanceAmount),
        ''
      ]],
      theme: 'plain',
      styles: {
        fontSize: 8,
        cellPadding: 3,
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
        textColor: DARK_TEXT,
        fontStyle: 'normal'
      },
      headStyles: {
        fillColor: PRIMARY_PURPLE,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
        cellPadding: 4
      },
      footStyles: {
        fillColor: [248, 249, 255],
        textColor: DARK_TEXT,
        fontStyle: 'bold',
        fontSize: 9,
        lineWidth: 0.5,
        lineColor: PRIMARY_PURPLE
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center', fillColor: LIGHT_GRAY, fontStyle: 'bold' },
        1: { cellWidth: 20, fontStyle: 'bold', textColor: PRIMARY_PURPLE },
        2: { cellWidth: 35 },
        3: { cellWidth: 22, halign: 'right' },
        4: { cellWidth: 20, halign: 'right', textColor: WARNING_ORANGE },
        5: { cellWidth: 22, halign: 'right', fontStyle: 'bold', textColor: PRIMARY_PURPLE },
        6: { cellWidth: 20, halign: 'right', textColor: SUCCESS_GREEN },
        7: { cellWidth: 20, halign: 'right', textColor: DANGER_RED },
        8: { cellWidth: 18, halign: 'center', fontSize: 7 }
      },
      alternateRowStyles: {
        fillColor: [252, 252, 254]
      },
      didDrawCell: (data) => {
        // Style status cells
        if (data.column.index === 8 && data.section === 'body') {
          const status = data.cell.text[0]?.toLowerCase();
          if (status) {
            const cellX = data.cell.x + 2;
            const cellY = data.cell.y + 2;
            const cellW = data.cell.width - 4;
            const cellH = data.cell.height - 4;

            // Status badge background
            if (status === 'paid') {
              doc.setFillColor(212, 237, 218);
              doc.setTextColor(21, 87, 36);
            } else if (status === 'pending') {
              doc.setFillColor(255, 243, 205);
              doc.setTextColor(133, 100, 4);
            } else if (status === 'partial') {
              doc.setFillColor(209, 236, 241);
              doc.setTextColor(12, 84, 96);
            } else if (status === 'overdue') {
              doc.setFillColor(248, 215, 218);
              doc.setTextColor(114, 28, 36);
            }

            doc.roundedRect(cellX, cellY, cellW, cellH, 2, 2, 'F');

            // Redraw text on top
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.text(
              data.cell.text[0].toUpperCase(),
              data.cell.x + data.cell.width / 2,
              data.cell.y + data.cell.height / 2 + 1,
              { align: 'center', baseline: 'middle' }
            );
          }
        }
      },
      margin: { left: 14, right: 14 }
    });

    // ============ PROFESSIONAL FOOTER ============
    const footerY = pageHeight - 20;

    // Separator line
    doc.setDrawColor(...PRIMARY_PURPLE);
    doc.setLineWidth(0.5);
    doc.line(14, footerY - 3, pageWidth - 14, footerY - 3);

    // Background
    doc.setFillColor(...LIGHT_GRAY);
    doc.rect(0, footerY - 1, pageWidth, 21, 'F');

    // Organization name
    doc.setTextColor(...DARK_TEXT);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('FUND IT', pageWidth / 2, footerY + 4, { align: 'center' });

    // Contact info
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(113, 128, 150);
    doc.text('Email: ramsatt@gmail.com  |  Phone: +91-8973576694', pageWidth / 2, footerY + 10, { align: 'center' });

    // Disclaimer
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('This is a computer-generated report. No signature is required.', pageWidth / 2, footerY + 15, { align: 'center' });

    // Save the PDF with modern filename
    const timestamp = new Date().toISOString().split('T')[0];
    doc.save(`DueReport_Due${this.selectedDue}_${timestamp}.pdf`);
  }
}
