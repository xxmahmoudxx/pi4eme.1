import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { ChartData } from 'chart.js';
import { CsvUploadComponent } from '../components/csv-upload.component';
import { ApiService } from '../services/api.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-sales-dashboard',
  standalone: true,
  imports: [CommonModule, CsvUploadComponent, NgChartsModule, TranslateModule],
  template: `
    <div class="page-header">
      <h1>{{ 'SALES.UPLOAD_CSV' | translate }}</h1>
      <p class="page-subtitle">Monitor your sales performance and AI-driven insights</p>
    </div>

    <div class="grid grid-2">
      <div class="card upload-card">
        <div class="card-icon">📤</div>
        <h2>{{ 'SALES.UPLOAD_CSV' | translate }}</h2>
        <app-csv-upload (fileSelected)="upload($event)"></app-csv-upload>
        <p *ngIf="message" class="status-msg">{{ message }}</p>
      </div>
      <div class="card insight-card">
        <div class="card-icon">🤖</div>
        <h2>{{ 'SALES.AI_INSIGHTS' | translate }}</h2>
        <div class="insight-row">
          <div class="insight-item best">
            <span class="insight-label">{{ 'SALES.BEST_PRODUCT' | translate }}</span>
            <span class="insight-value">{{ bestProduct }}</span>
          </div>
          <div class="insight-item worst">
            <span class="insight-label">{{ 'SALES.WORST_PRODUCT' | translate }}</span>
            <span class="insight-value">{{ worstProduct }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <h3>{{ 'SALES.REVENUE_TIME' | translate }}</h3>
        <canvas baseChart [data]="lineChartData" chartType="line"></canvas>
      </div>
      <div class="card">
        <h3>{{ 'SALES.REVENUE_PRODUCT' | translate }}</h3>
        <canvas baseChart [data]="barChartData" chartType="bar"></canvas>
      </div>
    </div>
  `,
  styles: [`
    .page-header { margin-bottom: 24px; }
    .page-header h1 { font-size: 26px; font-weight: 800; color: #021024; margin: 0 0 6px; }
    .page-subtitle { color: #5483B3; font-size: 14px; margin: 0; }

    .card-icon { font-size: 28px; margin-bottom: 4px; }

    .insight-row { display: flex; flex-direction: column; gap: 12px; margin-top: 6px; }
    .insight-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px 16px; border-radius: 10px;
    }
    .insight-item.best  { background: linear-gradient(135deg, #e9f7ef, #C1E8FF); border: 1px solid #a9dfbf; }
    .insight-item.worst { background: linear-gradient(135deg, #fce7e7, #fef9e7); border: 1px solid #f5b7b1; }
    .insight-label { font-size: 12px; font-weight: 700; color: #5483B3; text-transform: uppercase; letter-spacing: 0.5px; }
    .insight-value { font-size: 15px; font-weight: 700; color: #021024; }

    .status-msg {
      margin-top: 10px; padding: 10px 14px;
      background: #C1E8FF; color: #052659;
      border-radius: 8px; font-size: 13px; font-weight: 500;
      border: 1px solid #7DA0CA;
    }

    .upload-card, .insight-card { cursor: default; }
  `],
})
export class SalesDashboardComponent implements OnInit {
  message = '';
  bestProduct = 'N/A';
  worstProduct = 'N/A';

  lineChartData: ChartData<'line'> = {
    labels: [],
    datasets: [{ data: [], label: 'Revenue', borderColor: '#052659', backgroundColor: 'rgba(84,131,179,0.15)', tension: 0.4, fill: true }],
  };

  barChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [{ data: [], label: 'Revenue', backgroundColor: 'rgba(84,131,179,0.7)', borderColor: '#052659', borderWidth: 1, borderRadius: 6 }],
  };

  constructor(private api: ApiService, private translate: TranslateService) { }

  ngOnInit() {
    this.loadCharts();
    this.loadInsights();
  }

  upload(file: File) {
    this.api.uploadSales(file).subscribe({
      next: () => {
        this.message = this.translate.instant('SALES.SUCCESS');
        this.loadCharts();
        this.loadInsights();
      },
      error: (err) => {
        this.message = err?.error?.message || this.translate.instant('SALES.FAILED');
      },
    });
  }

  loadCharts() {
    this.api.getRevenueOverTime('day').subscribe((data) => {
      this.lineChartData.labels = data.map((item) => item._id);
      this.lineChartData.datasets[0].data = data.map((item) => item.revenue);
    });

    this.api.getRevenueByProduct().subscribe((data) => {
      this.barChartData.labels = data.map((item) => item._id);
      this.barChartData.datasets[0].data = data.map((item) => item.revenue);
    });
  }

  loadInsights() {
    this.api.getAiInsights('sales').subscribe((insights) => {
      const latest = insights?.[0]?.payload;
      if (latest) {
        this.bestProduct = latest.best_product || 'N/A';
        this.worstProduct = latest.worst_product || 'N/A';
      }
    });
  }
}
