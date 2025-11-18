import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountDetails } from '../models/account-details.model';
import { FirestoreService } from '../services/firestore.service';

@Component({
  selector: 'app-account-informations',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './account-informations.component.html',
  styleUrls: ['./account-informations.component.css']
})
export class AccountInformationsComponent {
  account: AccountDetails | null = null;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private firestore: FirestoreService,
    private router: Router
  ) {
    const accountId = this.route.snapshot.paramMap.get('accountId');
    if (accountId) {
      this.loadAccount(accountId);
    } else {
      this.loading = false;
    }
  }

  async loadAccount(accountId: string) {
    try {
      this.loading = true;
      const accountsData: any[] = await this.firestore.getAllDocuments('accountDetails');
      const found = accountsData.find(a => a.account === accountId);
      if (found) {
        const { id, ...rest } = found;
        this.account = rest as AccountDetails;
      } else {
        this.account = null;
      }
    } catch (err) {
      console.error('Error loading account:', err);
      this.account = null;
    } finally {
      this.loading = false;
    }
  }

  goBack() {
    this.router.navigate(['/account-details']);
  }
}
