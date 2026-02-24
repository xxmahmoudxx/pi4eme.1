import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
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

      <!-- ── Tabs ── -->
      <div class="tabs">
        <button class="tab" [class.active]="mode === 'password'" (click)="mode = 'password'; reset()">
          🔑 Password
        </button>
        <button class="tab" [class.active]="mode === 'face'" (click)="mode = 'face'; reset()">
          📷 Face Login
        </button>
      </div>

      <!-- ─────────── PASSWORD MODE ─────────── -->
      <form *ngIf="mode === 'password'" (ngSubmit)="submit()">
        <label>{{ 'LOGIN.EMAIL' | translate }}</label>
        <input type="email" [(ngModel)]="email" name="email" required />

        <label>{{ 'LOGIN.PASSWORD' | translate }}</label>
        <input type="password" [(ngModel)]="password" name="password" required />

        <button class="button" type="submit" [disabled]="loading">
          {{ loading ? 'Signing in…' : ('LOGIN.SUBMIT' | translate) }}
        </button>
      </form>

      <!-- ─────────── FACE LOGIN MODE ─────────── -->
      <div *ngIf="mode === 'face'" class="face-section">
        <label>Your Email (so we know whose face to match)</label>
        <input type="email" [(ngModel)]="email" name="email" placeholder="Your email address" />

        <!-- Camera preview -->
        <div class="camera-container" [class.hidden]="!cameraActive">
          <video autoplay playsinline class="camera-preview"></video>
          <div class="camera-overlay">Look directly at the camera</div>
        </div>

        <!-- Status badge -->
        <div class="status-badge" [ngClass]="faceStatus">
          <span *ngIf="faceStatus === 'idle'">Enter your email then open camera</span>
          <span *ngIf="faceStatus === 'loading'">⚙️ Loading AI models…</span>
          <span *ngIf="faceStatus === 'camera'">🎥 Ready — click Capture when in frame</span>
          <span *ngIf="faceStatus === 'scanning'">🔄 Analysing face…</span>
          <span *ngIf="faceStatus === 'success'">✅ Face matched! Logging you in…</span>
          <span *ngIf="faceStatus === 'failed'">❌ {{ errorMsg }}</span>
          <span *ngIf="faceStatus === 'no-face'">😕 No face detected — move closer and retry</span>
        </div>

        <div class="face-buttons">
          <button class="btn-face"
                  *ngIf="!cameraActive && faceStatus !== 'success'"
                  [disabled]="!email || faceStatus === 'loading'"
                  (click)="openCamera()">
            📷 Open Camera
          </button>
          <button class="btn-face capture"
                  *ngIf="cameraActive && faceStatus === 'camera'"
                  (click)="captureAndLogin()">
            📸 Capture &amp; Login
          </button>
          <button class="btn-face retry"
                  *ngIf="faceStatus === 'failed' || faceStatus === 'no-face'"
                  (click)="openCamera()">
            🔄 Retry
          </button>
        </div>
      </div>

      <p class="hint">
        {{ 'LOGIN.NEW_HERE' | translate }}
        <a routerLink="/signup">{{ 'LOGIN.CREATE_ACCOUNT' | translate }}</a>
      </p>
    </div>
  `,
  styles: [`
    .login-card { max-width: 440px; margin: 40px auto; }

    /* Tabs */
    .tabs { display: flex; gap: 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 4px; }
    .tab {
      flex: 1; padding: 10px; border: none; background: #f9fafb;
      cursor: pointer; font-size: 14px; color: #6b7280;
      transition: background .15s, color .15s;
    }
    .tab.active { background: #fff; color: #1d4ed8; font-weight: 600; }
    .tab:hover:not(.active) { background: #f3f4f6; }

    /* Form */
    form { display: flex; flex-direction: column; gap: 10px; }
    input { padding: 9px; border-radius: 6px; border: 1px solid #d1d5db; font-size: 14px; }
    .hint { font-size: 12px; color: #6b7280; margin-top: 12px; }

    /* Face section */
    .face-section { display: flex; flex-direction: column; gap: 10px; }

    .camera-container { position: relative; border-radius: 10px; overflow: hidden; background: #000; }
    .camera-container.hidden { display: none; }
    .camera-preview { width: 100%; max-height: 250px; object-fit: cover; display: block; }
    .camera-overlay {
      position: absolute; bottom: 0; left: 0; right: 0;
      padding: 7px; background: rgba(0,0,0,.5); color: #fff;
      font-size: 12px; text-align: center;
    }

    .status-badge {
      padding: 9px 14px; border-radius: 8px;
      background: #f3f4f6; color: #374151; font-size: 13px;
    }
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
  `],
})
export class LoginComponent {
  mode: 'password' | 'face' = 'password';
  email = '';
  password = '';
  loading = false;

  // Face state
  faceStatus: 'idle' | 'loading' | 'camera' | 'scanning' | 'success' | 'failed' | 'no-face' = 'idle';
  errorMsg = '';
  cameraActive = false;
  private stream: MediaStream | null = null;

  constructor(
    private authService: AuthService,
    private faceService: FaceRecognitionService,
    private router: Router,
  ) { }

  reset() {
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.cameraActive = false;
    this.faceStatus = 'idle';
    this.errorMsg = '';
    this.loading = false;
  }

  // ── Password login ─────────────────────────────────────
  submit() {
    this.loading = true;
    this.authService.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/sales']),
      error: (err) => {
        this.loading = false;
        alert(err.error?.message || 'Login failed. Check credentials.');
      },
    });
  }

  // ── Face login ─────────────────────────────────────────
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
      this.errorMsg = 'Camera access denied — please allow camera permission.';
      this.faceStatus = 'failed';
      this.cameraActive = false;
    }
  }

  async captureAndLogin() {
    const video = document.querySelector<HTMLVideoElement>('video.camera-preview');
    if (!video) return;
    this.faceStatus = 'scanning';

    // Generate 128-float face embedding from live video
    const descriptor = await this.faceService.getEmbedding(video);

    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.cameraActive = false;

    if (!descriptor) { this.faceStatus = 'no-face'; return; }

    try {
      // Send email + embedding → backend checks match → returns JWT
      const result = await this.faceService.faceLogin(this.email, descriptor);
      this.faceStatus = 'success';

      // Store token via AuthService so BehaviorSubjects update correctly
      this.authService.setToken(result.access_token);

      // Short pause so user sees "✅ Face matched!" then navigate
      setTimeout(() => this.router.navigate(['/sales']), 1000);
    } catch (err: any) {
      this.errorMsg = err.error?.message || 'Face login failed — try again or use password';
      this.faceStatus = 'failed';
    }
  }

  ngOnDestroy() {
    this.stream?.getTracks().forEach(t => t.stop());
  }
}
