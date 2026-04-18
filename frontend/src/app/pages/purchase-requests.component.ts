import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-purchase-requests',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="page-container">
      <header class="page-header">
        <div class="header-content">
          <h1>{{ 'ACCOUNTANT.TITLE' | translate }}</h1>
          <p class="subtitle">{{ 'ACCOUNTANT.SUBTITLE' | translate }}</p>
        </div>
        <div class="stats-grid">
          <div class="stat-card">
            <span class="label">{{ 'ACCOUNTANT.PENDING' | translate }}</span>
            <span class="value">{{ requests.length }}</span>
          </div>
          <div class="stat-card accent">
            <span class="label">{{ 'ACCOUNTANT.ACCURACY' | translate }}</span>
            <span class="value">{{ stats?.accuracy || 100 }}%</span>
          </div>
        </div>
      </header>

      <div class="requests-grid" *ngIf="requests.length > 0; else emptyState">
        <div class="request-card" *ngFor="let req of requests" [class.rejected]="req.aiDecision === 'REJECTED'">
          <div class="card-header">
            <div class="item-info">
              <h3>{{ req.item }}</h3>
              <span class="category">{{ req.category || ('COMMON.N_A' | translate) }}</span>
            </div>
            <div class="price-tag">
              {{ req.totalCost | currency:'USD' }}
            </div>
          </div>

          <div class="card-body">
            <div class="detail-row">
              <span class="icon">👤</span>
              <span class="text">{{ 'ACCOUNTANT.SUBMITTED_BY' | translate }} <strong>{{ req.submittedBy }}</strong></span>
            </div>
            <div class="detail-row">
              <span class="icon">🏢</span>
              <span class="text">{{ 'ACCOUNTANT.SUPPLIER' | translate }}: {{ req.supplier }}</span>
            </div>
            <div class="detail-row">
              <span class="icon">📅</span>
              <span class="text">{{ req.date | date:'mediumDate' }}</span>
            </div>

            <div class="ai-section">
              <div class="ai-header">
                <span class="ai-badge" [class.approved]="req.aiDecision === 'APPROVED'" [class.rejected]="req.aiDecision === 'REJECTED'">
                  {{ 'ACCOUNTANT.AI_DECISION' | translate }}: {{ 'ACCOUNTANT.' + req.aiDecision | translate }}
                </span>
                <span class="confidence">{{ 'ACCOUNTANT.CONFIDENCE' | translate }}: {{ req.aiConfidence }}%</span>
              </div>
              <p class="ai-explanation">{{ req.aiReasoning }}</p>
              <div class="flags" *ngIf="req.aiFlags?.length">
                <span class="flag" *ngFor="let flag of req.aiFlags">{{ 'ACCOUNTANT.' + flag | translate }}</span>
              </div>
            </div>
          </div>

          <div class="card-footer">
            <input type="text" [(ngModel)]="req.comment" [placeholder]="'ACCOUNTANT.COMMENT_PLACEHOLDER' | translate" class="comment-input" />
            <div class="actions">
              <button class="btn btn-outline" (click)="review(req, 'REJECTED')">{{ 'ACCOUNTANT.REJECT' | translate }}</button>
              <button class="btn btn-primary" (click)="review(req, 'APPROVED')">{{ 'ACCOUNTANT.APPROVE' | translate }}</button>
            </div>
          </div>
        </div>
      </div>

      <ng-template #emptyState>
        <div class="empty-state">
          <div class="empty-icon">🎉</div>
          <h2>{{ 'ACCOUNTANT.EMPTY_TITLE' | translate }}</h2>
          <p>{{ 'ACCOUNTANT.EMPTY_SUB' | translate }}</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      animation: fadeIn 0.5s ease-out;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 3rem;
    }

    h1 {
      font-size: 2.5rem;
      font-weight: 800;
      color: var(--text-primary, #052659);
      margin: 0;
      letter-spacing: -1px;
    }

    .subtitle {
      color: var(--text-secondary, #5483B3);
      font-size: 1.1rem;
      margin-top: 0.5rem;
    }

    .stats-grid {
      display: flex;
      gap: 1.5rem;
    }

    .stat-card {
      background: white;
      padding: 1rem 2rem;
      border-radius: 16px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.05);
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 120px;
      border: 1px solid rgba(0,0,0,0.02);
    }

    .stat-card.accent {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .stat-card .label {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 1px;
      opacity: 0.8;
      margin-bottom: 0.25rem;
    }

    .stat-card .value {
      font-size: 1.5rem;
      font-weight: 700;
    }

    .requests-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
      gap: 2rem;
    }

    .request-card {
      background: white;
      border-radius: 24px;
      padding: 1.5rem;
      box-shadow: 0 15px 35px rgba(0,0,0,0.06);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      display: flex;
      flex-direction: column;
      border: 1px solid rgba(0,0,0,0.03);
      position: relative;
      overflow: hidden;
    }

    .request-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 20px 45px rgba(0,0,0,0.1);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
    }

    .item-info h3 {
      margin: 0;
      font-size: 1.25rem;
      color: #052659;
    }

    .category {
      font-size: 0.85rem;
      color: #7DA0CA;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .price-tag {
      font-size: 1.2rem;
      font-weight: 800;
      color: #764ba2;
      background: rgba(118, 75, 162, 0.08);
      padding: 0.5rem 1rem;
      border-radius: 12px;
    }

    .card-body {
      flex: 1;
    }

    .detail-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
      color: #5483B3;
      font-size: 0.95rem;
    }

    .ai-section {
      margin-top: 1.5rem;
      padding: 1.25rem;
      background: #f8fafc;
      border-radius: 18px;
      border: 1px solid rgba(0,0,0,0.02);
    }

    .ai-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .ai-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .ai-badge.approved {
      background: #ecfdf5;
      color: #059669;
    }

    .ai-badge.rejected {
      background: #fef2f2;
      color: #dc2626;
    }

    .confidence {
      font-size: 0.8rem;
      color: #94a3b8;
    }

    .ai-explanation {
      font-size: 0.9rem;
      color: #64748b;
      margin: 0;
      line-height: 1.5;
    }

    .flags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.75rem;
    }

    .flag {
      background: #fff;
      border: 1px solid #fee2e2;
      color: #ef4444;
      font-size: 0.7rem;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      font-weight: 600;
    }

    .card-footer {
      margin-top: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .comment-input {
      width: 100%;
      padding: 0.75rem 1rem;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      font-size: 0.9rem;
      transition: border-color 0.2s;
    }

    .comment-input:focus {
      outline: none;
      border-color: #667eea;
    }

    .actions {
      display: flex;
      gap: 1rem;
    }

    .btn {
      flex: 1;
      padding: 0.75rem;
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-primary:hover {
      box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
      transform: translateY(-2px);
    }

    .btn-outline {
      background: white;
      border: 1px solid #e2e8f0;
      color: #64748b;
    }

    .btn-outline:hover {
      background: #f8fafc;
      color: #ef4444;
      border-color: #fecaca;
    }

    .empty-state {
      text-align: center;
      padding: 5rem 2rem;
      background: white;
      border-radius: 32px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.03);
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class PurchaseRequestsComponent implements OnInit {
  requests: any[] = [];
  stats: any = null;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadRequests();
    this.loadStats();
  }

  loadRequests() {
    this.api.getPurchaseRequests().subscribe({
      next: (res) => this.requests = res,
      error: (err) => console.error('Failed to load requests', err)
    });
  }

  loadStats() {
    this.api.getPurchaseReviewStats().subscribe({
      next: (res) => this.stats = res,
      error: (err) => console.error('Failed to load stats', err)
    });
  }

  review(req: any, status: 'APPROVED' | 'REJECTED') {
    this.api.reviewPurchaseRequest(req._id, {
      status,
      comment: req.comment
    }).subscribe({
      next: () => {
        this.requests = this.requests.filter(r => r._id !== req._id);
        this.loadStats();
      },
      error: (err) => alert('Review failed: ' + (err.error?.message || err.message))
    });
  }
}
