import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';

type SetupStep = 'idle' | 'qr' | 'confirming' | 'done';
type DisableStep = 'idle' | 'confirming';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="page-container">
      <h2>Settings</h2>

      <!-- ── Loading ── -->
      <div *ngIf="loading" class="status-loading">Loading...</div>

      <div *ngIf="!loading" class="sections">

        <!-- ══════════════════════════════════════════════════════════════════════ -->
        <!-- ── Account Section ── -->
        <!-- ══════════════════════════════════════════════════════════════════════ -->
        <section class="section-card" [class.expanded]="activeSection === 'account'"
                 (click)="activeSection === 'account' ? null : activeSection = 'account'">
          <div class="section-header">
            <div class="avatar-small-wrapper">
              <img *ngIf="photoPreview" [src]="photoPreview" alt="Photo" class="avatar-small" />
              <div *ngIf="!photoPreview" class="avatar-small-placeholder">
                {{ userProfile?.name?.charAt(0)?.toUpperCase() || '?' }}
              </div>
            </div>
            <div class="section-info">
              <h3>Account</h3>
              <p class="section-desc">Manage your profile, photo, and company details.</p>
            </div>
            <span class="arrow" *ngIf="activeSection !== 'account'">&#8594;</span>
          </div>

          <!-- Account Content -->
          <div class="section-content" *ngIf="activeSection === 'account'" (click)="$event.stopPropagation()">

            <!-- ── Profile Photo ── -->
            <div class="photo-section">
              <div class="avatar-wrapper">
                <img *ngIf="photoPreview" [src]="photoPreview" alt="Profile photo" class="avatar-img" />
                <div *ngIf="!photoPreview" class="avatar-placeholder">
                  {{ userProfile?.name?.charAt(0)?.toUpperCase() || '?' }}
                </div>
                <div *ngIf="photoSaving" class="avatar-saving">Saving...</div>
              </div>
              <div class="photo-actions">
                <label class="btn btn-ghost upload-btn">
                  Change Photo
                  <input type="file" accept="image/*" (change)="onPhotoSelected($event)" hidden />
                </label>
                <span class="photo-hint">Max 2 MB, JPG or PNG</span>
              </div>
            </div>

            <!-- ── Personal Info ── -->
            <div class="info-block">
              <div class="info-block-header">
                <h4>Personal Information</h4>
                <button *ngIf="!editingUser" class="btn btn-ghost btn-sm" (click)="startEditUser()">Edit</button>
              </div>

              <div *ngIf="!editingUser" class="info-rows">
                <div class="info-row">
                  <span class="info-label">Name</span>
                  <span class="info-value">{{ userProfile?.name }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Email</span>
                  <span class="info-value">{{ userProfile?.email }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Role</span>
                  <span class="info-value">{{ userProfile?.role }}</span>
                </div>
              </div>

              <div *ngIf="editingUser" class="edit-form">
                <div class="form-group">
                  <label class="form-label">Name</label>
                  <input type="text" class="form-input" [(ngModel)]="editName" />
                </div>
                <div class="form-group">
                  <label class="form-label">Email</label>
                  <input type="email" class="form-input" [(ngModel)]="editEmail" />
                </div>
                <p *ngIf="userSaveError" class="error-msg">{{ userSaveError }}</p>
                <div class="btn-row">
                  <button class="btn btn-primary" (click)="saveUser()" [disabled]="userSaving">
                    {{ userSaving ? 'Saving...' : 'Save' }}
                  </button>
                  <button class="btn btn-ghost" (click)="cancelEditUser()" [disabled]="userSaving">Cancel</button>
                </div>
              </div>

              <p *ngIf="userSaveSuccess" class="success-msg">{{ userSaveSuccess }}</p>
            </div>

            <!-- ── Company Info (CompanyOwner only) ── -->
            <div *ngIf="isCompanyOwner && companyConfig" class="info-block">
              <div class="info-block-header">
                <h4>Company Information</h4>
                <button *ngIf="!editingCompany" class="btn btn-ghost btn-sm" (click)="startEditCompany()">Edit</button>
              </div>

              <div *ngIf="!editingCompany" class="info-rows">
                <div class="info-row">
                  <span class="info-label">Company Name</span>
                  <span class="info-value">{{ companyConfig.companyName }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Tax Rate</span>
                  <span class="info-value">{{ companyConfig.taxRate }}%</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Currency</span>
                  <span class="info-value">{{ companyConfig.currency }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Notification Email</span>
                  <span class="info-value">{{ companyConfig.email }}</span>
                </div>
              </div>

              <div *ngIf="editingCompany" class="edit-form">
                <div class="form-group">
                  <label class="form-label">Company Name</label>
                  <input type="text" class="form-input" [(ngModel)]="editCompanyName" />
                </div>
                <div class="form-group">
                  <label class="form-label">Tax Rate (%)</label>
                  <input type="number" class="form-input" [(ngModel)]="editTaxRate" min="0" />
                </div>
                <div class="form-group">
                  <label class="form-label">Currency</label>
                  <input type="text" class="form-input" [(ngModel)]="editCurrency" />
                </div>
                <div class="form-group">
                  <label class="form-label">Notification Email</label>
                  <input type="email" class="form-input" [(ngModel)]="editCompanyEmail" />
                </div>
                <p *ngIf="companySaveError" class="error-msg">{{ companySaveError }}</p>
                <div class="btn-row">
                  <button class="btn btn-primary" (click)="saveCompany()" [disabled]="companySaving">
                    {{ companySaving ? 'Saving...' : 'Save' }}
                  </button>
                  <button class="btn btn-ghost" (click)="cancelEditCompany()" [disabled]="companySaving">Cancel</button>
                </div>
              </div>

              <p *ngIf="companySaveSuccess" class="success-msg">{{ companySaveSuccess }}</p>
            </div>

          </div>
        </section>

        <!-- ══════════════════════════════════════════════════════════════════════ -->
        <!-- ── 2FA Section ── -->
        <!-- ══════════════════════════════════════════════════════════════════════ -->
        <section class="section-card" [class.expanded]="activeSection === '2fa'" (click)="activeSection === '2fa' ? null : activeSection = '2fa'">
          <div class="section-header">
            <div class="section-icon">🔐</div>
            <div class="section-info">
              <h3>Two-Factor Authentication</h3>
              <p class="section-desc">Require a code from Google Authenticator on each login.</p>
            </div>
            <span class="badge" [class.badge-on]="twoFactorEnabled" [class.badge-off]="!twoFactorEnabled">
              {{ twoFactorEnabled ? 'ON' : 'OFF' }}
            </span>
          </div>

          <div class="section-content" *ngIf="activeSection === '2fa'">

            <ng-container *ngIf="!twoFactorEnabled">
              <div *ngIf="enableStep === 'idle'" class="action-area">
                <button class="btn btn-primary" (click)="startEnable(); $event.stopPropagation()" [disabled]="actionLoading">
                  {{ actionLoading ? 'Generating...' : 'Enable 2FA' }}
                </button>
              </div>

              <div *ngIf="enableStep === 'qr'" class="qr-area" (click)="$event.stopPropagation()">
                <p class="qr-instructions">
                  1. Open <strong>Google Authenticator</strong> on your phone.<br>
                  2. Tap <strong>+</strong> then <strong>Scan a QR code</strong>.<br>
                  3. Scan the code below.
                </p>
                <div class="qr-wrapper">
                  <img [src]="qrCode" alt="2FA QR Code" class="qr-image" />
                </div>
                <p class="manual-key">
                  Can't scan? Enter this key manually:<br>
                  <code>{{ manualSecret }}</code>
                </p>
                <button class="btn btn-primary" (click)="enableStep = 'confirming'">
                  I've scanned it - Enter code
                </button>
                <button class="btn btn-ghost" (click)="cancelEnable()">Cancel</button>
              </div>

              <div *ngIf="enableStep === 'confirming'" class="confirm-area" (click)="$event.stopPropagation()">
                <p class="confirm-desc">Enter the 6-digit code from Google Authenticator to confirm setup:</p>
                <input
                  type="text"
                  class="otp-input"
                  [(ngModel)]="confirmCode"
                  placeholder="000000"
                  maxlength="6"
                  inputmode="numeric"
                  autocomplete="one-time-code"
                />
                <p *ngIf="actionError" class="error-msg">{{ actionError }}</p>
                <div class="btn-row">
                  <button class="btn btn-success" (click)="confirmEnable()"
                          [disabled]="actionLoading || confirmCode.length !== 6">
                    {{ actionLoading ? 'Activating...' : 'Activate 2FA' }}
                  </button>
                  <button class="btn btn-ghost" (click)="enableStep = 'qr'" [disabled]="actionLoading">
                    Back
                  </button>
                </div>
              </div>

              <div *ngIf="enableStep === 'done'" class="success-banner">
                2FA is now active. You'll be asked for a code on your next login.
              </div>
            </ng-container>

            <ng-container *ngIf="twoFactorEnabled">
              <div *ngIf="disableStep === 'idle'" class="action-area">
                <button class="btn btn-danger" (click)="disableStep = 'confirming'; $event.stopPropagation()">
                  Disable 2FA
                </button>
              </div>

              <div *ngIf="disableStep === 'confirming'" class="confirm-area" (click)="$event.stopPropagation()">
                <p class="confirm-desc">Enter your current 6-digit code to confirm disabling 2FA:</p>
                <input
                  type="text"
                  class="otp-input"
                  [(ngModel)]="disableCode"
                  placeholder="000000"
                  maxlength="6"
                  inputmode="numeric"
                />
                <p *ngIf="actionError" class="error-msg">{{ actionError }}</p>
                <div class="btn-row">
                  <button class="btn btn-danger" (click)="confirmDisable()"
                          [disabled]="actionLoading || disableCode.length !== 6">
                    {{ actionLoading ? 'Disabling...' : 'Confirm Disable' }}
                  </button>
                  <button class="btn btn-ghost" (click)="cancelDisable()" [disabled]="actionLoading">
                    Cancel
                  </button>
                </div>
              </div>
            </ng-container>
          </div>
        </section>

        <!-- ══════════════════════════════════════════════════════════════════════ -->
        <!-- ── Face Recognition Section ── -->
        <!-- ══════════════════════════════════════════════════════════════════════ -->
        <section class="section-card clickable" routerLink="/face-verify">
          <div class="section-header">
            <div class="section-icon">📷</div>
            <div class="section-info">
              <h3>Face Recognition</h3>
              <p class="section-desc">Enroll or verify your face for quick passwordless login.</p>
            </div>
            <span class="arrow">→</span>
          </div>
        </section>

      </div>
    </div>
  `,
  styles: [`
    .page-container { max-width: 620px; margin: 40px auto; padding: 0 16px; }

    h2 { margin: 0 0 24px; font-size: 24px; font-weight: 800; color: #021024; }

    .sections { display: flex; flex-direction: column; gap: 16px; }

    .section-card {
      border: 1.5px solid rgba(84,131,179,0.2); border-radius: 14px; padding: 22px;
      background: #fff; transition: all 0.2s;
      box-shadow: 0 1px 4px rgba(2,16,36,0.06);
    }
    .section-card.clickable { cursor: pointer; }
    .section-card.clickable:hover { box-shadow: 0 4px 16px rgba(2,16,36,0.1); border-color: #7DA0CA; }
    .section-card.expanded { border-color: #5483B3; box-shadow: 0 4px 20px rgba(84,131,179,0.15); }

    .section-header {
      display: flex; align-items: center; gap: 14px;
    }
    .section-icon { font-size: 28px; flex-shrink: 0; }
    .section-info { flex: 1; }
    .section-info h3 { margin: 0 0 4px; font-size: 16px; font-weight: 700; color: #021024; }
    .section-desc { margin: 0; font-size: 13px; color: #5483B3; line-height: 1.5; }

    .arrow { font-size: 20px; color: #7DA0CA; flex-shrink: 0; }

    .badge {
      font-size: 11px; font-weight: 700; padding: 4px 10px;
      border-radius: 99px; white-space: nowrap; flex-shrink: 0;
      letter-spacing: 0.4px; text-transform: uppercase;
    }
    .badge-on  { background: #d1fae5; color: #059669; border: 1px solid #a9dfbf; }
    .badge-off { background: #f0f6ff; color: #5483B3; border: 1px solid #C1E8FF; }

    .section-content {
      margin-top: 18px; padding-top: 18px;
      border-top: 1px solid rgba(193,232,255,0.6);
    }

    .status-loading { padding: 40px; text-align: center; color: #7DA0CA; font-weight: 500; }

    /* ── Buttons ── */
    .btn {
      padding: 10px 20px; border-radius: 8px; border: none;
      font-size: 14px; font-weight: 600; cursor: pointer;
      font-family: inherit;
      transition: all 0.18s ease;
    }
    .btn:disabled { opacity: .5; cursor: not-allowed; }
    .btn-primary { background: linear-gradient(135deg, #052659, #5483B3); color: #fff; box-shadow: 0 2px 8px rgba(5,38,89,0.25); }
    .btn-primary:hover:not(:disabled) { background: linear-gradient(135deg, #021024, #052659); box-shadow: 0 4px 14px rgba(5,38,89,0.35); transform: translateY(-1px); }
    .btn-success { background: linear-gradient(135deg, #059669, #10b981); color: #fff; box-shadow: 0 2px 8px rgba(5,150,105,0.25); }
    .btn-success:hover:not(:disabled) { background: linear-gradient(135deg, #047857, #059669); transform: translateY(-1px); }
    .btn-danger { background: linear-gradient(135deg, #c0392b, #ef4444); color: #fff; box-shadow: 0 2px 8px rgba(192,57,43,0.25); }
    .btn-danger:hover:not(:disabled) { background: linear-gradient(135deg, #922b21, #c0392b); transform: translateY(-1px); }
    .btn-ghost { background: #f0f6ff; color: #052659; border: 1.5px solid #C1E8FF; }
    .btn-ghost:hover:not(:disabled) { background: #C1E8FF; border-color: #7DA0CA; }
    .btn-row { display: flex; gap: 10px; flex-wrap: wrap; }
    .btn-sm { padding: 5px 12px; font-size: 12px; }

    /* ── QR area ── */
    .qr-area { display: flex; flex-direction: column; gap: 14px; }
    .qr-instructions { margin: 0; font-size: 13px; color: #374151; line-height: 1.7; }
    .qr-wrapper {
      display: flex; justify-content: center;
      background: #fff; border: 1.5px solid #C1E8FF;
      border-radius: 12px; padding: 16px; width: fit-content;
      box-shadow: 0 4px 16px rgba(2,16,36,0.08);
    }
    .qr-image { width: 200px; height: 200px; display: block; }
    .manual-key {
      font-size: 12px; color: #5483B3; margin: 0;
      background: #f0f6ff; padding: 12px; border-radius: 8px;
      border: 1px solid #C1E8FF;
    }
    .manual-key code { font-family: monospace; letter-spacing: 1px; color: #021024; font-size: 13px; font-weight: 700; }

    /* ── Confirm area ── */
    .confirm-area { display: flex; flex-direction: column; gap: 12px; }
    .confirm-desc { margin: 0; font-size: 13px; color: #5483B3; }

    .otp-input {
      width: 150px; text-align: center; font-size: 26px; letter-spacing: 6px;
      padding: 12px; border-radius: 10px; border: 2px solid #5483B3;
      font-weight: 700; color: #052659; font-family: monospace;
      background: #f0f6ff;
    }
    .otp-input:focus { outline: none; border-color: #052659; box-shadow: 0 0 0 3px rgba(84,131,179,0.2); }

    .error-msg { color: #c0392b; font-size: 13px; margin: 0; }

    .action-area { padding: 4px 0; }

    .success-banner {
      background: #e9f7ef; color: #059669;
      border: 1px solid #a9dfbf;
      border-radius: 10px; padding: 14px 18px;
      font-size: 14px; font-weight: 600;
    }

    /* ── Account: Avatar (small in header) ── */
    .avatar-small-wrapper { width: 40px; height: 40px; flex-shrink: 0; }
    .avatar-small {
      width: 40px; height: 40px; border-radius: 50%;
      object-fit: cover; border: 2px solid #C1E8FF;
    }
    .avatar-small-placeholder {
      width: 40px; height: 40px; border-radius: 50%;
      background: linear-gradient(135deg, #052659, #5483B3); color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; font-weight: 700;
    }

    /* ── Account: Photo section ── */
    .photo-section {
      display: flex; align-items: center; gap: 16px;
      margin-bottom: 20px; padding-bottom: 18px;
      border-bottom: 1px solid #f3f4f6;
    }
    .avatar-wrapper {
      position: relative; width: 72px; height: 72px; flex-shrink: 0;
    }
    .avatar-img {
      width: 72px; height: 72px; border-radius: 50%;
      object-fit: cover; border: 3px solid #C1E8FF;
    }
    .avatar-placeholder {
      width: 72px; height: 72px; border-radius: 50%;
      background: linear-gradient(135deg, #052659, #5483B3); color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 28px; font-weight: 700;
    }
    .avatar-saving {
      position: absolute; inset: 0; border-radius: 50%;
      background: rgba(2,16,36,.6); color: #C1E8FF;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 600;
    }
    .photo-actions { display: flex; flex-direction: column; gap: 6px; }
    .upload-btn { cursor: pointer; }
    .photo-hint { font-size: 11px; color: #7DA0CA; }

    /* ── Account: Info blocks ── */
    .info-block {
      margin-top: 18px; padding-top: 18px;
      border-top: 1px solid rgba(193,232,255,0.5);
    }
    .info-block:first-of-type { margin-top: 0; padding-top: 0; border-top: none; }
    .info-block-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 12px;
    }
    .info-block-header h4 {
      margin: 0; font-size: 14px; font-weight: 700; color: #021024;
    }

    .info-rows { display: flex; flex-direction: column; gap: 4px; }
    .info-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 9px 12px; border-radius: 8px;
      transition: background 0.15s;
    }
    .info-row:hover { background: #f0f6ff; }
    .info-label { font-size: 13px; color: #5483B3; font-weight: 500; }
    .info-value { font-size: 13px; color: #021024; font-weight: 600; }

    /* ── Account: Edit form ── */
    .edit-form { display: flex; flex-direction: column; gap: 14px; }
    .form-group { display: flex; flex-direction: column; gap: 5px; }
    .form-label { font-size: 11.5px; color: #5483B3; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }
    .form-input {
      padding: 10px 14px; border: 1.5px solid #C1E8FF; border-radius: 8px;
      font-size: 14px; color: #021024; font-family: inherit;
      background: #f9fdff; outline: none; transition: all 0.18s;
    }
    .form-input:focus {
      border-color: #5483B3;
      background: #fff;
      box-shadow: 0 0 0 3px rgba(84,131,179,0.15);
    }

    .success-msg {
      color: #059669; font-size: 13px; margin: 8px 0 0;
      background: #e9f7ef; padding: 10px 14px; border-radius: 8px;
      border: 1px solid #a9dfbf; font-weight: 500;
    }
  `],
})
export class SettingsComponent implements OnInit {
  loading = true;
  twoFactorEnabled = false;
  activeSection: 'account' | '2fa' | 'face' | null = null;

  // ── Account section ──
  userProfile: any = null;
  companyConfig: any = null;
  isCompanyOwner = false;

  editingUser = false;
  editName = '';
  editEmail = '';
  userSaving = false;
  userSaveError = '';
  userSaveSuccess = '';

  editingCompany = false;
  editCompanyName = '';
  editTaxRate = 0;
  editCurrency = '';
  editCompanyEmail = '';
  companySaving = false;
  companySaveError = '';
  companySaveSuccess = '';

  photoPreview: string | null = null;
  photoSaving = false;

  // ── 2FA section ──
  enableStep: SetupStep = 'idle';
  qrCode = '';
  manualSecret = '';
  confirmCode = '';

  disableStep: DisableStep = 'idle';
  disableCode = '';

  actionLoading = false;
  actionError = '';

  constructor(private authService: AuthService) { }

  ngOnInit() {
    this.isCompanyOwner = this.authService.getUserRole() === 'CompanyOwner';

    // Load profile
    this.authService.getProfile().subscribe({
      next: (profile: any) => {
        this.userProfile = profile;
        this.photoPreview = profile.photo || null;
      },
      error: () => { },
    });

    // Load company config (CompanyOwner only)
    if (this.isCompanyOwner) {
      this.authService.getCompanyConfig().subscribe({
        next: (config: any) => { this.companyConfig = config; },
        error: () => { },
      });
    }

    // Load 2FA status
    this.authService.get2faStatus().subscribe({
      next: (res) => {
        this.twoFactorEnabled = res.enabled;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  // ── Account: User editing ──

  startEditUser() {
    this.editName = this.userProfile.name;
    this.editEmail = this.userProfile.email;
    this.editingUser = true;
    this.userSaveError = '';
    this.userSaveSuccess = '';
  }

  cancelEditUser() {
    this.editingUser = false;
    this.userSaveError = '';
  }

  saveUser() {
    this.userSaving = true;
    this.userSaveError = '';
    this.userSaveSuccess = '';
    this.authService.updateProfile({ name: this.editName, email: this.editEmail }).subscribe({
      next: (updated: any) => {
        this.userProfile = updated;
        this.editingUser = false;
        this.userSaving = false;
        this.userSaveSuccess = 'Profile updated successfully.';
      },
      error: (err: any) => {
        this.userSaving = false;
        this.userSaveError = err.error?.message || 'Failed to update profile.';
      },
    });
  }

  // ── Account: Company editing ──

  startEditCompany() {
    this.editCompanyName = this.companyConfig.companyName;
    this.editTaxRate = this.companyConfig.taxRate;
    this.editCurrency = this.companyConfig.currency;
    this.editCompanyEmail = this.companyConfig.email;
    this.editingCompany = true;
    this.companySaveError = '';
    this.companySaveSuccess = '';
  }

  cancelEditCompany() {
    this.editingCompany = false;
    this.companySaveError = '';
  }

  saveCompany() {
    this.companySaving = true;
    this.companySaveError = '';
    this.companySaveSuccess = '';
    this.authService.updateCompanyConfig({
      companyName: this.editCompanyName,
      taxRate: this.editTaxRate,
      currency: this.editCurrency,
      email: this.editCompanyEmail,
    }).subscribe({
      next: (updated: any) => {
        this.companyConfig = updated;
        this.editingCompany = false;
        this.companySaving = false;
        this.companySaveSuccess = 'Company info updated successfully.';
      },
      error: (err: any) => {
        this.companySaving = false;
        this.companySaveError = err.error?.message || 'Failed to update company info.';
      },
    });
  }

  // ── Account: Photo upload ──

  onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];

    if (!file.type.startsWith('image/')) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Photo must be under 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      this.photoPreview = base64;
      this.photoSaving = true;
      this.authService.updatePhoto(base64).subscribe({
        next: () => {
          this.photoSaving = false;
          if (this.userProfile) this.userProfile.photo = base64;
        },
        error: () => {
          this.photoSaving = false;
          this.photoPreview = this.userProfile?.photo || null;
        },
      });
    };
    reader.readAsDataURL(file);
  }

  // ── 2FA: Enable flow ──

  startEnable() {
    this.actionLoading = true;
    this.actionError = '';
    this.authService.generate2fa().subscribe({
      next: (res) => {
        this.qrCode = res.qrCode;
        this.manualSecret = res.secret;
        this.actionLoading = false;
        this.enableStep = 'qr';
      },
      error: (err) => {
        this.actionLoading = false;
        this.actionError = err.error?.message || 'Failed to generate QR code.';
      },
    });
  }

  confirmEnable() {
    this.actionLoading = true;
    this.actionError = '';
    this.authService.enable2fa(this.confirmCode).subscribe({
      next: () => {
        this.actionLoading = false;
        this.twoFactorEnabled = true;
        this.enableStep = 'done';
        this.confirmCode = '';
      },
      error: (err) => {
        this.actionLoading = false;
        this.actionError = err.error?.message || 'Invalid code. Try again.';
        this.confirmCode = '';
      },
    });
  }

  cancelEnable() {
    this.enableStep = 'idle';
    this.qrCode = '';
    this.manualSecret = '';
    this.confirmCode = '';
    this.actionError = '';
  }

  // ── 2FA: Disable flow ──

  confirmDisable() {
    this.actionLoading = true;
    this.actionError = '';
    this.authService.disable2fa(this.disableCode).subscribe({
      next: () => {
        this.actionLoading = false;
        this.twoFactorEnabled = false;
        this.disableStep = 'idle';
        this.disableCode = '';
      },
      error: (err) => {
        this.actionLoading = false;
        this.actionError = err.error?.message || 'Invalid code. Try again.';
        this.disableCode = '';
      },
    });
  }

  cancelDisable() {
    this.disableStep = 'idle';
    this.disableCode = '';
    this.actionError = '';
  }
}
