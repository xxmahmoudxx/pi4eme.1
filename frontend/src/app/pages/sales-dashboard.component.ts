import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgChartsModule } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';
import { CsvUploadComponent } from '../components/csv-upload.component';
import { ApiService } from '../services/api.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-sales-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, CsvUploadComponent, NgChartsModule, TranslateModule],
  template: `
    <div class="page-header">
      <h1>💰 Sales Dashboard</h1>
      <p class="page-subtitle">Monitor revenue, customers, and sales performance</p>
    </div>

    <!-- KPI Cards -->
    <div class="kpi-grid" *ngIf="kpis">
      <div class="kpi-card"><span class="kpi-icon">💵</span><div class="kpi-content"><span class="kpi-value">{{ kpis.totalRevenue | number:'1.2-2' }}</span><span class="kpi-label">Total Revenue</span></div></div>
      <div class="kpi-card"><span class="kpi-icon">🧾</span><div class="kpi-content"><span class="kpi-value">{{ kpis.count }}</span><span class="kpi-label">Total Orders</span></div></div>
      <div class="kpi-card"><span class="kpi-icon">📊</span><div class="kpi-content"><span class="kpi-value">{{ kpis.avgOrderValue | number:'1.2-2' }}</span><span class="kpi-label">Avg Order Value</span></div></div>
      <div class="kpi-card"><span class="kpi-icon">👥</span><div class="kpi-content"><span class="kpi-value">{{ kpis.uniqueCustomers }}</span><span class="kpi-label">Unique Customers</span></div></div>
      <div class="kpi-card accent"><span class="kpi-icon">🏆</span><div class="kpi-content"><span class="kpi-value">{{ kpis.topProduct }}</span><span class="kpi-label">Top Product</span></div></div>
    </div>

    <!-- 🏆 AI SECTION: Product Performance Insights -->
    <div class="card ai-section" *ngIf="productPerformance.length > 0">
      <div class="ai-header">
        <div>
          <h2>🏆 Product Performance Insights</h2>
          <p class="ai-subtitle">AI classification of product performance based on sales trends</p>
        </div>
        <span class="ai-badge">🧠 AI</span>
      </div>

      <div class="perf-grid">
        <div class="perf-card" *ngFor="let p of productPerformance">
          <div class="perf-top">
            <span class="perf-icon">{{ p.icon }}</span>
            <div class="perf-info">
              <span class="perf-name">{{ p.product }}</span>
              <span class="perf-label" [class]="'label-' + p.label.toLowerCase().replace(' ', '-')">{{ p.label }}</span>
            </div>
            <span class="perf-trend">{{ p.trendArrow }}</span>
          </div>
          <div class="perf-metrics">
            <div class="pm"><span class="pm-v">{{ p.revenue | number:'1.2-2' }}</span><span class="pm-l">Revenue</span></div>
            <div class="pm"><span class="pm-v">{{ p.quantity }}</span><span class="pm-l">Qty Sold</span></div>
            <div class="pm"><span class="pm-v">{{ p.orders }}</span><span class="pm-l">Orders</span></div>
            <div class="pm"><span class="pm-v" [class.positive]="p.growth > 0" [class.negative]="p.growth < 0">{{ p.growth > 0 ? '+' : '' }}{{ p.growth }}%</span><span class="pm-l">Growth</span></div>
          </div>
          <p class="perf-explain">{{ p.explanation }}</p>
        </div>
      </div>
    </div>

    <div class="card ai-loading" *ngIf="aiLoading">
      <div class="spinner-sm"></div><p>Analyzing product performance...</p>
    </div>

    <!-- Upload + Manual Entry -->
    <div class="grid grid-2">
      <div class="card">
        <div class="card-icon">📤</div>
        <h2>Import Sales CSV</h2>
        <app-csv-upload (fileSelected)="upload($event)"></app-csv-upload>
        <div *ngIf="uploadMsg" class="status-msg" [class.error]="uploadError">{{ uploadMsg }}</div>
        <div *ngIf="uploadErrors.length" class="validation-errors">
          <p *ngFor="let e of uploadErrors" class="val-err">⚠️ {{ e }}</p>
        </div>
      </div>
      <div class="card">
        <div class="card-icon">✏️</div>
        <h2>Add Sale Manually</h2>
        <form (ngSubmit)="addManual()" class="manual-form">
          <div class="form-row">
            <div class="form-group"><label>Date *</label><input type="date" [(ngModel)]="form.date" name="date" required /></div>
            <div class="form-group"><label>Customer *</label><input type="text" [(ngModel)]="form.customer" name="customer" placeholder="e.g. John Doe" required /></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Product *</label><input type="text" [(ngModel)]="form.product" name="product" placeholder="e.g. Premium Widget" required /></div>
            <div class="form-group"><label>Category</label><input type="text" [(ngModel)]="form.category" name="category" placeholder="e.g. Electronics" /></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Quantity *</label><input type="number" [(ngModel)]="form.quantity" name="quantity" min="1" required /></div>
            <div class="form-group"><label>Unit Price *</label><input type="number" [(ngModel)]="form.unitPrice" name="unitPrice" step="0.01" min="0" required /></div>
          </div>
          <div class="form-group"><label>Notes</label><input type="text" [(ngModel)]="form.notes" name="notes" placeholder="Optional notes..." /></div>
          <button class="btn-submit" type="submit" [disabled]="manualLoading">{{ manualLoading ? 'Adding...' : '+ Add Sale' }}</button>
          <div *ngIf="manualMsg" class="status-msg" [class.error]="manualError">{{ manualMsg }}</div>
        </form>
      </div>
    </div>

    <!-- Charts -->
    <div class="grid grid-2" *ngIf="kpis && kpis.count > 0">
      <div class="card"><h3>📈 Revenue Over Time</h3><div class="chart-wrapper"><canvas baseChart [data]="lineChartData" type="line" [options]="lineChartOptions"></canvas></div></div>
      <div class="card"><h3>📦 Revenue by Product</h3><div class="chart-wrapper"><canvas baseChart [data]="barChartData" type="bar" [options]="barChartOptions"></canvas></div></div>
    </div>
    <div class="grid grid-2" *ngIf="kpis && kpis.count > 0">
      <div class="card"><h3>👥 Revenue by Customer</h3><div class="chart-wrapper doughnut-wrapper"><canvas baseChart [data]="doughnutData" type="doughnut" [options]="doughnutOptions"></canvas></div></div>
      <div class="card" *ngIf="sales.length > 0">
        <h3>📋 Recent Sales</h3>
        <div class="table-scroll">
          <table class="table">
            <thead><tr><th>Date</th><th>Customer</th><th>Product</th><th>Category</th><th>Qty</th><th>Unit Price</th><th>Total</th><th></th></tr></thead>
            <tbody>
              <tr *ngFor="let row of sales">
                <td>{{ row.date | date:'yyyy-MM-dd' }}</td><td>{{ row.customer }}</td><td>{{ row.product }}</td>
                <td><span class="type-badge" *ngIf="row.category">{{ row.category }}</span></td>
                <td>{{ row.quantity }}</td><td>{{ row.unitPrice | number:'1.2-2' }}</td>
                <td><strong>{{ row.totalAmount | number:'1.2-2' }}</strong></td>
                <td><button class="btn-del" (click)="deleteSale(row._id)">🗑️</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="card empty-state" *ngIf="!loading && kpis && kpis.count === 0"><div class="empty-icon">💰</div><h3>No sales yet</h3><p>Upload a CSV file or add sales manually to see your dashboard come to life.</p></div>
    <div class="card loading-state" *ngIf="loading"><div class="spinner"></div><p>Loading your sales data...</p></div>
  `,
  styles: [`
    .page-header { margin-bottom: 24px; }
    .page-header h1 { font-size: 26px; font-weight: 800; color: #021024; margin: 0 0 6px; }
    .page-subtitle { color: #5483B3; font-size: 14px; margin: 0; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .kpi-card { display: flex; align-items: center; gap: 14px; background: white; border-radius: 14px; padding: 18px 20px; box-shadow: 0 2px 12px rgba(2,16,36,0.08); border: 1px solid rgba(84,131,179,0.1); transition: transform 0.2s, box-shadow 0.2s; }
    .kpi-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(2,16,36,0.12); }
    .kpi-card.accent { background: linear-gradient(135deg, #052659, #5483B3); }
    .kpi-card.accent .kpi-value, .kpi-card.accent .kpi-label { color: white; }
    .kpi-icon { font-size: 28px; } .kpi-content { display: flex; flex-direction: column; }
    .kpi-value { font-size: 20px; font-weight: 800; color: #021024; }
    .kpi-label { font-size: 11px; color: #5483B3; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
    .card-icon { font-size: 28px; margin-bottom: 4px; }
    .manual-form { display: flex; flex-direction: column; gap: 12px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-group { display: flex; flex-direction: column; gap: 4px; }
    .form-group label { font-size: 11px; font-weight: 700; color: #5483B3; text-transform: uppercase; letter-spacing: 0.5px; }
    .form-group input { padding: 9px 12px; border: 1.5px solid #C1E8FF; border-radius: 8px; font-size: 13px; font-family: inherit; color: #021024; transition: border-color 0.2s; }
    .form-group input:focus { outline: none; border-color: #5483B3; box-shadow: 0 0 0 3px rgba(84,131,179,0.12); }
    .btn-submit { padding: 10px; border: none; border-radius: 8px; background: linear-gradient(135deg, #052659 0%, #5483B3 100%); color: white; font-size: 14px; font-weight: 700; font-family: inherit; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 8px rgba(5,38,89,0.25); }
    .btn-submit:hover:not(:disabled) { background: linear-gradient(135deg, #021024 0%, #052659 100%); transform: translateY(-1px); }
    .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
    .status-msg { margin-top: 10px; padding: 10px 14px; background: #e9f7ef; color: #1e8449; border-radius: 8px; font-size: 13px; font-weight: 500; border: 1px solid #a9dfbf; }
    .status-msg.error { background: #fce7e7; color: #c0392b; border-color: #f5b7b1; }
    .validation-errors { margin-top: 8px; } .val-err { font-size: 12px; color: #b7770d; margin: 4px 0; }
    .chart-wrapper { position: relative; height: 280px; }
    .doughnut-wrapper { height: 260px; max-width: 320px; margin: 0 auto; }
    .table-scroll { overflow-x: auto; }
    .type-badge { display: inline-block; padding: 2px 8px; border-radius: 6px; background: #C1E8FF; color: #052659; font-size: 11px; font-weight: 600; text-transform: uppercase; }
    .btn-del { background: none; border: none; cursor: pointer; font-size: 16px; padding: 4px 6px; border-radius: 6px; transition: background 0.2s; }
    .btn-del:hover { background: #fce7e7; }
    .empty-state { text-align: center; padding: 40px; }
    .empty-icon { font-size: 48px; margin-bottom: 10px; }
    .empty-state h3 { color: #052659; margin-bottom: 8px; } .empty-state p { color: #5483B3; font-size: 14px; }
    .loading-state { text-align: center; padding: 40px; }
    .spinner { width: 36px; height: 36px; margin: 0 auto 12px; border: 3px solid #C1E8FF; border-top: 3px solid #052659; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ─── AI Section ─── */
    .ai-section { border: 1.5px solid rgba(84,131,179,0.2); background: linear-gradient(135deg, #f8fbff 0%, #f0f6ff 100%); }
    .ai-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
    .ai-header h2 { margin: 0 0 4px; font-size: 18px; color: #021024; border: none !important; padding: 0 !important; }
    .ai-subtitle { color: #5483B3; font-size: 13px; margin: 0; }
    .ai-badge { background: linear-gradient(135deg, #052659, #5483B3); color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; white-space: nowrap; }
    .perf-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
    .perf-card { background: white; border-radius: 12px; padding: 16px; border: 1px solid #e2e8f0; transition: all 0.2s; }
    .perf-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
    .perf-top { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .perf-icon { font-size: 24px; }
    .perf-info { display: flex; flex-direction: column; flex: 1; }
    .perf-name { font-weight: 700; font-size: 15px; color: #021024; }
    .perf-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .label-top-performer { color: #059669; }
    .label-rising-star { color: #0ea5e9; }
    .label-stable { color: #5483B3; }
    .label-declining { color: #ef4444; }
    .label-low-demand { color: #b7770d; }
    .perf-trend { font-size: 24px; font-weight: 800; }
    .perf-metrics { display: flex; gap: 14px; margin-bottom: 8px; }
    .pm { display: flex; flex-direction: column; }
    .pm-v { font-size: 14px; font-weight: 800; color: #052659; }
    .pm-l { font-size: 10px; color: #7DA0CA; text-transform: uppercase; font-weight: 600; }
    .positive { color: #059669 !important; }
    .negative { color: #ef4444 !important; }
    .perf-explain { font-size: 12px; color: #5483B3; margin: 0; line-height: 1.4; }
    .ai-loading { display: flex; align-items: center; gap: 12px; padding: 16px 20px; }
    .spinner-sm { width: 20px; height: 20px; border: 2px solid #C1E8FF; border-top: 2px solid #052659; border-radius: 50%; animation: spin 0.8s linear infinite; }
    .ai-loading p { margin: 0; color: #5483B3; font-size: 13px; }
  `],
})
export class SalesDashboardComponent implements OnInit {
  loading = true; aiLoading = false;
  kpis: any = null; sales: any[] = [];
  productPerformance: any[] = [];
  uploadMsg = ''; uploadError = false; uploadErrors: string[] = [];
  manualMsg = ''; manualError = false; manualLoading = false;
  form: any = { date: new Date().toISOString().slice(0, 10), customer: '', product: '', category: '', quantity: 1, unitPrice: 0, notes: '' };

  lineChartData: ChartData<'line'> = { labels: [], datasets: [] };
  lineChartOptions: ChartOptions<'line'> = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } };
  barChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  barChartOptions: ChartOptions<'bar'> = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } };
  doughnutData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  doughnutOptions: ChartOptions<'doughnut'> = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } };
  private chartColors = ['#052659', '#5483B3', '#7DA0CA', '#C1E8FF', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  constructor(private api: ApiService, private translate: TranslateService) { }

  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.loading = true;
    this.api.getSaleKpis().subscribe({ next: (k) => { this.kpis = k; this.loading = false; }, error: () => { this.loading = false; } });
    this.api.getSales().subscribe((d) => (this.sales = d));
    this.loadCharts();
    this.loadAi();
  }

  loadCharts() {
    this.api.getRevenueOverTime('day').subscribe((data) => {
      this.lineChartData = { labels: data.map((d) => d._id), datasets: [{ data: data.map((d) => d.revenue), label: 'Revenue', borderColor: '#052659', backgroundColor: 'rgba(84,131,179,0.15)', tension: 0.4, fill: true, pointBackgroundColor: '#052659' }] };
    });
    this.api.getRevenueByProduct().subscribe((data) => {
      this.barChartData = { labels: data.map((d) => d._id), datasets: [{ data: data.map((d) => d.revenue), label: 'Revenue', backgroundColor: data.map((_, i) => this.chartColors[i % this.chartColors.length]), borderRadius: 6 }] };
    });
    this.api.getRevenueByCustomer().subscribe((data) => {
      this.doughnutData = { labels: data.map((d) => d._id), datasets: [{ data: data.map((d) => d.revenue), backgroundColor: data.map((_, i) => this.chartColors[i % this.chartColors.length]) }] };
    });
  }

  loadAi() {
    this.aiLoading = true;
    this.api.getProductPerformance().subscribe({
      next: (r) => { this.productPerformance = r; this.aiLoading = false; },
      error: () => { this.productPerformance = []; this.aiLoading = false; },
    });
  }

  upload(file: File) {
    this.uploadMsg = ''; this.uploadError = false; this.uploadErrors = [];
    this.api.uploadSales(file).subscribe({
      next: (res: any) => { this.uploadMsg = `✅ Imported ${res.imported} sales`; this.uploadErrors = res.errors || []; this.loadAll(); },
      error: (err) => { this.uploadMsg = err?.error?.message || 'Upload failed'; this.uploadError = true; },
    });
  }

  addManual() {
    this.manualLoading = true; this.manualMsg = ''; this.manualError = false;
    this.api.createSale(this.form).subscribe({
      next: () => { this.manualMsg = '✅ Sale added'; this.form = { date: new Date().toISOString().slice(0, 10), customer: '', product: '', category: '', quantity: 1, unitPrice: 0, notes: '' }; this.loadAll(); this.manualLoading = false; },
      error: (err) => { this.manualMsg = err?.error?.message || 'Failed'; this.manualError = true; this.manualLoading = false; },
    });
  }

  deleteSale(id: string) {
    if (!confirm('Delete this sale?')) return;
    this.api.deleteSale(id).subscribe(() => this.loadAll());
  }
}
