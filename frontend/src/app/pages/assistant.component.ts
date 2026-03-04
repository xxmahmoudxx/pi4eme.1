import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-assistant',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="page-header">
      <h1>{{ 'ASSISTANT.TITLE' | translate }}</h1>
      <p class="page-subtitle">{{ 'ASSISTANT.SUBTITLE' | translate }}</p>
    </div>

    <div class="card trigger-card">
      <div class="trigger-content">
        <div class="trigger-icon">🤖</div>
        <div class="trigger-text">
          <h3>AI Email Report</h3>
          <p>Trigger an intelligent summary email with all insights from your data.</p>
        </div>
        <button class="btn-trigger" (click)="trigger()">
          {{ 'ASSISTANT.SEND_EMAIL' | translate }}
        </button>
      </div>
      <div *ngIf="message" class="trigger-msg" [class.success]="message.includes('success') || message.includes('sent')">
        {{ message }}
      </div>
    </div>

    <div class="grid grid-3">
      <div class="card insight-card">
        <div class="insight-icon">📈</div>
        <h3>{{ 'ASSISTANT.SALES_INSIGHT' | translate }}</h3>
        <div class="insight-row">
          <span class="insight-label">{{ 'ASSISTANT.BEST' | translate }}</span>
          <span class="insight-val best">{{ salesInsight.best_product || ('COMMON.N_A' | translate) }}</span>
        </div>
        <div class="insight-row">
          <span class="insight-label">{{ 'ASSISTANT.WORST' | translate }}</span>
          <span class="insight-val worst">{{ salesInsight.worst_product || ('COMMON.N_A' | translate) }}</span>
        </div>
      </div>
      <div class="card insight-card">
        <div class="insight-icon">📦</div>
        <h3>{{ 'ASSISTANT.INVENTORY_INSIGHT' | translate }}</h3>
        <div class="insight-row">
          <span class="insight-label">{{ 'COMMON.ITEM' | translate }}</span>
          <span class="insight-val">{{ inventoryInsight.item || ('COMMON.N_A' | translate) }}</span>
        </div>
        <div class="insight-row">
          <span class="insight-label">{{ 'ASSISTANT.RISK' | translate }}</span>
          <span class="insight-val risk">{{ inventoryInsight.risk_level || ('COMMON.N_A' | translate) }}</span>
        </div>
        <div class="insight-row">
          <span class="insight-label">{{ 'ASSISTANT.REORDER' | translate }}</span>
          <span class="insight-val">{{ inventoryInsight.recommended_reorder ?? ('COMMON.N_A' | translate) }}</span>
        </div>
      </div>
      <div class="card insight-card">
        <div class="insight-icon">🏥</div>
        <h3>{{ 'ASSISTANT.HEALTH_INSIGHT' | translate }}</h3>
        <div class="insight-row">
          <span class="insight-label">{{ 'ASSISTANT.SCORE' | translate }}</span>
          <span class="insight-val score">{{ reportInsight.health_score ?? ('COMMON.N_A' | translate) }}</span>
        </div>
        <div class="insight-row">
          <span class="insight-label">{{ 'ASSISTANT.STATUS' | translate }}</span>
          <span class="insight-val">{{ reportInsight.status || ('COMMON.N_A' | translate) }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-header { margin-bottom: 24px; }
    .page-header h1 { font-size: 26px; font-weight: 800; color: #021024; margin: 0 0 6px; }
    .page-subtitle { color: #5483B3; font-size: 14px; margin: 0; }

    .trigger-card {
      background: linear-gradient(135deg, #021024 0%, #052659 100%) !important;
      border: none !important;
      margin-bottom: 24px;
    }
    .trigger-content {
      display: flex; align-items: center; gap: 20px; flex-wrap: wrap;
    }
    .trigger-icon { font-size: 42px; }
    .trigger-text { flex: 1; }
    .trigger-text h3 { margin: 0 0 4px; font-size: 18px; color: #C1E8FF; border: none !important; padding: 0 !important; }
    .trigger-text p { margin: 0; font-size: 13px; color: #7DA0CA; }

    .btn-trigger {
      padding: 12px 24px;
      background: linear-gradient(135deg, #5483B3, #7DA0CA);
      color: #021024; border: none; border-radius: 8px;
      font-size: 14px; font-weight: 800; font-family: inherit;
      cursor: pointer; transition: all 0.2s; white-space: nowrap;
      box-shadow: 0 2px 10px rgba(193,232,255,0.3);
    }
    .btn-trigger:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(193,232,255,0.4); }

    .trigger-msg {
      margin-top: 14px; padding: 10px 16px;
      border-radius: 8px; font-size: 13px; font-weight: 500;
      background: rgba(193,232,255,0.15); color: #7DA0CA;
      border: 1px solid rgba(193,232,255,0.2);
    }
    .trigger-msg.success { background: rgba(110,231,183,0.15); color: #6ee7b7; border-color: rgba(110,231,183,0.3); }

    .insight-card { position: relative; overflow: hidden; }
    .insight-card::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
      background: linear-gradient(90deg, #052659, #5483B3, #C1E8FF);
    }
    .insight-icon { font-size: 28px; margin-bottom: 8px; }
    .insight-card h3 { font-size: 15px; color: #021024; border-color: #C1E8FF !important; }

    .insight-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 0; border-bottom: 1px solid rgba(193,232,255,0.5);
    }
    .insight-row:last-child { border-bottom: none; }
    .insight-label { font-size: 12px; font-weight: 600; color: #5483B3; text-transform: uppercase; letter-spacing: 0.4px; }
    .insight-val { font-size: 14px; font-weight: 700; color: #021024; }
    .insight-val.best  { color: #059669; }
    .insight-val.worst { color: #c0392b; }
    .insight-val.risk  { color: #b7770d; }
    .insight-val.score { color: #052659; font-size: 18px; }
  `],
})
export class AssistantComponent implements OnInit {
  message = '';
  salesInsight: any = {};
  inventoryInsight: any = {};
  reportInsight: any = {};

  constructor(private api: ApiService, private translate: TranslateService) { }

  ngOnInit() {
    this.loadInsights();
  }

  loadInsights() {
    this.api.getAiInsights('sales').subscribe((data) => (this.salesInsight = data?.[0]?.payload || {}));
    this.api
      .getAiInsights('inventory')
      .subscribe((data) => (this.inventoryInsight = data?.[0]?.payload || {}));
    // Trigger report ML via KPIs first, then fetch latest AI insight.
    this.api.getReportKpis().subscribe({
      next: () => {
        this.api.getReportAi().subscribe((data) => (this.reportInsight = data?.payload || {}));
      },
      error: () => {
        this.api.getReportAi().subscribe((data) => (this.reportInsight = data?.payload || {}));
      },
    });
  }

  trigger() {
    this.api.triggerAgent().subscribe({
      next: () => (this.message = this.translate.instant('ASSISTANT.SUCCESS')),
      error: () => (this.message = this.translate.instant('ASSISTANT.FAILED')),
    });
  }
}
