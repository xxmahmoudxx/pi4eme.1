import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';
import { ApiService } from '../services/api.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-report-dashboard',
  standalone: true,
  imports: [CommonModule, NgChartsModule, TranslateModule],
  template: `
    <div class="page-header">
      <h1>📊 Financial Report</h1>
      <p class="page-subtitle">Company financial overview, AI health assessment & revenue forecast</p>
    </div>

    <!-- Financial KPI Cards -->
    <div class="grid grid-3" *ngIf="health">
      <div class="card kpi-card">
        <div class="kpi-label">Revenue</div>
        <div class="kpi-value positive">{{ health.revenue | number:'1.2-2' }}</div>
      </div>
      <div class="card kpi-card">
        <div class="kpi-label">Costs</div>
        <div class="kpi-value negative">{{ health.costs | number:'1.2-2' }}</div>
      </div>
      <div class="card kpi-card">
        <div class="kpi-label">Profit</div>
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
            <h2>🧠 Company Health Score</h2>
            <span class="ai-badge">AI-Powered</span>
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
                [class.good]="health.status === 'Healthy'"
                [class.warn]="health.status === 'Warning'"
                [class.bad]="health.status === 'Critical'">
            {{ health.status }}
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
        <h3>📋 Health Factor Breakdown</h3>
        <div class="factor-row" *ngFor="let f of health.factors">
          <div class="factor-info">
            <span class="factor-name">{{ f.name }}</span>
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
      <div class="spinner-sm"></div><p>Computing health score...</p>
    </div>

    <!-- 📈 AI SECTION: Revenue Forecast -->
    <div class="card forecast-card" *ngIf="forecast && forecast.actual?.length > 0">
      <div class="section-header">
        <h2>📈 Revenue Forecast</h2>
        <span class="ai-badge">ML Prediction</span>
      </div>
      <p class="forecast-subtitle">
        Linear regression model predicting next 7 days of revenue
        <span class="confidence-badge" *ngIf="forecast.confidence">
          {{ forecast.confidence }}% confidence
        </span>
      </p>

      <div class="forecast-kpis">
        <div class="fk">
          <span class="fk-val trend-{{ forecast.trend?.toLowerCase() }}">{{ forecast.trend }}</span>
          <span class="fk-lbl">Trend Direction</span>
        </div>
        <div class="fk">
          <span class="fk-val">{{ forecast.nextWeekTotal | number:'1.2-2' }}</span>
          <span class="fk-lbl">Next 7-Day Forecast</span>
        </div>
      </div>

      <div class="chart-wrapper">
        <canvas baseChart [data]="forecastChartData" type="line" [options]="forecastChartOptions"></canvas>
      </div>
    </div>

    <div class="card ai-loading" *ngIf="forecastLoading">
      <div class="spinner-sm"></div><p>Generating revenue forecast...</p>
    </div>

    <!-- Empty state -->
    <div class="card empty-state" *ngIf="!healthLoading && !forecastLoading && !health">
      <div class="empty-icon">📊</div>
      <h3>No data available</h3>
      <p>Upload sales and purchase data to generate your financial report and AI insights.</p>
    </div>
  `,
  styles: [`
    .page-header { margin-bottom: 24px; }
    .page-header h1 { font-size: 26px; font-weight: 800; color: #021024; margin: 0 0 6px; }
    .page-subtitle { color: #5483B3; font-size: 14px; margin: 0; }

    .kpi-card { background: linear-gradient(135deg, #021024 0%, #052659 100%) !important; color: white; border: none !important; }
    .kpi-card:hover { box-shadow: 0 8px 24px rgba(2,16,36,0.3) !important; }
    .kpi-label { font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #7DA0CA; margin-bottom: 10px; }
    .kpi-value { font-size: 26px; font-weight: 800; color: #C1E8FF; line-height: 1; }
    .kpi-value.positive { color: #6ee7b7; }
    .kpi-value.negative { color: #fca5a5; }

    .section-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
    .section-header h2 { margin: 0; font-size: 18px; color: #021024; border: none !important; padding: 0 !important; }
    .ai-badge { background: linear-gradient(135deg, #052659, #5483B3); color: white; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; white-space: nowrap; }

    /* Health Card */
    .health-card { border: 1.5px solid rgba(84,131,179,0.2); background: linear-gradient(135deg, #f8fbff 0%, #f0f6ff 100%); }
    .health-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; gap: 20px; }
    .health-explain { color: #5483B3; font-size: 14px; margin: 0; max-width: 500px; }
    .health-score-circle { display: flex; flex-direction: column; align-items: center; min-width: 100px; }
    .score-num { font-size: 52px; font-weight: 900; line-height: 1; }
    .score-max { font-size: 16px; font-weight: 600; color: #7DA0CA; margin-top: -4px; }
    .score-status { font-size: 13px; font-weight: 700; text-transform: uppercase; margin-top: 4px; }
    .health-score-circle.good .score-num { color: #059669; }
    .health-score-circle.warn .score-num { color: #b7770d; }
    .health-score-circle.bad .score-num { color: #c0392b; }
    .score-status.good { color: #059669; }
    .score-status.warn { color: #b7770d; }
    .score-status.bad { color: #c0392b; }

    .gauge-track { height: 12px; background: #e2e8f0; border-radius: 999px; overflow: hidden; margin-bottom: 20px; }
    .gauge-fill { height: 100%; border-radius: 999px; transition: width 1s ease; }
    .gauge-fill.good { background: linear-gradient(90deg, #059669, #10b981); }
    .gauge-fill.warn { background: linear-gradient(90deg, #b7770d, #f59e0b); }
    .gauge-fill.bad { background: linear-gradient(90deg, #c0392b, #ef4444); }

    .factors-grid { margin-top: 8px; }
    .factors-grid h3 { font-size: 14px; color: #052659; margin: 0 0 12px; }
    .factor-row { display: flex; align-items: center; gap: 16px; margin-bottom: 10px; }
    .factor-info { flex: 1; min-width: 0; }
    .factor-name { font-weight: 700; font-size: 13px; color: #021024; display: block; }
    .factor-detail { font-size: 11px; color: #7DA0CA; display: block; }
    .factor-bar-wrap { display: flex; align-items: center; gap: 8px; width: 200px; }
    .factor-bar { flex: 1; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
    .factor-fill { height: 100%; border-radius: 4px; transition: width 0.8s ease; }
    .factor-fill.good { background: #10b981; }
    .factor-fill.warn { background: #f59e0b; }
    .factor-fill.bad { background: #ef4444; }
    .factor-score { font-size: 12px; font-weight: 700; color: #052659; white-space: nowrap; }

    /* Forecast Card */
    .forecast-card { border: 1.5px solid rgba(84,131,179,0.2); background: linear-gradient(135deg, #f8fbff 0%, #f0f6ff 100%); }
    .forecast-subtitle { color: #5483B3; font-size: 13px; margin: 0 0 16px; }
    .confidence-badge { background: #e9f7ef; color: #059669; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; margin-left: 8px; }
    .forecast-kpis { display: flex; gap: 24px; margin-bottom: 16px; }
    .fk { display: flex; flex-direction: column; }
    .fk-val { font-size: 18px; font-weight: 800; color: #052659; }
    .fk-lbl { font-size: 10px; color: #7DA0CA; text-transform: uppercase; font-weight: 600; }
    .trend-increasing { color: #059669 !important; }
    .trend-decreasing { color: #ef4444 !important; }
    .trend-stable { color: #5483B3 !important; }
    .chart-wrapper { position: relative; height: 300px; }

    /* Shared */
    .empty-state { text-align: center; padding: 40px; }
    .empty-icon { font-size: 48px; margin-bottom: 10px; }
    .empty-state h3 { color: #052659; margin-bottom: 8px; }
    .empty-state p { color: #5483B3; font-size: 14px; }
    .ai-loading { display: flex; align-items: center; gap: 12px; padding: 16px 20px; }
    .spinner-sm { width: 20px; height: 20px; border: 2px solid #C1E8FF; border-top: 2px solid #052659; border-radius: 50%; animation: spin 0.8s linear infinite; }
    .ai-loading p { margin: 0; color: #5483B3; font-size: 13px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class ReportDashboardComponent implements OnInit {
  health: any = null;
  forecast: any = null;
  healthLoading = true;
  forecastLoading = true;

  forecastChartData: ChartData<'line'> = { labels: [], datasets: [] };
  forecastChartOptions: ChartOptions<'line'> = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
    scales: { y: { beginAtZero: true } },
  };

  constructor(private api: ApiService) { }

  ngOnInit() {
    this.loadHealth();
    this.loadForecast();
  }

  loadHealth() {
    this.healthLoading = true;
    this.api.getHealthScore().subscribe({
      next: (h) => { this.health = h; this.healthLoading = false; },
      error: () => { this.healthLoading = false; },
    });
  }

  loadForecast() {
    this.forecastLoading = true;
    this.api.getSalesForecast().subscribe({
      next: (f) => {
        this.forecast = f;
        this.buildForecastChart(f);
        this.forecastLoading = false;
      },
      error: () => { this.forecastLoading = false; },
    });
  }

  buildForecastChart(f: any) {
    const actualLabels = (f.actual || []).map((a: any) => a.date);
    const forecastLabels = (f.forecast || []).map((p: any) => p.date);
    const allLabels = [...actualLabels, ...forecastLabels];

    const actualData = (f.actual || []).map((a: any) => a.revenue);
    const forecastData = new Array(actualLabels.length).fill(null);

    // Connect forecast to last actual point
    if (actualData.length > 0 && f.forecast?.length > 0) {
      forecastData[actualData.length - 1] = actualData[actualData.length - 1];
    }
    for (const p of (f.forecast || [])) {
      forecastData.push(p.revenue);
    }

    // Pad actual data
    const paddedActual = [...actualData, ...new Array(forecastLabels.length).fill(null)];

    this.forecastChartData = {
      labels: allLabels,
      datasets: [
        {
          data: paddedActual, label: 'Actual Revenue',
          borderColor: '#052659', backgroundColor: 'rgba(5,38,89,0.1)',
          tension: 0.4, fill: true, pointBackgroundColor: '#052659',
        },
        {
          data: forecastData, label: 'Forecast (ML)',
          borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)',
          borderDash: [6, 4], tension: 0.4, fill: true, pointBackgroundColor: '#10b981',
        },
      ],
    };
  }
}
