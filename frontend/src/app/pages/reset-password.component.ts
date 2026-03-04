import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="page-wrapper">
      <div class="card">

        <!-- Invalid token state -->
        <ng-container *ngIf="!token">
          <div class="icon-wrap">⚠️</div>
          <h2>Invalid Link</h2>
          <p class="subtitle">This password reset link is missing or invalid. Please request a new one.</p>
          <a routerLink="/forgot-password" class="btn-primary" style="text-decoration: none; text-align: center; display: flex; justify-content: center;">Request New Link</a>
        </ng-container>

        <!-- Reset form -->
        <ng-container *ngIf="token && !completed">
          <div class="icon-wrap">🔑</div>
          <h2>Reset Password</h2>
          <p class="subtitle">Choose a strong new password for your account.</p>

          <form (ngSubmit)="submit()">
            <div class="form-group">
              <label>New Password</label>
              <div class="input-wrap">
                <input
                  [type]="showNew ? 'text' : 'password'"
                  [(ngModel)]="newPassword"
                  name="newPassword"
                  minlength="8"
                  required
                  placeholder="At least 8 characters"
                />
                <button type="button" class="eye-btn" (click)="showNew = !showNew">
                  {{ showNew ? '🙈' : '👁️' }}
                </button>
              </div>
            </div>

            <div class="form-group">
              <label>Confirm New Password</label>
              <div class="input-wrap">
                <input
                  [type]="showConfirm ? 'text' : 'password'"
                  [(ngModel)]="confirmPassword"
                  name="confirmPassword"
                  minlength="8"
                  required
                  placeholder="Repeat your new password"
                />
                <button type="button" class="eye-btn" (click)="showConfirm = !showConfirm">
                  {{ showConfirm ? '🙈' : '👁️' }}
                </button>
              </div>
              <div class="strength-bar" *ngIf="newPassword">
                <div class="strength-fill" [style.width]="strengthPct + '%'" [class]="strengthClass"></div>
              </div>
              <span class="strength-label" *ngIf="newPassword" [class]="strengthClass">{{ strengthLabel }}</span>
            </div>

            <p class="error-msg" *ngIf="error">{{ error }}</p>

            <button class="btn-primary" type="submit" [disabled]="loading || newPassword.length < 8 || !confirmPassword">
              <span *ngIf="!loading">Reset Password</span>
              <span *ngIf="loading" class="spinner"></span>
            </button>

            <a routerLink="/login" class="back-link">← Back to Login</a>
          </form>
        </ng-container>

        <!-- Success state -->
        <ng-container *ngIf="completed">
          <div class="icon-wrap">✅</div>
          <h2>Password Updated!</h2>
          <p class="subtitle">Your password has been reset successfully. You can now log in with your new password.</p>
          <a routerLink="/login" class="btn-primary" style="text-decoration: none; text-align: center; display: flex; justify-content: center;">Go to Login</a>
        </ng-container>

      </div>
    </div>
  `,
  styles: [`
    .page-wrapper {
      min-height: calc(100vh - 64px);
      background: linear-gradient(145deg, #021024 0%, #052659 55%, #5483B3 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px 16px;
    }

    .card {
      max-width: 440px;
      width: 100%;
      background: rgba(255,255,255,0.98);
      border-radius: 20px;
      padding: 44px 40px;
      box-shadow: 0 20px 60px rgba(2,16,36,0.4), 0 0 0 1px rgba(84,131,179,0.15);
      text-align: center;
    }

    .icon-wrap {
      font-size: 52px;
      margin-bottom: 16px;
      line-height: 1;
    }

    h2 {
      margin: 0 0 8px;
      font-size: 24px;
      font-weight: 800;
      color: #021024;
    }

    .subtitle {
      margin: 0 0 28px;
      font-size: 13.5px;
      color: #5483B3;
      line-height: 1.6;
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      text-align: left;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    label {
      font-size: 11.5px;
      font-weight: 700;
      color: #5483B3;
      letter-spacing: 0.6px;
      text-transform: uppercase;
    }

    .input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }

    input {
      width: 100%;
      padding: 11px 44px 11px 14px;
      border-radius: 8px;
      border: 1.5px solid #C1E8FF;
      font-size: 14px;
      font-family: inherit;
      color: #021024;
      background: #f9fdff;
      transition: all 0.18s ease;
      outline: none;
      box-sizing: border-box;
    }
    input:focus {
      border-color: #5483B3;
      background: #fff;
      box-shadow: 0 0 0 3px rgba(84,131,179,0.15);
    }

    .eye-btn {
      position: absolute;
      right: 10px;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
      padding: 2px;
    }

    /* Password strength */
    .strength-bar {
      height: 4px;
      background: #e2e8f0;
      border-radius: 99px;
      overflow: hidden;
      margin-top: 4px;
    }
    .strength-fill {
      height: 100%;
      border-radius: 99px;
      transition: width 0.3s ease, background 0.3s;
    }
    .strength-fill.weak   { background: #e53e3e; }
    .strength-fill.fair   { background: #dd6b20; }
    .strength-fill.good   { background: #d69e2e; }
    .strength-fill.strong { background: #38a169; }
    .strength-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .strength-label.weak   { color: #e53e3e; }
    .strength-label.fair   { color: #dd6b20; }
    .strength-label.good   { color: #d69e2e; }
    .strength-label.strong { color: #38a169; }

    .btn-primary {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      padding: 13px 20px;
      background: linear-gradient(135deg, #052659 0%, #5483B3 100%);
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 2px 10px rgba(5,38,89,0.3);
      box-sizing: border-box;
    }
    .btn-primary:hover:not(:disabled) {
      background: linear-gradient(135deg, #021024 0%, #052659 100%);
      box-shadow: 0 4px 16px rgba(5,38,89,0.4);
      transform: translateY(-1px);
    }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

    .spinner {
      width: 18px; height: 18px;
      border: 3px solid rgba(255,255,255,0.4);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .back-link {
      text-align: center;
      font-size: 13px;
      color: #5483B3;
      text-decoration: none;
      font-weight: 600;
      transition: color 0.2s;
    }
    .back-link:hover { color: #021024; }

    .error-msg {
      font-size: 12px;
      color: #c53030;
      margin: 0;
      text-align: center;
    }
  `],
})
export class ResetPasswordComponent {
  newPassword = '';
  confirmPassword = '';
  error = '';
  completed = false;
  loading = false;
  showNew = false;
  showConfirm = false;
  token: string | null;

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router,
  ) {
    this.token = this.route.snapshot.queryParamMap.get('token');
  }

  get strengthPct(): number {
    const p = this.newPassword;
    let score = 0;
    if (p.length >= 8) score++;
    if (p.length >= 12) score++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
    if (/\d/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return (score / 5) * 100;
  }

  get strengthClass(): string {
    const pct = this.strengthPct;
    if (pct <= 25) return 'weak';
    if (pct <= 50) return 'fair';
    if (pct <= 75) return 'good';
    return 'strong';
  }

  get strengthLabel(): string {
    const map: Record<string, string> = { weak: 'Weak', fair: 'Fair', good: 'Good', strong: 'Strong' };
    return map[this.strengthClass];
  }

  submit() {
    this.error = '';

    if (!this.token) {
      this.error = 'Invalid reset link.';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.error = 'Passwords do not match.';
      return;
    }

    if (this.newPassword.length < 8) {
      this.error = 'Password must be at least 8 characters.';
      return;
    }

    this.loading = true;
    this.authService.resetPassword(this.token, this.newPassword).subscribe({
      next: () => {
        this.loading = false;
        this.completed = true;
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'Failed to reset password. The link may have expired.';
      },
    });
  }
}
