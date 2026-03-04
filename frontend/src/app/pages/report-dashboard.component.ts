import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-report-dashboard',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="page-header">
      <h1>Financial Report</h1>
      <p class="page-subtitle">Your company financial KPIs and AI health assessment</p>
    </div>

    <div class="grid grid-3">
      <div class="card kpi-card">
        <div class="kpi-label">{{ 'REPORT.REVENUE' | translate }}</div>
        <div class="kpi-value positive">{{ formatCurrency(kpis.revenue) }}</div>
      </div>
      <div class="card kpi-card">
        <div class="kpi-label">{{ 'REPORT.COSTS' | translate }}</div>
        <div class="kpi-value negative">{{ formatCurrency(kpis.costs) }}</div>
      </div>
      <div class="card kpi-card">
        <div class="kpi-label">{{ 'REPORT.PROFIT' | translate }}</div>
        <div class="kpi-value" [class.positive]="kpis.profit >= 0" [class.negative]="kpis.profit < 0">{{ formatCurrency(kpis.profit) }}</div>
      </div>
      <div class="card kpi-card">
        <div class="kpi-label">{{ 'REPORT.TAXES' | translate }}</div>
        <div class="kpi-value">{{ formatCurrency(kpis.taxes) }}</div>
      </div>
      <div class="card kpi-card">
        <div class="kpi-label">{{ 'REPORT.REVENUE_GROWTH' | translate }}</div>
        <div class="kpi-value" [class.positive]="(kpis.revenueGrowth || 0) >= 0" [class.negative]="(kpis.revenueGrowth || 0) < 0">
          {{ kpis.revenueGrowth?.toFixed(2) }}%
        </div>
      </div>
      <div class="card kpi-card">
        <div class="kpi-label">{{ 'REPORT.VOLATILITY' | translate }}</div>
        <div class="kpi-value">{{ kpis.salesVolatility?.toFixed(2) }}%</div>
      </div>
    </div>

    <div class="card health-card">
      <div class="health-header">
        <div>
          <h2>{{ 'REPORT.COMPANY_HEALTH' | translate }}</h2>
          <p class="health-status-text">{{ reportAi.status || ('COMMON.N_A' | translate) }}</p>
        </div>
        <div class="health-score-badge" [class.good]="(reportAi.health_score || 0) >= 70" [class.warn]="(reportAi.health_score || 0) >= 40 && (reportAi.health_score || 0) < 70" [class.bad]="(reportAi.health_score || 0) < 40">
          {{ reportAi.health_score || 0 }}
          <span class="score-label">/100</span>
        </div>
      </div>
      <p class="health-reason">{{ reportAi.main_reason || ('REPORT.NO_INSIGHT' | translate) }}</p>
      <div class="gauge-track">
        <div class="gauge-fill" [style.width.%]="reportAi.health_score || 0"></div>
      </div>
    </div>
  `,
  styles: [`
    .page-header { margin-bottom: 24px; }
    .page-header h1 { font-size: 26px; font-weight: 800; color: #021024; margin: 0 0 6px; }
    .page-subtitle { color: #5483B3; font-size: 14px; margin: 0; }

    .kpi-card {
      background: linear-gradient(135deg, #021024 0%, #052659 100%) !important;
      color: white;
      border: none !important;
    }
    .kpi-card:hover { box-shadow: 0 8px 24px rgba(2,16,36,0.3) !important; }
    .kpi-label {
      font-size: 11px; font-weight: 700; letter-spacing: 1px;
      text-transform: uppercase; color: #7DA0CA; margin-bottom: 10px;
    }
    .kpi-card h3 { display: none; }
    .kpi-value {
      font-size: 26px; font-weight: 800; color: #C1E8FF;
      line-height: 1;
    }
    .kpi-value.positive { color: #6ee7b7; }
    .kpi-value.negative { color: #fca5a5; }

    .health-card { margin-top: 4px; }
    .health-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      margin-bottom: 16px;
    }
    .health-header h2 { margin: 0 0 4px; font-size: 18px; border: none !important; padding: 0 !important; }
    .health-status-text { color: #5483B3; font-size: 14px; margin: 0; }

    .health-score-badge {
      font-size: 48px; font-weight: 900; line-height: 1;
      color: #052659;
      display: flex; align-items: baseline; gap: 4px;
    }
    .health-score-badge.good { color: #059669; }
    .health-score-badge.warn { color: #b7770d; }
    .health-score-badge.bad  { color: #c0392b; }
    .score-label { font-size: 16px; font-weight: 600; color: #7DA0CA; }

    .health-reason { color: #5483B3; font-size: 14px; margin-bottom: 16px; }

    .gauge-track {
      height: 12px; background: #C1E8FF;
      border-radius: 999px; overflow: hidden;
      border: 1px solid rgba(84,131,179,0.2);
    }
    .gauge-fill {
      height: 100%;
      background: linear-gradient(90deg, #052659, #5483B3, #7DA0CA);
      border-radius: 999px;
      transition: width 0.8s ease;
    }
  `],
})
export class ReportDashboardComponent implements OnInit {
  kpis: any = { currency: 'USD', revenue: 0, costs: 0, profit: 0, taxes: 0 };
  reportAi: any = {};

  constructor(private api: ApiService) { }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.api.getReportKpis().subscribe({
      next: (data) => {
        this.kpis = data;
        this.api.getReportAi().subscribe((ai) => (this.reportAi = ai?.payload || {}));
      },
      error: () => {
        this.api.getReportAi().subscribe((ai) => (this.reportAi = ai?.payload || {}));
      },
    });
  }

  formatCurrency(value: number) {
    return `${this.kpis.currency || 'USD'} ${Number(value || 0).toFixed(2)}`;
  }
}
