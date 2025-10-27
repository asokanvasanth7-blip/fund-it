import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FirestoreService } from '../services/firestore.service';
import { AuthService } from '../services/auth.service';
import { DueScheduleList } from '../models/due-schedule.model';
import { AccountDetailsList } from '../models/account-details.model';
import dueScheduleData from '../../assets/due-schedule.mock.json';
import accountDetailsData from '../../assets/account-details.mock.json';

@Component({
  selector: 'app-data-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './data-upload.component.html',
  styleUrls: ['./data-upload.component.css']
})
export class DataUploadComponent implements OnInit {
  uploading = false;
  uploadComplete = false;
  uploadError: string | null = null;
  uploadedCount = 0;

  accountUploading = false;
  accountUploadComplete = false;
  accountUploadError: string | null = null;
  accountUploadedCount = 0;
  hasEditAccess: boolean = false;

  constructor(
    private firestoreService: FirestoreService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.hasEditAccess = this.authService.hasEditAccess();
  }

  async uploadDueSchedule() {
    if (!this.hasEditAccess) {
      this.uploadError = 'You do not have permission to upload data';
      alert('Access Denied: You do not have permission to upload data');
      return;
    }

    this.uploading = true;
    this.uploadComplete = false;
    this.uploadError = null;
    this.uploadedCount = 0;

    try {
      const scheduleData = dueScheduleData as DueScheduleList;

      console.log('Starting upload of', scheduleData.length, 'due schedule records...');

      const results = await this.firestoreService.addMultipleDocuments(
        'dueSchedules',
        scheduleData
      );

      this.uploadedCount = results.length;
      this.uploadComplete = true;
      console.log('Upload complete! Uploaded', results.length, 'records.');
      console.log('Document IDs:', results);

    } catch (error: any) {
      this.uploadError = error.message || 'An error occurred during upload';
      console.error('Upload failed:', error);
    } finally {
      this.uploading = false;
    }
  }

  async viewExistingData() {
    try {
      const data = await this.firestoreService.getAllDocuments('dueSchedules');
      console.log('Existing due schedules in Firebase:', data);
      alert(`Found ${data.length} records in Firebase. Check console for details.`);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Error fetching data. Check console for details.');
    }
  }

  async viewAccountData() {
    try {
      const data = await this.firestoreService.getAllDocuments('accountDetails');
      console.log('Existing account details in Firebase:', data);
      alert(`Found ${data.length} account records in Firebase. Check console for details.`);
    } catch (error) {
      console.error('Error fetching account data:', error);
      alert('Error fetching account data. Check console for details.');
    }
  }
}

