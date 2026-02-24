import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { FaceRecognitionService } from '../services/face-recognition.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule],
  template: `
    <div class="card signup-card">
      <h2>{{ 'SIGNUP.TITLE' | translate }}</h2>
      <p>{{ 'SIGNUP.SUBTITLE' | translate }}</p>

      <!-- ── Step 1: Registration Form ── -->
      <form (ngSubmit)="submit()" *ngIf="step === 'form'">
        <label>{{ 'SIGNUP.NAME' | translate }}</label>
        <input type="text" [(ngModel)]="name" name="name" required />

        <label>{{ 'SIGNUP.EMAIL' | translate }}</label>
        <input type="email" [(ngModel)]="email" name="email" required />

        <label>{{ 'SIGNUP.PASSWORD' | translate }}</label>
        <input type="password" [(ngModel)]="password" name="password" minlength="8" required />

        <label>{{ 'SIGNUP.ROLE' | translate }}</label>
        <div class="role-row">
          <label><input type="radio" name="role" [(ngModel)]="role" value="CompanyOwner" /> {{ 'SIGNUP.OWNER' | translate }}</label>
          <label><input type="radio" name="role" [(ngModel)]="role" value="Accountant" /> {{ 'SIGNUP.ACCOUNTANT' | translate }}</label>
        </div>

        <ng-container *ngIf="role === 'CompanyOwner'">
          <label>{{ 'SIGNUP.COMPANY_NAME' | translate }}</label>
          <input type="text" [(ngModel)]="companyName" name="companyName" required />

          <label>{{ 'SIGNUP.TAX_RATE' | translate }}</label>
          <input type="number" [(ngModel)]="taxRate" name="taxRate" min="0" step="0.01" required />

          <label>{{ 'SIGNUP.CURRENCY' | translate }}</label>
          <input type="text" [(ngModel)]="currency" name="currency" required />

          <label>{{ 'SIGNUP.NOTIF_EMAIL' | translate }}</label>
          <input type="email" [(ngModel)]="notificationEmail" name="notificationEmail" />
        </ng-container>

        <ng-container *ngIf="role === 'Accountant'">
          <label>{{ 'SIGNUP.COMPANY_ID' | translate }}</label>
          <input type="text" [(ngModel)]="companyId" name="companyId" required />
          <p class="hint">{{ 'SIGNUP.ID_HINT' | translate }}</p>
        </ng-container>

        <button class="button" type="submit" [disabled]="submitting">
          {{ submitting ? 'Creating account...' : ('SIGNUP.SUBMIT' | translate) }}
        </button>
        <p class="hint">
          {{ 'SIGNUP.ALREADY_HAVE' | translate }}
          <a routerLink="/login">{{ 'SIGNUP.LOGIN' | translate }}</a>
        </p>
      </form>

      <!-- ── Step 2: Face Enroll (after account created) ── -->
      <div *ngIf="step === 'face'" class="face-section">
        <h3>🔐 Face Enrollment <span class="badge">Optional</span></h3>
        <p class="hint">Enroll your face for quick login. You can skip this and do it later.</p>

        <!-- Live camera preview -->
        <div class="camera-container" [class.hidden]="!cameraActive">
          <video #videoEl autoplay playsinline class="camera-preview"></video>
          <div class="camera-overlay">Look directly at the camera</div>
        </div>

        <!-- Status badge -->
        <div class="status-badge" [ngClass]="faceStatus">
          <span *ngIf="faceStatus === 'idle'">📷 Camera not started</span>
          <span *ngIf="faceStatus === 'loading'">⚙️ Loading AI models…</span>
          <span *ngIf="faceStatus === 'camera'">🎥 Position your face in frame</span>
          <span *ngIf="faceStatus === 'scanning'">🔄 Generating face embedding…</span>
          <span *ngIf="faceStatus === 'uploading'">☁️ Saving to server…</span>
          <span *ngIf="faceStatus === 'enrolled'">✅ Face enrolled successfully!</span>
          <span *ngIf="faceStatus === 'failed'">❌ {{ faceError }}</span>
          <span *ngIf="faceStatus === 'no-face'">😕 No face detected — try again</span>
        </div>

        <div class="face-buttons">
          <button class="btn-face" *ngIf="!cameraActive && faceStatus !== 'enrolled'"
                  (click)="startCamera()" [disabled]="faceStatus === 'loading'">
            📷 Open Camera
          </button>
          <button class="btn-face capture" *ngIf="cameraActive && faceStatus === 'camera'"
                  (click)="captureAndEnroll()">
            📸 Capture &amp; Enroll
          </button>
          <button class="btn-face retry" *ngIf="faceStatus === 'failed' || faceStatus === 'no-face'"
                  (click)="startCamera()">
            🔄 Retry
          </button>
          <button class="btn-skip" (click)="skip()">
            {{ faceStatus === 'enrolled' ? '➡️ Continue to Dashboard' : 'Skip for now' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .signup-card { max-width: 520px; margin: 40px auto; }
    form { display: flex; flex-direction: column; gap: 10px; }
    input { padding: 8px; border-radius: 6px; border: 1px solid #d1d5db; }
    .role-row { display: flex; gap: 12px; }
    .hint { font-size: 12px; color: #6b7280; }

    /* ── Face section ── */
    .face-section { display: flex; flex-direction: column; gap: 12px; }
    .face-section h3 { margin: 0 0 4px; font-size: 18px; }
    .badge { font-size: 11px; background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 99px; vertical-align: middle; }

    .camera-container { position: relative; border-radius: 12px; overflow: hidden; background: #000; }
    .camera-container.hidden { display: none; }
    .camera-preview { width: 100%; max-height: 260px; object-fit: cover; display: block; }
    .camera-overlay {
      position: absolute; bottom: 0; left: 0; right: 0;
      padding: 8px; background: rgba(0,0,0,.45); color: #fff;
      font-size: 12px; text-align: center;
    }

    .status-badge {
      padding: 8px 14px; border-radius: 8px;
      background: #f3f4f6; color: #374151; font-size: 14px;
    }
    .status-badge.enrolled  { background: #d1fae5; color: #065f46; }
    .status-badge.failed,
    .status-badge.no-face   { background: #fee2e2; color: #991b1b; }
    .status-badge.scanning,
    .status-badge.uploading,
    .status-badge.loading   { background: #fef3c7; color: #92400e; }
    .status-badge.camera    { background: #eff6ff; color: #1e40af; }

    .face-buttons { display: flex; gap: 10px; flex-wrap: wrap; }
    .btn-face {
      padding: 9px 18px; border-radius: 8px; border: none;
      background: #3b82f6; color: #fff; cursor: pointer;
      font-weight: 500; font-size: 14px; transition: background .2s;
    }
    .btn-face:hover { background: #2563eb; }
    .btn-face:disabled { opacity: .5; cursor: not-allowed; }
    .btn-face.capture { background: #10b981; }
    .btn-face.capture:hover { background: #059669; }
    .btn-face.retry { background: #f59e0b; }
    .btn-skip {
      padding: 9px 18px; border-radius: 8px; border: 1px solid #d1d5db;
      background: #fff; cursor: pointer; font-size: 14px; color: #374151;
    }
    .btn-skip:hover { background: #f9fafb; }
  `],
})
export class SignupComponent {
  // Form fields
  name = '';
  email = '';
  password = '';
  role: 'CompanyOwner' | 'Accountant' = 'CompanyOwner';
  companyName = '';
  taxRate = 10;
  currency = 'USD';
  notificationEmail = '';
  companyId = '';

  // UI state
  step: 'form' | 'face' = 'form';
  submitting = false;

  // Face state
  faceStatus: 'idle' | 'loading' | 'camera' | 'scanning' | 'uploading' | 'enrolled' | 'failed' | 'no-face' = 'idle';
  faceError = '';
  cameraActive = false;
  private stream: MediaStream | null = null;

  constructor(
    private authService: AuthService,
    private faceService: FaceRecognitionService,
    private router: Router,
    private translate: TranslateService,
  ) { }

  // ── Step 1: Register ──────────────────────────────────────────────
  submit() {
    this.submitting = true;
    this.authService
      .signup({
        name: this.name,
        email: this.email,
        password: this.password,
        role: this.role,
        companyName: this.role === 'CompanyOwner' ? this.companyName : undefined,
        taxRate: this.role === 'CompanyOwner' ? this.taxRate : undefined,
        currency: this.role === 'CompanyOwner' ? this.currency : undefined,
        notificationEmail: this.role === 'CompanyOwner' ? this.notificationEmail || this.email : undefined,
        companyId: this.role === 'Accountant' ? this.companyId : undefined,
      })
      .subscribe({
        next: () => {
          this.submitting = false;
          this.step = 'face'; // Move to face enroll step
        },
        error: (err) => {
          this.submitting = false;
          alert(err?.error?.message || this.translate.instant('SIGNUP.FAILED'));
        },
      });
  }

  // ── Step 2: Face Enroll ───────────────────────────────────────────
  async startCamera() {
    this.faceStatus = 'loading';
    try {
      // Pre-load models while asking for camera (parallel)
      const [stream] = await Promise.all([
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } }),
        this.faceService.loadModels(),
      ]);
      this.stream = stream;
      this.cameraActive = true;
      this.faceStatus = 'camera';

      // Attach stream to video element after Angular renders it
      setTimeout(() => {
        const video = document.querySelector<HTMLVideoElement>('video.camera-preview');
        if (video) video.srcObject = this.stream;
      }, 100);
    } catch (err: any) {
      console.error('Camera error:', err);
      this.faceError = 'Camera access denied. Please allow camera permissions.';
      this.faceStatus = 'failed';
      this.cameraActive = false;
    }
  }

  async captureAndEnroll() {
    const video = document.querySelector<HTMLVideoElement>('video.camera-preview');
    if (!video) return;

    this.faceStatus = 'scanning';

    // Get 128-float face embedding from the live video frame
    const descriptor = await this.faceService.getEmbedding(video);

    // Stop camera stream
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.cameraActive = false;

    if (!descriptor) {
      this.faceStatus = 'no-face';
      return;
    }

    // Upload embedding to backend
    this.faceStatus = 'uploading';
    try {
      await this.faceService.enroll(descriptor);
      this.faceStatus = 'enrolled';
    } catch (err: any) {
      console.error('Enroll error:', err);
      this.faceError = 'Failed to save face. You can try again later.';
      this.faceStatus = 'failed';
    }
  }

  skip() {
    this.stream?.getTracks().forEach(t => t.stop());
    this.router.navigate(['/sales']);
  }

  ngOnDestroy() {
    this.stream?.getTracks().forEach(t => t.stop());
  }
}
