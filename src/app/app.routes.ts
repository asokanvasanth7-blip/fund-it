import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './login/login.component';
import { DataUploadComponent } from './data-upload/data-upload.component';
import { DueScheduleComponent } from './due-schedule/due-schedule.component';
import { AccountDetailsComponent } from './account-details/account-details.component';
import { UpdateDueDetailsComponent } from './update-due-details/update-due-details.component';
import { UpdateLoanDetailsComponent } from './update-loan-details/update-loan-details.component';
import { PaymentCollectionComponent } from './payment-collection/payment-collection.component';
import { authGuard } from './guards/auth.guard';
import { publicGuard } from './guards/public.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent, canActivate: [authGuard] },
  { path: 'login', component: LoginComponent, canActivate: [publicGuard] },
  { path: 'upload', component: DataUploadComponent, canActivate: [authGuard] },
  { path: 'due-schedule', component: DueScheduleComponent, canActivate: [authGuard] },
  { path: 'account-details', component: AccountDetailsComponent, canActivate: [authGuard] },
  { path: 'update-due-details', component: UpdateDueDetailsComponent, canActivate: [authGuard] },
  { path: 'update-loan-details', component: UpdateLoanDetailsComponent, canActivate: [authGuard] },
  { path: 'payment-collection', component: PaymentCollectionComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' }
];
