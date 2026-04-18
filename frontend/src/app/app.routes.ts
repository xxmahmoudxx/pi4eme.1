import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login.component';
import { SignupComponent } from './pages/signup.component';
import { SalesDashboardComponent } from './pages/sales-dashboard.component';
import { PurchasesDashboardComponent } from './pages/purchases-dashboard.component';
import { ReportDashboardComponent } from './pages/report-dashboard.component';
import { AssistantComponent } from './pages/assistant.component';
import { AdminPanelComponent } from './pages/admin-panel.component';
import { FaceVerifyComponent } from './pages/face-verify.component';
import { SettingsComponent } from './pages/settings.component';
import { ForgotPasswordComponent } from './pages/forgot-password.component';
import { ResetPasswordComponent } from './pages/reset-password.component';
import { CustomersDashboardComponent } from './pages/customers-dashboard.component';
import { SuppliersDashboardComponent } from './pages/suppliers-dashboard.component';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';
import { adminGuard } from './guards/admin.guard';
import { rolesGuard } from './guards/roles.guard';
import { AuthCallbackComponent } from './pages/auth-callback.component';
import { PurchaseRequestsComponent } from './pages/purchase-requests.component';
import { PurchaseHistoryComponent } from './pages/purchase-history.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'signup', component: SignupComponent, canActivate: [guestGuard] },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'sales', component: SalesDashboardComponent, canActivate: [authGuard, rolesGuard(['CompanyOwner', 'Accountant'], '/admin')] },
  { path: 'purchases', component: PurchasesDashboardComponent, canActivate: [authGuard, rolesGuard(['CompanyOwner', 'Accountant'], '/admin')] },
  { path: 'customers', component: CustomersDashboardComponent, canActivate: [authGuard, rolesGuard(['CompanyOwner', 'Accountant'], '/admin')] },
  { path: 'suppliers', component: SuppliersDashboardComponent, canActivate: [authGuard, rolesGuard(['CompanyOwner', 'Accountant'], '/admin')] },
  { path: 'report', component: ReportDashboardComponent, canActivate: [authGuard, rolesGuard(['CompanyOwner', 'Accountant'], '/admin')] },
  { path: 'purchase-requests', component: PurchaseRequestsComponent, canActivate: [authGuard, rolesGuard(['Accountant'], '/sales')] },
  { path: 'purchase-history', component: PurchaseHistoryComponent, canActivate: [authGuard, rolesGuard(['Accountant'], '/sales')] },
  { path: 'assistant', component: AssistantComponent, canActivate: [authGuard] },
  { path: 'admin', component: AdminPanelComponent, canActivate: [authGuard, rolesGuard(['Admin'], '/sales')] },
  { path: 'face-verify', component: FaceVerifyComponent, canActivate: [authGuard] },
  { path: 'settings', component: SettingsComponent, canActivate: [authGuard] },
  { path: 'auth/callback', component: AuthCallbackComponent },
];