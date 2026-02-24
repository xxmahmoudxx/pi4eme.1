import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';

type SetupStep = 'idle' | 'qr' | 'confirming' | 'done';
type DisableStep = 'idle' | 'confirming';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="card settings-card">
        <h2>Account Settings</h2>

        <!-- ── Loading ── -->
        <div *ngIf="loading" class="status-loading">Loading…</div>

        <!-- ── 2FA Section ── -->
        <section *ngIf="!loading" class="section-2fa">
          <div class="section-header">
            <div>
              <h3>Two-Factor Authentication</h3>
              <p class="section-desc">Add an extra layer of security — require a code from Google Authenticator on each login.</p>
            </div>
            <span class="badge" [class.badge-on]="twoFactorEnabled" [class.badge-off]="!twoFactorEnabled">
              {{ twoFactorEnabled ? 'ON' : 'OFF' }}
            </span>
          </div>

          <!-- ────────── ENABLE FLOW ────────── -->
          <ng-container *ngIf="!twoFactorEnabled">

            <!-- Step 1: Initial button -->
            <div *ngIf="enableStep === 'idle'" class="action-area">
              <button class="btn btn-primary" (click)="startEnable()" [disabled]="actionLoading">
                {{ actionLoading ? 'Generating…' : 'Enable 2FA' }}
              </button>
            </div>

            <!-- Step 2: Show QR code -->
            <div *ngIf="enableStep === 'qr'" class="qr-area">
              <p class="qr-instructions">
                1. Open <strong>Google Authenticator</strong> on your phone.<br>
                2. Tap <strong>+</strong> → <strong>Scan a QR code</strong>.<br>
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
                I've scanned it — Enter code
              </button>
              <button class="btn btn-ghost" (click)="cancelEnable()">Cancel</button>
            </div>

            <!-- Step 3: Confirm with 6-digit code -->
            <div *ngIf="enableStep === 'confirming'" class="confirm-area">
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
                  {{ actionLoading ? 'Activating…' : 'Activate 2FA' }}
                </button>
                <button class="btn btn-ghost" (click)="enableStep = 'qr'" [disabled]="actionLoading">
                  Back
                </button>
              </div>
            </div>

            <!-- Step 4: Done -->
            <div *ngIf="enableStep === 'done'" class="success-banner">
              ✅ 2FA is now active. You'll be asked for a code on your next login.
            </div>
          </ng-container>

          <!-- ────────── DISABLE FLOW ────────── -->
          <ng-container *ngIf="twoFactorEnabled">
            <div *ngIf="disableStep === 'idle'" class="action-area">
              <button class="btn btn-danger" (click)="disableStep = 'confirming'">
                Disable 2FA
              </button>
            </div>

            <div *ngIf="disableStep === 'confirming'" class="confirm-area">
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
                  {{ actionLoading ? 'Disabling…' : 'Confirm Disable' }}
                </button>
                <button class="btn btn-ghost" (click)="cancelDisable()" [disabled]="actionLoading">
                  Cancel
                </button>
              </div>
            </div>
          </ng-container>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .page-container { max-width: 620px; margin: 40px auto; padding: 0 16px; }
    .settings-card { padding: 32px; }

    h2 { margin: 0 0 24px; font-size: 22px; color: #111827; }

    .section-2fa { border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px; }

    .section-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      margin-bottom: 18px; gap: 12px;
    }
    .section-header h3 { margin: 0 0 4px; font-size: 16px; color: #1f2937; }
    .section-desc { margin: 0; font-size: 13px; color: #6b7280; line-height: 1.5; }

    .badge {
      font-size: 11px; font-weight: 700; padding: 3px 8px;
      border-radius: 99px; white-space: nowrap; flex-shrink: 0;
    }
    .badge-on  { background: #d1fae5; color: #065f46; }
    .badge-off { background: #f3f4f6; color: #6b7280; }

    .status-loading { padding: 40px; text-align: center; color: #9ca3af; }

    /* Buttons */
    .btn {
      padding: 9px 18px; border-radius: 7px; border: none;
      font-size: 14px; font-weight: 600; cursor: pointer;
      transition: background .15s, opacity .15s;
    }
    .btn:disabled { opacity: .5; cursor: not-allowed; }
    .btn-primary { background: #3b82f6; color: #fff; }
    .btn-primary:hover:not(:disabled) { background: #2563eb; }
    .btn-success { background: #10b981; color: #fff; }
    .btn-success:hover:not(:disabled) { background: #059669; }
    .btn-danger { background: #ef4444; color: #fff; }
    .btn-danger:hover:not(:disabled) { background: #dc2626; }
    .btn-ghost { background: #f3f4f6; color: #374151; }
    .btn-ghost:hover:not(:disabled) { background: #e5e7eb; }
    .btn-row { display: flex; gap: 10px; flex-wrap: wrap; }

    /* QR area */
    .qr-area { display: flex; flex-direction: column; gap: 14px; }
    .qr-instructions { margin: 0; font-size: 13px; color: #374151; line-height: 1.7; }
    .qr-wrapper {
      display: flex; justify-content: center;
      background: #fff; border: 1px solid #e5e7eb;
      border-radius: 8px; padding: 12px; width: fit-content;
    }
    .qr-image { width: 200px; height: 200px; display: block; }
    .manual-key {
      font-size: 12px; color: #6b7280; margin: 0;
      background: #f9fafb; padding: 10px; border-radius: 6px;
    }
    .manual-key code { font-family: monospace; letter-spacing: 1px; color: #1f2937; font-size: 13px; }

    /* Confirm area */
    .confirm-area { display: flex; flex-direction: column; gap: 12px; }
    .confirm-desc { margin: 0; font-size: 13px; color: #374151; }

    .otp-input {
      width: 140px; text-align: center; font-size: 26px; letter-spacing: 6px;
      padding: 10px; border-radius: 8px; border: 2px solid #3b82f6;
      font-weight: 700; color: #1d4ed8;
    }
    .otp-input:focus { outline: none; border-color: #1d4ed8; box-shadow: 0 0 0 3px rgba(59,130,246,.2); }

    .error-msg { color: #dc2626; font-size: 13px; margin: 0; }

    .action-area { padding: 4px 0; }

    .success-banner {
      background: #d1fae5; color: #065f46;
      border-radius: 8px; padding: 12px 16px;
      font-size: 14px; font-weight: 600;
    }
  `],
})
export class SettingsComponent implements OnInit {
  loading = true;
  twoFactorEnabled = false;

  // Enable flow
  enableStep: SetupStep = 'idle';
  qrCode = '';
  manualSecret = '';
  confirmCode = '';

  // Disable flow
  disableStep: DisableStep = 'idle';
  disableCode = '';

  actionLoading = false;
  actionError = '';

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.authService.get2faStatus().subscribe({
      next: (res) => {
        this.twoFactorEnabled = res.enabled;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

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
