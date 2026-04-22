import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';
import { ApiService } from '../services/api.service';
import { ThemeService } from '../services/theme.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-report-dashboard',
  standalone: true,
  imports: [CommonModule, NgChartsModule, TranslateModule],
  template: `
    <div class="page-header">
      <h1>📊 {{ 'REPORT.TITLE' | translate }}</h1>
      <p class="page-subtitle">{{ 'REPORT.SUBTITLE' | translate }}</p>
    </div>

    <!-- Financial KPI Cards -->
    <div class="grid grid-3" *ngIf="health">
      <div class="card kpi-card">
        <div class="kpi-label">{{ 'REPORT.REVENUE' | translate }}</div>
        <div class="kpi-value positive">{{ health.revenue | number:'1.2-2' }}</div>
      </div>
      <div class="card kpi-card">
        <div class="kpi-label">{{ 'REPORT.COSTS' | translate }}</div>
        <div class="kpi-value negative">{{ health.costs | number:'1.2-2' }}</div>
      </div>
      <div class="card kpi-card">
        <div class="kpi-label">{{ 'REPORT.PROFIT' | translate }}</div>
        <div class="kpi-value" [class.positive]="health.profit >= 0" [class.negative]="health.profit < 0">
          {{ health.profit | number:'1.2-2' }}
        </div>
      </div>
    </div>

    <!-- 🧠 AI SECTION: Company Health Score -->
    <div class="card health-card" *ngIf="health && health.score !== undefined">
      <div class="health-top">
        <div>
          <div class="section-header">
            <h2>🧠 {{ 'REPORT.HEALTH_TITLE' | translate }}</h2>
            <span class="ai-badge">{{ 'REPORT.AI_POWERED' | translate }}</span>
          </div>
          <p class="health-explain">{{ health.explanation }}</p>
        </div>
        <div class="health-score-circle"
             [class.good]="health.score >= 70"
             [class.warn]="health.score >= 40 && health.score < 70"
             [class.bad]="health.score < 40">
          <span class="score-num">{{ health.score }}</span>
          <span class="score-max">/100</span>
          <span class="score-status"
                [class.good]="health.status === 'HEALTHY' || health.status === 'Excellent'"
                [class.warn]="health.status === 'WARNING' || health.status === 'Good' || health.status === 'Fair'"
                [class.bad]="health.status === 'CRITICAL' || health.status === 'At Risk'">
            {{ getStatusKey(health.status) | translate }}
          </span>
        </div>
      </div>

      <div class="gauge-track">
        <div class="gauge-fill" [style.width.%]="health.score"
             [class.good]="health.score >= 70"
             [class.warn]="health.score >= 40 && health.score < 70"
             [class.bad]="health.score < 40"></div>
      </div>

      <!-- Factor Breakdown -->
      <div class="factors-grid" *ngIf="health.factors?.length > 0">
        <h3>📋 {{ 'REPORT.FACTOR_TITLE' | translate }}</h3>
        <div class="factor-row" *ngFor="let f of health.factors">
          <div class="factor-info">
            <span class="factor-name">{{ getFactorKey(f.name) | translate }}</span>
            <span class="factor-detail">{{ f.detail }}</span>
          </div>
          <div class="factor-bar-wrap">
            <div class="factor-bar">
              <div class="factor-fill" [style.width.%]="f.score"
                   [class.good]="f.score >= 70" [class.warn]="f.score >= 40 && f.score < 70" [class.bad]="f.score < 40">
              </div>
            </div>
            <span class="factor-score">{{ f.score | number:'1.0-0' }}/100</span>
          </div>
        </div>
      </div>
    </div>

    <div class="card ai-loading" *ngIf="healthLoading">
      <div class="spinner-sm"></div><p>{{ 'REPORT.COMPUTING' | translate }}</p>
    </div>

    <!-- 📈 AI SECTION: Revenue Forecast -->
    <div class="card forecast-card" *ngIf="forecast && forecast.actual?.length > 0">
      <div class="section-header">
        <h2>📈 {{ 'REPORT.FORECAST_TITLE' | translate }}</h2>
        <span class="ai-badge">{{ 'REPORT.ML_PREDICTION' | translate }}</span>
      </div>
      <p class="forecast-subtitle">
        {{ 'REPORT.FORECAST_SUB' | translate }}
        <span class="confidence-badge" *ngIf="forecast.confidence">
          {{ 'REPORT.CONFIDENCE' | translate }}: {{ forecast.confidence | percent }}
        </span>
      </p>

      <div class="chart-container">
        <canvas baseChart
                [data]="lineChartData"
                [options]="lineChartOptions"
                [type]="'line'">
        </canvas>
      </div>

      <div class="forecast-footer">
        <div class="trend-indicator" [class.up]="forecast.trend === 'INCREASING' || forecast.trend === 'Increasing'" [class.down]="forecast.trend === 'DECREASING' || forecast.trend === 'Decreasing'">
          <span class="trend-icon">{{ (forecast.trend === 'INCREASING' || forecast.trend === 'Increasing') ? '↑' : (forecast.trend === 'DECREASING' || forecast.trend === 'Decreasing' ? '↓' : '→') }}</span>
          <span class="trend-text">{{ 'REPORT.TREND' | translate }}: {{ getTrendKey(forecast.trend) | translate }}</span>
        </div>
        <div class="total-prediction">
          {{ 'REPORT.NEXT_WEEK' | translate }}: <strong>{{ forecast.nextWeekTotal | number:'1.2-2' }}</strong>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-header { margin-bottom: 24px; }
    .page-header h1 { font-size: 26px; font-weight: 800; color: var(--c-darkest, #021024); margin: 0 0 6px; }
    .page-subtitle { color: var(--c-mid, #5483B3); font-size: 14px; margin: 0; }

    .kpi-card { text-align: center; }
    .kpi-label { font-size: 12px; font-weight: 700; color: var(--c-mid, #5483B3); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
    .kpi-value { font-size: 24px; font-weight: 800; color: var(--c-darkest, #021024); }
    .kpi-value.positive { color: #059669; }
    .kpi-value.negative { color: #c0392b; }

    /* Health Card */
    .health-card { position: relative; overflow: hidden; }
    .health-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; }
    .health-explain { color: var(--c-mid, #5483B3); font-size: 14px; line-height: 1.5; margin: 12px 0 0; max-width: 450px; }
    
    .health-score-circle {
      width: 110px; height: 110px; border-radius: 50%; border: 8px solid var(--c-bg, #f0f6ff);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      flex-shrink: 0; position: relative; background: var(--bg-primary, #fff);
    }
    .health-score-circle.good { border-color: #e9f7ef; color: #059669; }
    .health-score-circle.warn { border-color: #fef9e7; color: #b7770d; }
    .health-score-circle.bad  { border-color: #fce7e7; color: #c0392b; }
    
    .score-num { font-size: 32px; font-weight: 800; line-height: 1; }
    .score-max { font-size: 12px; font-weight: 600; opacity: 0.7; }
    .score-status {
      position: absolute; bottom: -10px; left: 50%; transform: translateX(-50%);
      white-space: nowrap; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 700;
      text-transform: uppercase; background: #f0f6ff; color: #5483B3;
    }
    .score-status.good { background: #059669; color: #fff; }
    .score-status.warn { background: #b7770d; color: #fff; }
    .score-status.bad  { background: #c0392b; color: #fff; }

    .gauge-track { height: 8px; background: #f0f6ff; border-radius: 4px; margin: 24px 0; overflow: hidden; }
    .gauge-fill { height: 100%; border-radius: 4px; transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1); }
    .gauge-fill.good { background: linear-gradient(90deg, #10b981, #059669); }
    .gauge-fill.warn { background: linear-gradient(90deg, #f59e0b, #d97706); }
    .gauge-fill.bad  { background: linear-gradient(90deg, #ef4444, #dc2626); }

    .factors-grid h3 { font-size: 14px; margin: 0 0 16px; color: var(--c-darkest, #021024); border: none !important; }
    .factor-row { display: flex; align-items: center; gap: 16px; padding: 8px 0; border-bottom: 1px solid var(--c-bg, #f0f6ff); }
    .factor-row:last-child { border-bottom: none; }
    .factor-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .factor-name { font-size: 13px; font-weight: 700; color: var(--c-dark, #052659); }
    .factor-detail { font-size: 11px; color: var(--c-light, #7DA0CA); }
    .factor-bar-wrap { width: 140px; display: flex; align-items: center; gap: 10px; }
    .factor-bar { flex: 1; height: 6px; background: #f0f6ff; border-radius: 3px; overflow: hidden; }
    .factor-fill { height: 100%; border-radius: 3px; }
    .factor-fill.good { background: #10b981; }
    .factor-fill.warn { background: #f59e0b; }
    .factor-fill.bad  { background: #ef4444; }
    .factor-score { font-size: 12px; font-weight: 700; color: #021024; width: 45px; text-align: right; font-family: monospace; }

    .chart-container { height: 280px; margin: 20px 0; position: relative; }
    .forecast-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 16px; border-top: 1px solid #f0f6ff; }
    .trend-indicator { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 14px; color: var(--c-mid, #5483B3); }
    .trend-indicator.up { color: #059669; }
    .trend-indicator.down { color: #c0392b; }
    .trend-icon { font-size: 20px; }
    .total-prediction { font-size: 14px; color: var(--c-darkest, #021024); }
    .total-prediction strong { font-size: 18px; color: var(--c-dark, #052659); margin-left: 6px; }

    .ai-badge {
      background: var(--c-bg, #f0f6ff); color: var(--c-dark, #052659); padding: 2px 8px; border-radius: 4px;
      font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;
      display: inline-flex; align-items: center; border: 1px solid var(--c-lightest, #C1E8FF);
    }
    .confidence-badge { font-size: 11px; font-weight: 700; color: #059669; background: #e9f7ef; padding: 2px 8px; border-radius: 4px; margin-left: 8px; }

    .ai-loading { display: flex; align-items: center; gap: 12px; justify-content: center; padding: 24px; color: #5483B3; font-style: italic; }
  `],
})
export class ReportDashboardComponent implements OnInit {
  health: any;
  forecast: any;
  healthLoading = false;

  lineChartData: ChartData<'line'> = { datasets: [], labels: [] };
  lineChartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'top' } },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(193, 232, 255, 0.3)' } },
      x: { grid: { display: false } }
    }
  };

  constructor(
    private api: ApiService, 
    private translate: TranslateService,
    private themeService: ThemeService
  ) { }

  ngOnInit() {
    this.healthLoading = true;
    this.api.getHealthScore().subscribe({
      next: (data) => {
        this.health = data;
        this.healthLoading = false;
      },
      error: () => this.healthLoading = false
    });

    this.api.getSalesForecast().subscribe(data => {
      this.forecast = data;
      this.prepareChart();
    });

    this.themeService.colorTheme$.subscribe(() => this.prepareChart());
    this.themeService.isDarkMode$.subscribe(() => this.prepareChart());
  }

  getStatusKey(status: string): string {
    return status && status === status.toUpperCase() ? 'ML.' + status : status;
  }

  getFactorKey(name: string): string {
    return name && name === name.toUpperCase() ? 'REPORT.' + name : name;
  }

  getTrendKey(trend: string): string {
    return trend && trend === trend.toUpperCase() ? 'ML.' + trend : trend;
  }

  prepareChart() {
    if (!this.forecast) return;
    
    // Past data
    const actualLabels = this.forecast.actual.map((d: any) => d.date.split('T')[0]);
    const actualValues = this.forecast.actual.map((d: any) => d.revenue);

    // Future data (starts at last day for continuity)
    const futureLabels = this.forecast.forecast.map((d: any) => d.date);
    const futureValues = this.forecast.forecast.map((d: any) => d.revenue);

    const style = getComputedStyle(document.documentElement);
    const cDark = style.getPropertyValue('--c-dark').trim() || '#052659';
    const cMid = style.getPropertyValue('--c-mid').trim() || '#5483B3';

    this.lineChartData = {
      labels: [...actualLabels, ...futureLabels],
      datasets: [
        {
          data: actualValues,
          label: this.translate.instant('REPORT.ACTUAL'),
          borderColor: cDark,
          backgroundColor: cDark + '20',
          fill: true,
          tension: 0.3,
        },
        {
          data: [...Array(actualValues.length - 1).fill(null), actualValues[actualValues.length - 1], ...futureValues],
          label: this.translate.instant('REPORT.FORECAST'),
          borderColor: cMid,
          borderDash: [5, 5],
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.3,
        }
      ]
    };
  }
}
