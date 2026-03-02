import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { FaceRecognitionService } from '../services/face-recognition.service';
import { TranslateModule } from '@ngx-translate/core';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule],
  template: `
    <div class="card login-card">
      <h2>{{ 'LOGIN.TITLE' | translate }}</h2>
      <p>{{ 'LOGIN.SUBTITLE' | translate }}</p>

      <div *ngIf="verifiedMessage" class="verified-banner">
        Email verified successfully! You can now log in.
      </div>

      <!-- ── Tabs ── -->
      <div class="tabs" *ngIf="step === 'credentials'">
        <button class="tab" [class.active]="mode === 'password'" (click)="mode = 'password'; reset()">
          Password
        </button>
        <button class="tab" [class.active]="mode === 'face'" (click)="mode = 'face'; reset()">
          Face Login
        </button>
      </div>

      <!-- ─────────── PASSWORD MODE ─────────── -->
      <form *ngIf="mode === 'password' && step === 'credentials'" (ngSubmit)="submit()">
        <label>{{ 'LOGIN.EMAIL' | translate }}</label>
        <input type="email" [(ngModel)]="email" name="email" required />

        <label>{{ 'LOGIN.PASSWORD' | translate }}</label>
        <input type="password" [(ngModel)]="password" name="password" required />

        <button class="button" type="submit" [disabled]="loading">
          {{ loading ? 'Signing in...' : ('LOGIN.SUBMIT' | translate) }}
        </button>
      </form>

      <!-- ─────────── 2FA OTP STEP ─────────── -->
      <div *ngIf="step === 'otp'" class="otp-section">
        <div class="otp-icon">🔐</div>
        <h3>Two-Factor Authentication</h3>
        <p class="otp-hint">Open Google Authenticator and enter the 6-digit code.</p>

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

        <button class="button" (click)="submitOtp()" [disabled]="loading || otpCode.length !== 6">
          {{ loading ? 'Verifying...' : 'Verify Code' }}
        </button>

        <p *ngIf="otpError" class="error-msg">{{ otpError }}</p>

        <button class="btn-back" (click)="backToLogin()">Back to login</button>
      </div>

      <!-- ─────────── FACE LOGIN MODE ─────────── -->
      <div *ngIf="mode === 'face' && step === 'credentials'" class="face-section">
        <label>Your Email (so we know whose face to match)</label>
        <input type="email" [(ngModel)]="email" name="email" placeholder="Your email address" />

        <div class="camera-container" [class.hidden]="!cameraActive">
          <video autoplay playsinline class="camera-preview"></video>
          <div class="camera-overlay">Look directly at the camera</div>
        </div>

        <div class="status-badge" [ngClass]="faceStatus">
          <span *ngIf="faceStatus === 'idle'">Enter your email then open camera</span>
          <span *ngIf="faceStatus === 'loading'">Loading AI models...</span>
          <span *ngIf="faceStatus === 'camera'">Ready - click Capture when in frame</span>
          <span *ngIf="faceStatus === 'scanning'">Analysing face...</span>
          <span *ngIf="faceStatus === 'success'">Face matched! Logging you in...</span>
          <span *ngIf="faceStatus === 'failed'">{{ errorMsg }}</span>
          <span *ngIf="faceStatus === 'no-face'">No face detected - move closer and retry</span>
        </div>

        <div class="face-buttons">
          <button class="btn-face"
                  *ngIf="!cameraActive && faceStatus !== 'success'"
                  [disabled]="!email || faceStatus === 'loading'"
                  (click)="openCamera()">
            Open Camera
          </button>
          <button class="btn-face capture"
                  *ngIf="cameraActive && faceStatus === 'camera'"
                  (click)="captureAndLogin()">
            Capture &amp; Login
          </button>
          <button class="btn-face retry"
                  *ngIf="faceStatus === 'failed' || faceStatus === 'no-face'"
                  (click)="openCamera()">
            Retry
          </button>
        </div>
      </div>

      <p class="hint" *ngIf="step === 'credentials'">
        {{ 'LOGIN.NEW_HERE' | translate }}
        <a routerLink="/signup">{{ 'LOGIN.CREATE_ACCOUNT' | translate }}</a>
      </p>

      <a href="http://localhost:3000/auth/github" style="text-decoration: none;">
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
          Continue with GitHub
        </button>
      </a>
    </div>
  `,
  styles: [`
    .login-card { max-width: 440px; margin: 40px auto; }

    .verified-banner {
      background: #d1fae5; color: #065f46;
      border: 1px solid #6ee7b7; border-radius: 6px;
      padding: 10px 14px; margin-bottom: 12px;
      font-size: 14px; font-weight: 500;
    }

    .tabs { display: flex; gap: 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 4px; }
    .tab {
      flex: 1; padding: 10px; border: none; background: #f9fafb;
      cursor: pointer; font-size: 14px; color: #6b7280;
      transition: background .15s, color .15s;
    }
    .tab.active { background: #fff; color: #1d4ed8; font-weight: 600; }
    .tab:hover:not(.active) { background: #f3f4f6; }

    form { display: flex; flex-direction: column; gap: 10px; }
    input { padding: 9px; border-radius: 6px; border: 1px solid #d1d5db; font-size: 14px; }
    .hint { font-size: 12px; color: #6b7280; margin-top: 12px; }

    .otp-section {
      display: flex; flex-direction: column; align-items: center;
      gap: 14px; padding: 10px 0;
    }
    .otp-icon { font-size: 48px; line-height: 1; }
    .otp-section h3 { margin: 0; font-size: 18px; color: #1f2937; }
    .otp-hint { margin: 0; font-size: 13px; color: #6b7280; text-align: center; }
    .otp-input {
      width: 160px; text-align: center; font-size: 28px; letter-spacing: 6px;
      padding: 12px; border-radius: 8px; border: 2px solid #3b82f6;
      font-weight: 700; color: #1d4ed8;
    }
    .otp-input:focus { outline: none; border-color: #1d4ed8; box-shadow: 0 0 0 3px rgba(59,130,246,.2); }
    .error-msg { color: #dc2626; font-size: 13px; margin: 0; }
    .btn-back {
      background: none; border: none; color: #6b7280; cursor: pointer;
      font-size: 13px; padding: 4px;
    }
    .btn-back:hover { color: #374151; }

    .face-section { display: flex; flex-direction: column; gap: 10px; }
    .camera-container { position: relative; border-radius: 10px; overflow: hidden; background: #000; }
    .camera-container.hidden { display: none; }
    .camera-preview { width: 100%; max-height: 250px; object-fit: cover; display: block; }
    .camera-overlay {
      position: absolute; bottom: 0; left: 0; right: 0;
      padding: 7px; background: rgba(0,0,0,.5); color: #fff;
      font-size: 12px; text-align: center;
    }

    .status-badge { padding: 9px 14px; border-radius: 8px; background: #f3f4f6; color: #374151; font-size: 13px; }
    .status-badge.success  { background: #d1fae5; color: #065f46; font-weight: 600; }
    .status-badge.failed   { background: #fee2e2; color: #991b1b; }
    .status-badge.no-face  { background: #fef3c7; color: #92400e; }
    .status-badge.scanning,
    .status-badge.loading  { background: #fef3c7; color: #92400e; }
    .status-badge.camera   { background: #eff6ff; color: #1e40af; }

    .face-buttons { display: flex; gap: 10px; flex-wrap: wrap; }
    .btn-face {
      padding: 9px 18px; border-radius: 8px; border: none;
      background: #3b82f6; color: #fff; cursor: pointer;
      font-weight: 600; font-size: 13px; transition: background .2s;
    }
    .btn-face:hover { background: #2563eb; }
    .btn-face:disabled { opacity: .5; cursor: not-allowed; }
    .btn-face.capture { background: #10b981; }
    .btn-face.capture:hover { background: #059669; }
    .btn-face.retry { background: #f59e0b; }

    .github-btn {
      display: flex; align-items: center; justify-content: center; gap: 10px;
      width: 100%; padding: 10px 16px; background-color: #24292e; color: white;
      border: none; border-radius: 6px; font-size: 14px; font-weight: 600;
      cursor: pointer; margin-top: 12px; transition: background-color 0.2s;
    }
    .github-btn:hover { background-color: #3a3f44; }
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
        alert(err.error?.message || 'Login failed. Check credentials.');
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
        this.otpError = err.error?.message || 'Invalid code. Try again.';
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
    if (!this.email) { alert('Please enter your email first'); return; }
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
      this.errorMsg = 'Camera access denied - please allow camera permission.';
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
      this.errorMsg = err.error?.message || 'Face login failed - try again or use password';
      this.faceStatus = 'failed';
    }
  }

  ngOnDestroy() {
    this.stream?.getTracks().forEach(t => t.stop());
  }
}