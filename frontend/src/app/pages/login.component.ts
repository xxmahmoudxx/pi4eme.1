import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { FaceRecognitionService } from '../services/face-recognition.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule],
  template: `
    <div class="login-wrapper">
      <div class="login-card">

        <!-- Card Header -->
        <div class="card-header">
          <img class="card-logo" src="assets/tenexa-logo.png" alt="Tenexa Logo" />
          <h2>{{ 'AUTH.LOGIN_TITLE' | translate }}</h2>
          <p>{{ 'AUTH.LOGIN_SUB' | translate }}</p>
        </div>

        <div *ngIf="verifiedMessage" class="verified-banner">
          {{ 'AUTH.VERIFIED_SUCCESS' | translate }}
        </div>

        <!-- ── Tabs ── -->
        <div class="tabs" *ngIf="step === 'credentials'">
          <button class="tab" [class.active]="mode === 'password'" (click)="mode = 'password'; reset()">
            🔑 {{ 'AUTH.PASSWORD' | translate }}
          </button>
          <button class="tab" [class.active]="mode === 'face'" (click)="mode = 'face'; reset()">
            📷 {{ 'AUTH.FACE_LOGIN' | translate }}
          </button>
        </div>

        <!-- ─────────── PASSWORD MODE ─────────── -->
        <form *ngIf="mode === 'password' && step === 'credentials'" (ngSubmit)="submit()">
          <div class="form-group">
            <label>{{ 'AUTH.EMAIL' | translate }}</label>
            <input type="email" [(ngModel)]="email" name="email" required placeholder="you@example.com" />
          </div>
          <div class="form-group">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <label>{{ 'AUTH.PASSWORD' | translate }}</label>
              <a routerLink="/forgot-password" class="forgot-link">{{ 'AUTH.FORGOT' | translate }}</a>
            </div>
            <input type="password" [(ngModel)]="password" name="password" required placeholder="••••••••" />
          </div>
          <button class="btn-primary" type="submit" [disabled]="loading">
            {{ loading ? ('SETTINGS.SAVING' | translate) : ('AUTH.SIGNIN_BTN' | translate) }}
          </button>
        </form>

        <!-- ─────────── 2FA OTP STEP ─────────── -->
        <div *ngIf="step === 'otp'" class="otp-section">
          <div class="otp-icon">🔐</div>
          <h3>{{ 'SETTINGS.TWO_FACTOR' | translate }}</h3>
          <p class="otp-hint">{{ 'SETTINGS.ENTER_CODE' | translate }}</p>

          <input
            type="text"
            class="otp-input"
            [(ngModel)]="otpCode"
            name="otpCode"
            placeholder="000000"
            maxlength="6"
            inputmode="numeric"
            autocomplete="one-time-code"
          />

          <button class="btn-primary" (click)="submitOtp()" [disabled]="loading || otpCode.length !== 6">
            {{ loading ? ('SETTINGS.ACTIVATING' | translate) : ('SETTINGS.ACTIVATE_2FA' | translate) }}
          </button>

          <p *ngIf="otpError" class="error-msg">{{ otpError }}</p>
          <button class="btn-back" (click)="backToLogin()">← {{ 'SETTINGS.BACK' | translate }}</button>
        </div>

        <!-- ─────────── FACE LOGIN MODE ─────────── -->
        <div *ngIf="mode === 'face' && step === 'credentials'" class="face-section">
          <div class="form-group">
            <label>{{ 'AUTH.EMAIL' | translate }}</label>
            <input type="email" [(ngModel)]="email" name="email" placeholder="you@example.com" />
          </div>

          <div class="camera-container" [class.hidden]="!cameraActive">
            <video autoplay playsinline class="camera-preview"></video>
            <div class="camera-overlay">{{ 'FACE.CAMERA_OVERLAY' | translate }}</div>
          </div>

          <div class="status-badge" [ngClass]="faceStatus">
            <span *ngIf="faceStatus === 'idle'">{{ 'AUTH.FACE_IDLE' | translate }}</span>
            <span *ngIf="faceStatus === 'loading'">⏳ {{ 'FACE.LOADING_MODELS' | translate }}</span>
            <span *ngIf="faceStatus === 'camera'">✅ {{ 'AUTH.FACE_READY' | translate }}</span>
            <span *ngIf="faceStatus === 'scanning'">🔍 {{ 'FACE.SCANNING' | translate }}</span>
            <span *ngIf="faceStatus === 'success'">✅ {{ 'AUTH.FACE_SUCCESS' | translate }}</span>
            <span *ngIf="faceStatus === 'failed'">{{ errorMsg }}</span>
            <span *ngIf="faceStatus === 'no-face'">{{ 'FACE.NO_FACE' | translate }}</span>
          </div>

          <div class="face-buttons">
            <button class="btn-face"
                    *ngIf="!cameraActive && faceStatus !== 'success'"
                    [disabled]="!email || faceStatus === 'loading'"
                    (click)="openCamera()">
              {{ 'FACE.OPEN_CAMERA' | translate }}
            </button>
            <button class="btn-face capture"
                    *ngIf="cameraActive && faceStatus === 'camera'"
                    (click)="captureAndLogin()">
              {{ 'FACE.CAPTURE_LOGIN' | translate }}
            </button>
            <button class="btn-face retry"
                    *ngIf="faceStatus === 'failed' || faceStatus === 'no-face'"
                    (click)="openCamera()">
              {{ 'FACE.RETRY' | translate }}
            </button>
          </div>
        </div>

        <p class="hint" *ngIf="step === 'credentials'">
          {{ 'AUTH.NO_ACCOUNT' | translate }}
          <a routerLink="/signup">{{ 'AUTH.SIGNUP_LINK' | translate }}</a>
        </p>

        <div class="divider" *ngIf="step === 'credentials' && mode === 'password'">or</div>

        <a href="http://localhost:3000/auth/github" style="text-decoration: none;" *ngIf="step === 'credentials' && mode === 'password'">
          <button type="button" class="github-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577
              0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755
              -1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305
              3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93
              0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322
              3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405
              2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84
              1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81
              2.22 0 1.605-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795
              24 17.295 24 12c0-6.63-5.37-12-12-12"/>
            </svg>
            {{ 'AUTH.CONTINUE_GITHUB' | translate }}
          </button>
        </a>
      </div>
    </div>
  `,
  styles: [`
    .login-wrapper {
      min-height: calc(100vh - 64px);
      background: linear-gradient(145deg, #021024 0%, #052659 55%, #5483B3 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px 16px;
    }

    .login-card {
      max-width: 460px;
      width: 100%;
      background: rgba(255,255,255,0.98);
      border-radius: 20px;
      padding: 40px;
      box-shadow: 0 20px 60px rgba(2,16,36,0.4), 0 0 0 1px rgba(84,131,179,0.15);
    }

    .card-header {
      text-align: center;
      margin-bottom: 28px;
    }
    .card-logo {
      width: 60px; height: 60px;
      object-fit: contain;
      margin-bottom: 14px;
      border-radius: 14px;
      background: white;
      padding: 4px;
      box-shadow: 0 4px 16px rgba(2,16,36,0.15);
    }
    .card-header h2 {
      margin: 0 0 6px;
      font-size: 24px;
      font-weight: 800;
      color: #021024;
      border: none !important;
      padding: 0 !important;
    }
    .card-header p {
      margin: 0;
      font-size: 13.5px;
      color: #5483B3;
    }

    .verified-banner {
      background: #e9f7ef; color: #1e8449;
      border: 1px solid #a9dfbf; border-radius: 8px;
      padding: 10px 14px; margin-bottom: 16px;
      font-size: 13px; font-weight: 500;
    }

    .tabs {
      display: flex; gap: 0;
      border: 1.5px solid #C1E8FF; border-radius: 10px;
      overflow: hidden; margin-bottom: 22px;
      background: #f0f6ff;
    }
    .tab {
      flex: 1; padding: 11px 10px; border: none;
      background: transparent; cursor: pointer;
      font-size: 13.5px; font-weight: 500; color: #5483B3;
      font-family: inherit;
      transition: all 0.18s ease;
    }
    .tab.active {
      background: linear-gradient(135deg, #052659, #5483B3);
      color: #fff; font-weight: 700;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(5,38,89,0.25);
    }
    .tab:hover:not(.active) { background: rgba(193,232,255,0.5); color: #052659; }

    form { display: flex; flex-direction: column; gap: 16px; }

    .form-group { display: flex; flex-direction: column; gap: 6px; }

    .forgot-link {
      font-size: 11.5px; font-weight: 700;
      color: #5483B3; text-decoration: none;
      transition: color 0.2s;
    }
    .forgot-link:hover { color: #021024; text-decoration: underline; }

    label {
      font-size: 11.5px; font-weight: 700;
      color: #5483B3; letter-spacing: 0.6px; text-transform: uppercase;
    }
    input[type=email], input[type=password], input[type=text] {
      width: 100%; padding: 11px 14px;
      border-radius: 8px; border: 1.5px solid #C1E8FF;
      font-size: 14px; font-family: inherit;
      color: #021024; background: #f9fdff;
      transition: all 0.18s ease;
      outline: none;
    }
    input:focus {
      border-color: #5483B3;
      background: #fff;
      box-shadow: 0 0 0 3px rgba(84,131,179,0.15);
    }

    .btn-primary {
      width: 100%; padding: 13px 20px;
      background: linear-gradient(135deg, #052659 0%, #5483B3 100%);
      color: #fff; border: none; border-radius: 8px;
      font-size: 15px; font-weight: 700; font-family: inherit;
      cursor: pointer; transition: all 0.2s;
      box-shadow: 0 2px 10px rgba(5,38,89,0.3);
      letter-spacing: 0.2px;
    }
    .btn-primary:hover:not(:disabled) {
      background: linear-gradient(135deg, #021024 0%, #052659 100%);
      box-shadow: 0 4px 16px rgba(5,38,89,0.4);
      transform: translateY(-1px);
    }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

    .hint { font-size: 13px; color: #5483B3; margin-top: 14px; text-align: center; }
    .hint a { color: #052659; font-weight: 700; text-decoration: none; }
    .hint a:hover { text-decoration: underline; }

    /* OTP */
    .otp-section {
      display: flex; flex-direction: column; align-items: center;
      gap: 16px; padding: 10px 0;
    }
    .otp-icon { font-size: 52px; line-height: 1; }
    .otp-section h3 { margin: 0; font-size: 20px; font-weight: 700; color: #021024; border: none !important; padding: 0 !important; }
    .otp-hint { margin: 0; font-size: 13px; color: #5483B3; text-align: center; }
    .otp-input {
      width: 170px; text-align: center; font-size: 30px; letter-spacing: 8px;
      padding: 14px; border-radius: 10px; border: 2px solid #5483B3;
      font-weight: 700; color: #052659; font-family: monospace;
      background: #f0f6ff;
    }
    .otp-input:focus { outline: none; border-color: #052659; box-shadow: 0 0 0 3px rgba(84,131,179,0.2); }
    .error-msg { color: #c0392b; font-size: 13px; margin: 0; }
    .btn-back {
      background: none; border: none; color: #5483B3; cursor: pointer;
      font-size: 13px; padding: 4px; font-family: inherit;
      transition: color 0.15s;
    }
    .btn-back:hover { color: #021024; }

    /* Face */
    .face-section { display: flex; flex-direction: column; gap: 12px; }
    .camera-container { position: relative; border-radius: 12px; overflow: hidden; background: #000; }
    .camera-container.hidden { display: none; }
    .camera-preview { width: 100%; max-height: 250px; object-fit: cover; display: block; }
    .camera-overlay {
      position: absolute; bottom: 0; left: 0; right: 0;
      padding: 7px; background: rgba(2,16,36,.65); color: #C1E8FF;
      font-size: 12px; text-align: center; letter-spacing: 0.3px;
    }

    .status-badge {
      padding: 10px 14px; border-radius: 8px;
      background: #f0f6ff; color: #052659; font-size: 13px;
      border: 1px solid #C1E8FF;
    }
    .status-badge.success  { background: #e9f7ef; color: #1e8449; border-color: #a9dfbf; font-weight: 600; }
    .status-badge.failed   { background: #fce7e7; color: #c0392b; border-color: #f5b7b1; }
    .status-badge.no-face  { background: #fef9e7; color: #b7770d; border-color: #f9e79f; }
    .status-badge.scanning,
    .status-badge.loading  { background: #fef9e7; color: #b7770d; border-color: #f9e79f; }
    .status-badge.camera   { background: #C1E8FF; color: #052659; border-color: #7DA0CA; }

    .face-buttons { display: flex; gap: 10px; flex-wrap: wrap; }
    .btn-face {
      padding: 10px 20px; border-radius: 8px; border: none;
      background: linear-gradient(135deg, #052659, #5483B3);
      color: #fff; cursor: pointer;
      font-weight: 600; font-size: 13px; font-family: inherit;
      transition: all 0.2s;
      box-shadow: 0 2px 8px rgba(5,38,89,0.25);
    }
    .btn-face:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(5,38,89,0.35); }
    .btn-face:disabled { opacity: .5; cursor: not-allowed; transform: none; }
    .btn-face.capture { background: linear-gradient(135deg, #059669, #10b981); }
    .btn-face.retry   { background: linear-gradient(135deg, #b7770d, #f59e0b); }

    /* GitHub */
    .github-btn {
      display: flex; align-items: center; justify-content: center; gap: 10px;
      width: 100%; padding: 11px 16px; background-color: #1c1c1e; color: white;
      border: 1.5px solid #333; border-radius: 8px;
      font-size: 14px; font-weight: 600; font-family: inherit;
      cursor: pointer; transition: all 0.2s;
    }
    .github-btn:hover { background-color: #2d2d30; border-color: #555; transform: translateY(-1px); }

    .divider {
      display: flex; align-items: center; gap: 12px;
      margin: 14px 0 6px; color: #7DA0CA; font-size: 12px; font-weight: 600;
      letter-spacing: 1px; text-transform: uppercase;
    }
    .divider::before, .divider::after {
      content: ''; flex: 1; height: 1px; background: #C1E8FF;
    }
  `],
})
export class LoginComponent {
  mode: 'password' | 'face' = 'password';
  step: 'credentials' | 'otp' = 'credentials';
  verifiedMessage = false;
  email = '';
  password = '';
  loading = false;

  tempToken = '';
  otpCode = '';
  otpError = '';

  faceStatus: 'idle' | 'loading' | 'camera' | 'scanning' | 'success' | 'failed' | 'no-face' = 'idle';
  errorMsg = '';
  cameraActive = false;
  private stream: MediaStream | null = null;

  constructor(
    private authService: AuthService,
    private faceService: FaceRecognitionService,
    private router: Router,
    private route: ActivatedRoute,
    private translate: TranslateService,
  ) {
    this.verifiedMessage = this.route.snapshot.queryParams['verified'] === 'true';
  }

  reset() {
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.cameraActive = false;
    this.faceStatus = 'idle';
    this.errorMsg = '';
    this.loading = false;
  }

  backToLogin() {
    this.step = 'credentials';
    this.tempToken = '';
    this.otpCode = '';
    this.otpError = '';
    this.loading = false;
  }

  submit() {
    this.loading = true;
    this.authService.login(this.email, this.password).subscribe({
      next: (response: any) => {
        this.loading = false;
        if (response.requiresTwoFactor) {
          this.tempToken = response.tempToken;
          this.step = 'otp';
        } else {
          this.navigateAfterLogin();
        }
      },
      error: (err) => {
        this.loading = false;
        alert(err.error?.message || this.translate.instant('LOGIN.FAILED'));
      },
    });
  }

  submitOtp() {
    this.loading = true;
    this.otpError = '';
    this.authService.verifyTwoFactor(this.tempToken, this.otpCode).subscribe({
      next: () => {
        this.loading = false;
        this.navigateAfterLogin();
      },
      error: (err) => {
        this.loading = false;
        this.otpError = err.error?.message || this.translate.instant('AUTH.INVALID_OTP');
        this.otpCode = '';
      },
    });
  }

  private navigateAfterLogin() {
    const role = this.authService['currentUserRole'].value;
    if (role === 'Admin') {
      this.router.navigate(['/admin']);
    } else {
      this.router.navigate(['/sales']);
    }
  }

  async openCamera() {
    if (!this.email) { alert(this.translate.instant('AUTH.ENTER_EMAIL_FIRST')); return; }
    this.faceStatus = 'loading';
    try {
      const [stream] = await Promise.all([
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } }),
        this.faceService.loadModels(),
      ]);
      this.stream = stream;
      this.cameraActive = true;
      this.faceStatus = 'camera';
      setTimeout(() => {
        const video = document.querySelector<HTMLVideoElement>('video.camera-preview');
        if (video) video.srcObject = this.stream;
      }, 100);
    } catch {
      this.errorMsg = this.translate.instant('FACE.CAMERA_DENIED');
      this.faceStatus = 'failed';
      this.cameraActive = false;
    }
  }

  async captureAndLogin() {
    const video = document.querySelector<HTMLVideoElement>('video.camera-preview');
    if (!video) return;
    this.faceStatus = 'scanning';

    const descriptor = await this.faceService.getEmbedding(video);

    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.cameraActive = false;

    if (!descriptor) { this.faceStatus = 'no-face'; return; }

    try {
      const result = await this.faceService.faceLogin(this.email, descriptor);
      this.faceStatus = 'success';
      this.authService.setToken(result.access_token);
      setTimeout(() => this.router.navigate(['/sales']), 1000);
    } catch (err: any) {
      this.errorMsg = err.error?.message || this.translate.instant('AUTH.FACE_LOGIN_FAILED');
      this.faceStatus = 'failed';
    }
  }

  ngOnDestroy() {
    this.stream?.getTracks().forEach(t => t.stop());
  }
}