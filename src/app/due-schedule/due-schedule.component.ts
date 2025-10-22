import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DueScheduleList } from '../models/due-schedule.model';
import { FirestoreService } from '../services/firestore.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-due-schedule',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './due-schedule.component.html',
  styleUrls: ['./due-schedule.component.css']
})
export class DueScheduleComponent implements OnInit {
  dueSchedules: DueScheduleList = [];
  loading: boolean = true;
  error: string | null = null;

  constructor(private firestoreService: FirestoreService) {}

  async ngOnInit() {
    await this.loadDueSchedules();
  }

  async loadDueSchedules() {
    try {
      this.loading = true;
      this.error = null;

      // Fetch due schedules from Firestore
      const schedules = await this.firestoreService.getDueSchedules();

      if (schedules && schedules.length > 0) {
        // Extract only the schedule data, removing the Firestore 'id' field
        this.dueSchedules = schedules.map(({ id, ...schedule }: any) => schedule);
        // Sort by due_no to ensure correct order
        this.dueSchedules.sort((a, b) => a.due_no - b.due_no);
      } else {
        // Fallback to mock data if no data in Firestore
        await this.loadMockData();
      }
    } catch (err) {
      console.error('Error loading due schedules:', err);
      this.error = 'Failed to load due schedules. Please try again later.';
      // Fallback to mock data on error
      await this.loadMockData();
    } finally {
      this.loading = false;
    }
  }

  private async loadMockData() {
    try {
      const response = await fetch('/assets/due-schedule.mock.json');
      this.dueSchedules = await response.json();
    } catch (err) {
      console.error('Error loading mock data:', err);
    }
  }

  getTotalDueAmount(): number {
    return this.dueSchedules.reduce((sum, schedule) => sum + schedule.due_amount, 0);
  }

  getTotalInterest(): number {
    return this.dueSchedules.reduce((sum, schedule) => sum + schedule.due_interest, 0);
  }

  getGrandTotal(): number {
    if (this.dueSchedules.length > 0) {
      return this.dueSchedules[this.dueSchedules.length - 1].total;
    }
    return 0;
  }

  exportToPDF() {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Add gradient-like header background
    doc.setFillColor(102, 126, 234); // Purple gradient start
    doc.rect(0, 0, pageWidth, 45, 'F');

    // Add company logo/icon (using emoji-like text)
    doc.setFontSize(24);
    doc.setTextColor(144, 238, 144); // Light green
    doc.text('$', 14, 20);

    // Add company name
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('FundIt', 24, 20);

    // Add document title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('DUE SCHEDULE REPORT', 14, 35);

    // Add generation date and document info on the right
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(240, 240, 240);
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.text(`Generated: ${currentDate}`, pageWidth - 14, 20, { align: 'right' });
    doc.text(`Total Records: ${this.dueSchedules.length}`, pageWidth - 14, 27, { align: 'right' });

    // Add decorative line
    doc.setDrawColor(144, 238, 144);
    doc.setLineWidth(0.5);
    doc.line(14, 47, pageWidth - 14, 47);

    // Prepare table data
    const tableData: any[] = this.dueSchedules.map(schedule => [
      schedule.due_no.toString(),
      schedule.due_date,
      `Rs. ${schedule.due_amount.toFixed(2)}`,
      `Rs. ${schedule.due_interest.toFixed(2)}`,
      `Rs. ${schedule.total.toFixed(2)}`
    ]);

    // Add summary row with special styling
    tableData.push([
      { content: 'TOTAL', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', fillColor: [102, 126, 234], textColor: [255, 255, 255] } },
      { content: `Rs. ${this.getTotalDueAmount().toFixed(2)}`, styles: { fontStyle: 'bold', fillColor: [240, 248, 255], textColor: [0, 0, 0] } },
      { content: `Rs. ${this.getTotalInterest().toFixed(2)}`, styles: { fontStyle: 'bold', fillColor: [240, 248, 255], textColor: [0, 0, 0] } },
      { content: `Rs. ${this.getGrandTotal().toFixed(2)}`, styles: { fontStyle: 'bold', fillColor: [102, 126, 234], textColor: [255, 255, 255], fontSize: 10 } }
    ]);

    // Generate professional table
    autoTable(doc, {
      head: [['Due No.', 'Due Date', 'Due Amount', 'Due Interest', 'Cumulative Total']],
      body: tableData,
      startY: 55,
      theme: 'grid',
      headStyles: {
        fillColor: [102, 126, 234],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 10,
        cellPadding: 4
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 25, fontStyle: 'bold' },
        1: { halign: 'center', cellWidth: 35 },
        2: { halign: 'right', cellWidth: 42, fontStyle: 'normal' },
        3: { halign: 'right', cellWidth: 42, fontStyle: 'normal' },
        4: { halign: 'right', cellWidth: 46, fontStyle: 'bold', textColor: [40, 167, 69] }
      },
      styles: {
        fontSize: 9,
        cellPadding: 3.5,
        lineColor: [200, 200, 200],
        lineWidth: 0.1
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250]
      },
      bodyStyles: {
        textColor: [50, 50, 50]
      }
    });

    // Add professional summary section
    const finalY = (doc as any).lastAutoTable.finalY + 15;

    // Summary box background
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(14, finalY - 5, pageWidth - 28, 40, 2, 2, 'F');

    // Summary border
    doc.setDrawColor(102, 126, 234);
    doc.setLineWidth(0.5);
    doc.roundedRect(14, finalY - 5, pageWidth - 28, 40, 2, 2, 'S');

    // Summary title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(102, 126, 234);
    doc.text('FINANCIAL SUMMARY', 20, finalY + 3);

    // Summary details with icons and better formatting
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);

    // Total Due Amount
    doc.text('Principal Amount:', 20, finalY + 12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text(`Rs. ${this.getTotalDueAmount().toFixed(2)}`, pageWidth - 20, finalY + 12, { align: 'right' });

    // Total Interest
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('Total Interest:', 20, finalY + 20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text(`Rs. ${this.getTotalInterest().toFixed(2)}`, pageWidth - 20, finalY + 20, { align: 'right' });

    // Separator line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(20, finalY + 24, pageWidth - 20, finalY + 24);

    // Grand Total with highlight
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(102, 126, 234);
    doc.text('GRAND TOTAL:', 20, finalY + 31);
    doc.setFontSize(12);
    doc.setTextColor(102, 126, 234);
    doc.text(`Rs. ${this.getGrandTotal().toFixed(2)}`, pageWidth - 20, finalY + 31, { align: 'right' });

    // Add footer
    const footerY = pageHeight - 15;
    doc.setDrawColor(102, 126, 234);
    doc.setLineWidth(0.3);
    doc.line(14, footerY - 5, pageWidth - 14, footerY - 5);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text('FundIt - Your Trusted Investment Partner', 14, footerY);
    doc.text(`Page 1 of 1`, pageWidth - 14, footerY, { align: 'right' });

    // Add disclaimer/note
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('This is a computer-generated document. No signature is required.', pageWidth / 2, footerY + 4, { align: 'center' });

    // Save the PDF with a better filename
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `FundIt_DueSchedule_${timestamp}.pdf`;
    doc.save(fileName);
  }
}

