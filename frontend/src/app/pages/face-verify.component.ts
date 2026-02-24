import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FaceRecognitionService } from '../services/face-recognition.service';

@Component({
    selector: 'app-face-verify',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="card verify-card">
      <h2>🔐 Face Verification</h2>
      <p class="hint">Verify your identity with your face, or skip to go straight to the dashboard.</p>

      <!-- Live camera preview -->
      <div class="camera-container" [class.hidden]="!cameraActive">
        <video autoplay playsinline class="camera-preview"></video>
        <div class="camera-overlay">Look directly at the camera and stay still</div>
      </div>

      <!-- Status badge -->
      <div class="status-badge" [ngClass]="status">
        <span *ngIf="status === 'idle'">📷 Camera not started</span>
        <span *ngIf="status === 'loading'">⚙️ Loading AI models…</span>
        <span *ngIf="status === 'camera'">🎥 Position your face in frame then capture</span>
        <span *ngIf="status === 'scanning'">🔄 Analysing face…</span>
        <span *ngIf="status === 'matched'">✅ Face matched! (distance: {{ distance }})</span>
        <span *ngIf="status === 'no-match'">❌ Face did not match (distance: {{ distance }}) — try again or skip</span>
        <span *ngIf="status === 'no-face'">😕 No face detected — move closer and retry</span>
        <span *ngIf="status === 'no-enrolled'">ℹ️ No face enrolled on this account — enroll from your profile</span>
        <span *ngIf="status === 'failed'">⚠️ {{ errorMsg }}</span>
      </div>

      <!-- Action buttons -->
      <div class="buttons">
        <button class="btn-face"
                *ngIf="!cameraActive && status !== 'matched'"
                [disabled]="status === 'loading'"
                (click)="openCamera()">
          📷 Open Camera
        </button>
        <button class="btn-face capture"
                *ngIf="cameraActive && status === 'camera'"
                (click)="captureAndMatch()">
          📸 Capture
        </button>
        <button class="btn-face retry"
                *ngIf="status === 'no-match' || status === 'no-face' || status === 'failed'"
                (click)="openCamera()">
          🔄 Retry
        </button>
        <button class="btn-skip" (click)="skip()">
          {{ status === 'matched' ? '➡️ Enter Dashboard' : 'Skip' }}
        </button>
      </div>
    </div>
  `,
    styles: [`
    .verify-card { max-width: 480px; margin: 60px auto; display: flex; flex-direction: column; gap: 14px; }
    h2 { margin: 0; }
    .hint { font-size: 13px; color: #6b7280; margin: 0; }

    .camera-container { position: relative; border-radius: 12px; overflow: hidden; background: #000; }
    .camera-container.hidden { display: none; }
    .camera-preview { width: 100%; max-height: 280px; object-fit: cover; display: block; }
    .camera-overlay {
      position: absolute; bottom: 0; left: 0; right: 0;
      padding: 8px; background: rgba(0,0,0,.5); color: #fff;
      font-size: 12px; text-align: center;
    }

    .status-badge {
      padding: 10px 16px; border-radius: 8px;
      background: #f3f4f6; color: #374151; font-size: 14px;
    }
    .status-badge.matched   { background: #d1fae5; color: #065f46; font-weight: 600; }
    .status-badge.no-match,
    .status-badge.failed    { background: #fee2e2; color: #991b1b; }
    .status-badge.scanning,
    .status-badge.loading   { background: #fef3c7; color: #92400e; }
    .status-badge.camera    { background: #eff6ff; color: #1e40af; }
    .status-badge.no-face   { background: #fef3c7; color: #92400e; }

    .buttons { display: flex; gap: 10px; flex-wrap: wrap; }
    .btn-face {
      padding: 10px 20px; border-radius: 8px; border: none;
      background: #3b82f6; color: #fff; cursor: pointer;
      font-weight: 600; font-size: 14px; transition: background .2s;
    }
    .btn-face:hover { background: #2563eb; }
    .btn-face:disabled { opacity: .5; cursor: not-allowed; }
    .btn-face.capture { background: #10b981; }
    .btn-face.capture:hover { background: #059669; }
    .btn-face.retry { background: #f59e0b; color: #fff; }
    .btn-skip {
      padding: 10px 20px; border-radius: 8px; border: 1px solid #d1d5db;
      background: #fff; cursor: pointer; font-size: 14px; color: #374151;
    }
    .btn-skip:hover { background: #f9fafb; }
  `],
})
export class FaceVerifyComponent {
    status: 'idle' | 'loading' | 'camera' | 'scanning' | 'matched' | 'no-match' | 'no-face' | 'no-enrolled' | 'failed' = 'idle';
    errorMsg = '';
    distance = 0;
    cameraActive = false;
    private stream: MediaStream | null = null;

    constructor(
        private faceService: FaceRecognitionService,
        private router: Router,
    ) { }

    async openCamera() {
        this.status = 'loading';
        try {
            const [stream] = await Promise.all([
                navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } }),
                this.faceService.loadModels(),
            ]);
            this.stream = stream;
            this.cameraActive = true;
            this.status = 'camera';
            setTimeout(() => {
                const video = document.querySelector<HTMLVideoElement>('video.camera-preview');
                if (video) video.srcObject = this.stream;
            }, 100);
        } catch {
            this.errorMsg = 'Camera access denied — please allow camera permission.';
            this.status = 'failed';
            this.cameraActive = false;
        }
    }

    async captureAndMatch() {
        const video = document.querySelector<HTMLVideoElement>('video.camera-preview');
        if (!video) return;
        this.status = 'scanning';

        const descriptor = await this.faceService.getEmbedding(video);
        this.stream?.getTracks().forEach(t => t.stop());
        this.stream = null;
        this.cameraActive = false;

        if (!descriptor) { this.status = 'no-face'; return; }

        try {
            const result = await this.faceService.match(descriptor);
            this.distance = result.distance;
            if (result.distance === -1) this.status = 'no-enrolled';
            else if (result.match) this.status = 'matched';
            else this.status = 'no-match';
        } catch {
            this.errorMsg = 'Verification failed. Try again or skip.';
            this.status = 'failed';
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
