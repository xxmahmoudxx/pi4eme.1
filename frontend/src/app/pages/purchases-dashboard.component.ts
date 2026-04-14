import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgChartsModule } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';
import { CsvUploadComponent } from '../components/csv-upload.component';
import { CsvMappingComponent } from '../components/csv-mapping.component';
import { DynamicFormComponent, FormFieldDef } from '../components/dynamic-form.component';
import { InvoiceImageUploadComponent, InvoiceExtraction } from '../components/invoice-image-upload.component';
import { ApiService } from '../services/api.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-purchases-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, CsvUploadComponent, CsvMappingComponent, DynamicFormComponent, InvoiceImageUploadComponent, NgChartsModule, TranslateModule],
  template: `
    <div class="page-header">
      <h1>Purchases Dashboard</h1>
      <p class="page-subtitle">Track your purchases, suppliers, and spending analytics</p>
    </div>

    <!-- KPI Cards -->
    <div class="kpi-grid" *ngIf="kpis">
      <div class="kpi-card">
        <span class="kpi-icon">💰</span>
        <div class="kpi-content">
          <span class="kpi-value">{{ kpis.totalPurchases | number:'1.2-2' }}</span>
          <span class="kpi-label">Total Purchases</span>
        </div>
      </div>
      <div class="kpi-card">
        <span class="kpi-icon">📋</span>
        <div class="kpi-content">
          <span class="kpi-value">{{ kpis.count }}</span>
          <span class="kpi-label">Total Orders</span>
        </div>
      </div>
      <div class="kpi-card">
        <span class="kpi-icon">📊</span>
        <div class="kpi-content">
          <span class="kpi-value">{{ kpis.avgPurchaseValue | number:'1.2-2' }}</span>
          <span class="kpi-label">Avg Purchase Value</span>
        </div>
      </div>
      <div class="kpi-card">
        <span class="kpi-icon">🏭</span>
        <div class="kpi-content">
          <span class="kpi-value">{{ kpis.uniqueSuppliers }}</span>
          <span class="kpi-label">Unique Suppliers</span>
        </div>
      </div>
      <div class="kpi-card accent">
        <span class="kpi-icon">⭐</span>
        <div class="kpi-content">
          <span class="kpi-value">{{ kpis.topSupplier }}</span>
          <span class="kpi-label">Top Supplier</span>
        </div>
      </div>
    </div>

    <!-- AI SECTION: Inventory Alerts -->
    <div class="card ai-section" *ngIf="stockoutRisks.length > 0">
      <div class="ai-header">
        <div>
          <h2>Inventory Alerts & Reorder Recommendations</h2>
          <p class="ai-subtitle">AI-powered stockout risk prediction based on your purchase & sales history</p>
        </div>
        <span class="ai-badge">AI</span>
      </div>
      <div class="alert-grid">
        <div class="alert-card" *ngFor="let item of stockoutRisks"
             [class.risk-high]="item.risk === 'High'"
             [class.risk-medium]="item.risk === 'Medium'"
             [class.risk-low]="item.risk === 'Low'">
          <div class="alert-top">
            <span class="product-name">{{ item.product }}</span>
            <span class="risk-badge" [class.high]="item.risk === 'High'"
                  [class.medium]="item.risk === 'Medium'" [class.low]="item.risk === 'Low'">
              {{ item.risk }} Risk
            </span>
          </div>
          <div class="alert-metrics">
            <div class="metric"><span class="metric-val">{{ item.estimatedStock }}</span><span class="metric-lbl">Est. Stock</span></div>
            <div class="metric"><span class="metric-val">{{ item.dailySalesVelocity }}/day</span><span class="metric-lbl">Sales Rate</span></div>
            <div class="metric">
              <span class="metric-val" [class.danger-text]="item.daysUntilStockout < 7">
                {{ item.daysUntilStockout < 999 ? (item.daysUntilStockout | number:'1.0-0') + ' days' : 'inf' }}
              </span>
              <span class="metric-lbl">Until Stockout</span>
            </div>
          </div>
          <div class="reorder-box" *ngIf="item.reorderQty > 0">
            <div class="reorder-header">
              <span class="reorder-icon" *ngIf="item.urgency === 'Urgent'">!!</span>
              <span class="reorder-icon" *ngIf="item.urgency === 'Soon'">!</span>
              <strong>Reorder {{ item.reorderQty }} units</strong>
              <span class="urgency" [class.urgent]="item.urgency === 'Urgent'">{{ item.urgency }}</span>
            </div>
            <p class="reorder-reason">{{ item.explanation }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="card ai-empty" *ngIf="stockoutRisks.length === 0 && kpis && kpis.count > 0 && !aiLoading">
      <span class="ai-empty-icon">OK</span>
      <p>No stockout risks detected. Your inventory levels look healthy!</p>
    </div>

    <div class="card ai-loading" *ngIf="aiLoading">
      <div class="spinner-sm"></div>
      <p>Analyzing inventory risks...</p>
    </div>

    <!-- Upload + Manual Entry Row -->
    <div class="grid grid-2">
      <div class="card">
        <div class="card-icon">📷</div>
        <h2>Upload Invoice Image</h2>
        <p class="hint">Upload a purchase invoice and we'll extract the data automatically</p>
        <app-invoice-image-upload [type]="'purchases'" (dataExtracted)="onInvoiceImageExtracted($event)"></app-invoice-image-upload>
      </div>
      <div class="card">
        <div class="card-icon">CSV</div>
        <h2>Import Purchases CSV</h2>
        <p class="hint">Supports ANY column names - you'll map them in the next step</p>
        <app-csv-upload (fileSelected)="onCsvSelected($event)"></app-csv-upload>
        <div *ngIf="uploadMsg" class="status-msg" [class.error]="uploadError">{{ uploadMsg }}</div>
        <div *ngIf="uploadErrors.length" class="validation-errors">
          <p *ngFor="let e of uploadErrors" class="val-err">{{ e }}</p>
        </div>
      </div>
    </div>

    <!-- Manual Entry -->
    <div class="grid grid-1">
      <div class="card">
        <div class="card-icon">+</div>
        <h2>Add Purchase Manually</h2>
        <app-dynamic-form
          [fields]="formFields"
          [loading]="manualLoading"
          submitLabel="+ Add Purchase"
          (formSubmitted)="addManual($event)">
        </app-dynamic-form>
        <div *ngIf="manualMsg" class="status-msg" [class.error]="manualError">{{ manualMsg }}</div>
      </div>
    </div>

    <!-- CSV Mapping Modal -->
    <app-csv-mapping
      [visible]="showMapping"
      [headers]="csvPreview.headers"
      [suggestedMapping]="csvPreview.suggestedMapping"
      [sampleRows]="csvPreview.sampleRows"
      [totalRows]="csvPreview.totalRows"
      [standardFields]="csvPreview.standardFields"
      [requiredFields]="['date', 'item', 'quantity']"
      [eitherOrFields]="['totalCost', 'unitCost']"
      [hints]="csvPreview.hints || []"
      [quality]="csvPreview.quality"
      [previewErrors]="csvPreview.previewErrors || []"
      [previewWarnings]="csvPreview.previewWarnings || []"
      [smartFixes]="csvPreview.smartFixes || []"
      (mappingConfirmed)="onMappingConfirmed($event)"
      (mappingCancelled)="showMapping = false">
    </app-csv-mapping>

    <!-- Charts -->
    <div class="grid grid-2" *ngIf="kpis && kpis.count > 0">
      <div class="card">
        <h3>Purchases Over Time</h3>
        <div class="chart-wrapper">
          <canvas baseChart [data]="lineChartData" type="line" [options]="lineChartOptions"></canvas>
        </div>
      </div>
      <div class="card">
        <h3>Purchases by Supplier</h3>
        <div class="chart-wrapper">
          <canvas baseChart [data]="barChartData" type="bar" [options]="barChartOptions"></canvas>
        </div>
      </div>
    </div>
    <div class="grid grid-2" *ngIf="kpis && kpis.count > 0">
      <div class="card">
        <h3>Purchases by Category</h3>
        <div class="chart-wrapper doughnut-wrapper">
          <canvas baseChart [data]="doughnutData" type="doughnut" [options]="doughnutOptions"></canvas>
        </div>
      </div>
      <div class="card" *ngIf="purchases.length > 0">
        <h3>Recent Purchases</h3>
        <div class="table-scroll">
          <table class="table">
            <thead>
              <tr>
                <th>Date</th><th>Supplier</th><th>Item</th><th>Category</th>
                <th>Qty</th><th>Unit Cost</th><th>Total</th><th></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of purchases">
                <td>{{ row.date | date:'yyyy-MM-dd' }}</td>
                <td>{{ row.supplier }}</td>
                <td>{{ row.item }}</td>
                <td><span class="type-badge" *ngIf="row.category">{{ row.category }}</span></td>
                <td>{{ row.quantity }}</td>
                <td>{{ row.unitCost | number:'1.2-2' }}</td>
                <td><strong>{{ row.totalCost | number:'1.2-2' }}</strong></td>
                <td><button class="btn-del" (click)="deletePurchase(row._id)">X</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="card empty-state" *ngIf="!loading && kpis && kpis.count === 0">
      <div class="empty-icon">--</div>
      <h3>No purchases yet</h3>
      <p>Upload a CSV file or add purchases manually to see your dashboard come to life.</p>
    </div>
    <div class="card loading-state" *ngIf="loading">
      <div class="spinner"></div>
      <p>Loading your purchase data...</p>
    </div>
  `,
  styles: [`
    .page-header { margin-bottom: 24px; }
    .page-header h1 { font-size: 26px; font-weight: 800; color: #021024; margin: 0 0 6px; }
    .page-subtitle { color: #5483B3; font-size: 14px; margin: 0; }
    .hint { color: #7DA0CA; font-size: 12px; margin: 0 0 8px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .kpi-card { display: flex; align-items: center; gap: 14px; background: white; border-radius: 14px; padding: 18px 20px; box-shadow: 0 2px 12px rgba(2,16,36,0.08); border: 1px solid rgba(84,131,179,0.1); transition: transform 0.2s, box-shadow 0.2s; }
    .kpi-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(2,16,36,0.12); }
    .kpi-card.accent { background: linear-gradient(135deg, #052659, #5483B3); }
    .kpi-card.accent .kpi-value, .kpi-card.accent .kpi-label { color: white; }
    .kpi-icon { font-size: 28px; }
    .kpi-content { display: flex; flex-direction: column; }
    .kpi-value { font-size: 20px; font-weight: 800; color: #021024; }
    .kpi-label { font-size: 11px; color: #5483B3; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
    .card-icon { font-size: 28px; margin-bottom: 4px; font-weight: 800; color: #052659; }
    .status-msg { margin-top: 10px; padding: 10px 14px; background: #e9f7ef; color: #1e8449; border-radius: 8px; font-size: 13px; font-weight: 500; border: 1px solid #a9dfbf; }
    .status-msg.error { background: #fce7e7; color: #c0392b; border-color: #f5b7b1; }
    .validation-errors { margin-top: 8px; } .val-err { font-size: 12px; color: #b7770d; margin: 4px 0; }
    .chart-wrapper { position: relative; height: 280px; }
    .doughnut-wrapper { height: 260px; max-width: 320px; margin: 0 auto; }
    .table-scroll { overflow-x: auto; }
    .type-badge { display: inline-block; padding: 2px 8px; border-radius: 6px; background: #C1E8FF; color: #052659; font-size: 11px; font-weight: 600; text-transform: uppercase; }
    .btn-del { background: none; border: none; cursor: pointer; font-size: 16px; padding: 4px 6px; border-radius: 6px; transition: background 0.2s; color: #c0392b; font-weight: 700; }
    .btn-del:hover { background: #fce7e7; }
    .empty-state { text-align: center; padding: 40px; }
    .empty-icon { font-size: 48px; margin-bottom: 10px; }
    .empty-state h3 { color: #052659; margin-bottom: 8px; }
    .empty-state p { color: #5483B3; font-size: 14px; }
    .loading-state { text-align: center; padding: 40px; }
    .spinner { width: 36px; height: 36px; margin: 0 auto 12px; border: 3px solid #C1E8FF; border-top: 3px solid #052659; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .ai-section { border: 1.5px solid rgba(84,131,179,0.2); background: linear-gradient(135deg, #f8fbff 0%, #f0f6ff 100%); }
    .ai-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
    .ai-header h2 { margin: 0 0 4px; font-size: 18px; color: #021024; border: none !important; padding: 0 !important; }
    .ai-subtitle { color: #5483B3; font-size: 13px; margin: 0; }
    .ai-badge { background: linear-gradient(135deg, #052659, #5483B3); color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; white-space: nowrap; }
    .alert-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
    .alert-card { background: white; border-radius: 12px; padding: 16px; border: 1px solid #e2e8f0; transition: all 0.2s; }
    .alert-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
    .alert-card.risk-high { border-left: 4px solid #ef4444; }
    .alert-card.risk-medium { border-left: 4px solid #f59e0b; }
    .alert-card.risk-low { border-left: 4px solid #10b981; }
    .alert-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .product-name { font-weight: 700; font-size: 15px; color: #021024; }
    .risk-badge { padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .risk-badge.high { background: #fce7e7; color: #c0392b; }
    .risk-badge.medium { background: #fef3cd; color: #b7770d; }
    .risk-badge.low { background: #e9f7ef; color: #1e8449; }
    .alert-metrics { display: flex; gap: 16px; margin-bottom: 10px; }
    .metric { display: flex; flex-direction: column; }
    .metric-val { font-size: 16px; font-weight: 800; color: #052659; }
    .metric-lbl { font-size: 10px; color: #7DA0CA; text-transform: uppercase; font-weight: 600; }
    .danger-text { color: #ef4444 !important; }
    .reorder-box { background: #f0f6ff; border-radius: 8px; padding: 10px 14px; border: 1px solid #C1E8FF; }
    .reorder-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .reorder-header strong { font-size: 13px; color: #052659; }
    .reorder-icon { font-size: 14px; color: #c0392b; font-weight: 800; }
    .urgency { font-size: 11px; font-weight: 700; color: #5483B3; text-transform: uppercase; }
    .urgency.urgent { color: #c0392b; }
    .reorder-reason { font-size: 12px; color: #5483B3; margin: 0; line-height: 1.4; }
    .ai-empty { display: flex; align-items: center; gap: 12px; padding: 16px 20px; background: #e9f7ef; border: 1px solid #a9dfbf; }
    .ai-empty-icon { font-size: 18px; font-weight: 800; color: #1e8449; }
    .ai-empty p { margin: 0; color: #1e8449; font-weight: 500; font-size: 14px; }
    .ai-loading { display: flex; align-items: center; gap: 12px; padding: 16px 20px; }
    .spinner-sm { width: 20px; height: 20px; border: 2px solid #C1E8FF; border-top: 2px solid #052659; border-radius: 50%; animation: spin 0.8s linear infinite; }
    .ai-loading p { margin: 0; color: #5483B3; font-size: 13px; }
  `],
})
export class PurchasesDashboardComponent implements OnInit {
  loading = true;
  aiLoading = false;
  kpis: any = null;
  purchases: any[] = [];
  stockoutRisks: any[] = [];
  uploadMsg = ''; uploadError = false; uploadErrors: string[] = [];
  manualMsg = ''; manualError = false; manualLoading = false;

  // CSV mapping state
  showMapping = false;
  pendingFile: File | null = null;
  csvPreview: any = { headers: [], suggestedMapping: {}, sampleRows: [], totalRows: 0, standardFields: [] };

  // Dynamic form fields
  formFields: FormFieldDef[] = [
    { name: 'date', label: 'Date', type: 'date', required: true, default: new Date().toISOString().slice(0, 10) },
    { name: 'supplier', label: 'Supplier', type: 'text', required: false, placeholder: 'e.g. Acme Corp (optional)', autocomplete: 'supplier' },
    { name: 'item', label: 'Item', type: 'text', required: true, placeholder: 'e.g. Office Paper A4' },
    { name: 'category', label: 'Category', type: 'text', required: false, placeholder: 'e.g. Office Supplies' },
    { name: 'quantity', label: 'Quantity', type: 'number', required: true, default: 1 },
    { name: 'unitCost', label: 'Unit Cost', type: 'number', required: false, default: 0, placeholder: 'or provide Total Cost' },
    { name: 'totalCost', label: 'Total Cost', type: 'number', required: false, default: 0, placeholder: 'or provide Unit Cost' },
    { name: 'notes', label: 'Notes', type: 'text', required: false, placeholder: 'Optional notes...' },
  ];

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
    this.api.getPurchaseKpis().subscribe({ next: (k) => { this.kpis = k; this.loading = false; }, error: () => { this.loading = false; } });
    this.api.getPurchases().subscribe((d) => (this.purchases = d));
    this.loadCharts();
    this.loadAi();
  }

  loadCharts() {
    this.api.getPurchasesOverTime('day').subscribe((data) => {
      this.lineChartData = { labels: data.map((d) => d._id), datasets: [{ data: data.map((d) => d.total), label: 'Spending', borderColor: '#052659', backgroundColor: 'rgba(84,131,179,0.15)', tension: 0.4, fill: true, pointBackgroundColor: '#052659' }] };
    });
    this.api.getPurchasesBySupplier().subscribe((data) => {
      this.barChartData = { labels: data.map((d) => d._id), datasets: [{ data: data.map((d) => d.total), label: 'Total', backgroundColor: data.map((_, i) => this.chartColors[i % this.chartColors.length]), borderRadius: 6 }] };
    });
    this.api.getPurchasesByCategory().subscribe((data) => {
      this.doughnutData = { labels: data.map((d) => d._id || 'Uncategorized'), datasets: [{ data: data.map((d) => d.total), backgroundColor: data.map((_, i) => this.chartColors[i % this.chartColors.length]) }] };
    });
  }

  loadAi() {
    this.aiLoading = true;
    this.api.getStockoutRisks().subscribe({
      next: (risks) => { this.stockoutRisks = risks; this.aiLoading = false; },
      error: () => { this.stockoutRisks = []; this.aiLoading = false; },
    });
  }

  // ── New CSV flow: preview → mapping → confirm ─────────────
  onCsvSelected(file: File) {
    this.uploadMsg = ''; this.uploadError = false; this.uploadErrors = [];
    this.pendingFile = file;
    this.api.previewPurchasesCsv(file).subscribe({
      next: (preview) => {
        this.csvPreview = preview;
        this.showMapping = true;
      },
      error: (err) => {
        this.uploadMsg = err?.error?.message || 'Failed to parse CSV';
        this.uploadError = true;
      },
    });
  }

  onMappingConfirmed(event: any) {
    this.showMapping = false;
    if (!this.pendingFile) return;
    this.api.confirmPurchasesCsv(this.pendingFile, event.mapping).subscribe({
      next: (res: any) => {
        const qualityInfo = res.quality ? ` | Data quality: ${res.quality.qualityPercent}%` : '';
        this.uploadMsg = `✅ Imported ${res.imported} purchases` + (res.skipped ? ` (${res.skipped} skipped)` : '') + qualityInfo;
        this.uploadErrors = [...(res.warnings || []), ...(res.errors || [])];
        this.pendingFile = null;
        this.loadAll();
      },
      error: (err) => {
        this.uploadMsg = err?.error?.message || 'Import failed';
        this.uploadError = true;
        this.pendingFile = null;
      },
    });
  }

  addManual(formData: any) {
    this.manualLoading = true; this.manualMsg = ''; this.manualError = false;
    this.api.createPurchase(formData).subscribe({
      next: () => { this.manualMsg = 'Purchase added'; this.loadAll(); this.manualLoading = false; },
      error: (err) => { this.manualMsg = err?.error?.message || 'Failed'; this.manualError = true; this.manualLoading = false; },
    });
  }

  deletePurchase(id: string) {
    if (!confirm('Delete this purchase?')) return;
    this.api.deletePurchase(id).subscribe(() => this.loadAll());
  }

  // ── Invoice Image Upload Handler ───────────────────────────────────
  onInvoiceImageExtracted(extraction: InvoiceExtraction) {
    if (!extraction || !extraction.rows || extraction.rows.length === 0) {
      this.uploadMsg = 'No data extracted. Please try another image.';
      this.uploadError = true;
      return;
    }

    // Filter valid rows only (ML safety: only complete data)
    const validRows = extraction.rows.filter(r => r.isValid);
    if (validRows.length === 0) {
      this.uploadMsg = 'No valid rows to import. Please fix the issues and try again.';
      this.uploadError = true;
      return;
    }

    // Send valid rows through ETL-validated confirm endpoint
    this.api.confirmPurchasesOcr(validRows).subscribe({
      next: (res: any) => {
        const inv = extraction.quality.invalidRows;
        this.uploadMsg = `Imported ${res.imported} purchases from invoice (quality: ${res.quality?.qualityPercent || extraction.quality.qualityPercent}%)`;
        if (inv > 0) this.uploadMsg += ` | ${inv} row(s) ignored`;
        this.uploadError = false;
        this.uploadErrors = [...(res.warnings || []), ...(res.errors || [])];
        this.loadAll();
      },
      error: (err) => {
        this.uploadMsg = err?.error?.message || 'Import failed';
        this.uploadError = true;
      },
    });
  }
}
