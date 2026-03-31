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
          <span class="insight-val">{{ inventoryInsight.product || ('COMMON.N_A' | translate) }}</span>
        </div>
        <div class="insight-row">
          <span class="insight-label">{{ 'ASSISTANT.RISK' | translate }}</span>
          <span class="insight-val risk">{{ inventoryInsight.risk || ('COMMON.N_A' | translate) }}</span>
        </div>
        <div class="insight-row">
          <span class="insight-label">{{ 'ASSISTANT.REORDER' | translate }}</span>
          <span class="insight-val">{{ inventoryInsight.reorderQty ?? ('COMMON.N_A' | translate) }}</span>
        </div>
      </div>
      <div class="card insight-card">
        <div class="insight-icon">🏥</div>
        <h3>{{ 'ASSISTANT.HEALTH_INSIGHT' | translate }}</h3>
        <div class="insight-row">
          <span class="insight-label">{{ 'ASSISTANT.SCORE' | translate }}</span>
          <span class="insight-val score">{{ reportInsight.score ?? ('COMMON.N_A' | translate) }}</span>
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
  salesInsight: any = {};
  inventoryInsight: any = {};
  reportInsight: any = {};

  constructor(private api: ApiService, private translate: TranslateService) { }

  ngOnInit() {
    this.loadInsights();
  }

  loadInsights() {
    // Product performance → extract best/worst
    this.api.getProductPerformance().subscribe({
      next: (data: any[]) => {
        if (data?.length) {
          this.salesInsight.best_product = data[0]?.product || 'N/A';
          const worst = data[data.length - 1];
          this.salesInsight.worst_product = worst?.product || 'N/A';
        }
      },
      error: () => { },
    });

    // Stockout → get highest risk item
    this.api.getStockoutRisks().subscribe({
      next: (data: any[]) => {
        if (data?.length) {
          this.inventoryInsight = data[0]; // highest risk first
        }
      },
      error: () => { },
    });

    // Health score
    this.api.getHealthScore().subscribe({
      next: (data: any) => {
        this.reportInsight = data || {};
      },
      error: () => { },
    });
  }
}
