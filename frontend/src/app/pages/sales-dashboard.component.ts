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
import { ThemeService } from '../services/theme.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-sales-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, CsvUploadComponent, CsvMappingComponent, DynamicFormComponent, InvoiceImageUploadComponent, NgChartsModule, TranslateModule],
  template: `
    <div class="page-header">
      <h1>{{ 'SALES.TITLE' | translate }}</h1>
      <p class="page-subtitle">{{ 'SALES.SUBTITLE' | translate }}</p>
    </div>

    <!-- KPI Cards -->
    <div class="kpi-grid" *ngIf="kpis">
      <div class="kpi-card"><span class="kpi-icon">💵</span><div class="kpi-content"><span class="kpi-value">{{ kpis.totalRevenue | number:'1.2-2' }}</span><span class="kpi-label">{{ 'SALES.REVENUE' | translate }}</span></div></div>
      <div class="kpi-card"><span class="kpi-icon">🧾</span><div class="kpi-content"><span class="kpi-value">{{ kpis.count }}</span><span class="kpi-label">{{ 'SALES.ORDERS' | translate }}</span></div></div>
      <div class="kpi-card"><span class="kpi-icon">📊</span><div class="kpi-content"><span class="kpi-value">{{ kpis.avgOrderValue | number:'1.2-2' }}</span><span class="kpi-label">{{ 'SALES.AVG_ORDER' | translate }}</span></div></div>
      <div class="kpi-card"><span class="kpi-icon">👥</span><div class="kpi-content"><span class="kpi-value">{{ kpis.uniqueCustomers }}</span><span class="kpi-label">{{ 'SALES.CUSTOMERS' | translate }}</span></div></div>
      <div class="kpi-card accent"><span class="kpi-icon">🏆</span><div class="kpi-content"><span class="kpi-value">{{ kpis.topProduct }}</span><span class="kpi-label">{{ 'SALES.TOP_PRODUCT' | translate }}</span></div></div>
    </div>

    <!-- AI SECTION: Product Performance Insights -->
    <div class="card ai-section" *ngIf="productPerformance.length > 0">
      <div class="ai-header">
        <div>
          <h2>{{ 'SALES.PERF_TITLE' | translate }}</h2>
          <p class="ai-subtitle">{{ 'SALES.PERF_SUB' | translate }}</p>
        </div>
        <span class="ai-badge">AI</span>
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
            <div class="pm"><span class="pm-v">{{ p.revenue | number:'1.2-2' }}</span><span class="pm-l">{{ 'REPORT.REVENUE' | translate }}</span></div>
            <div class="pm"><span class="pm-v">{{ p.quantity }}</span><span class="pm-l">{{ 'COMMON.QTY' | translate }}</span></div>
            <div class="pm"><span class="pm-v">{{ p.orders }}</span><span class="pm-l">{{ 'SALES.ORDERS' | translate }}</span></div>
            <div class="pm"><span class="pm-v" [class.positive]="p.growth > 0" [class.negative]="p.growth < 0">{{ p.growth > 0 ? '+' : '' }}{{ p.growth }}%</span><span class="pm-l">{{ 'REPORT.REVENUE_GROWTH' | translate }}</span></div>
          </div>
          <p class="perf-explain">{{ p.explanation }}</p>
        </div>
      </div>
    </div>

    <div class="card ai-loading" *ngIf="aiLoading">
      <div class="spinner-sm"></div><p>{{ 'SALES.ANALYZING' | translate }}</p>
    </div>

    <!-- Upload + Manual Entry -->
    <div class="grid grid-2">
      <div class="card">
        <div class="card-icon">📷</div>
        <h2>{{ 'SALES.UPLOAD_TITLE' | translate }}</h2>
        <p class="hint">{{ 'SALES.UPLOAD_SUB' | translate }}</p>
        <app-invoice-image-upload [type]="'sales'" (dataExtracted)="onInvoiceImageExtracted($event)"></app-invoice-image-upload>
      </div>
      <div class="card">
        <div class="card-icon">CSV</div>
        <h2>{{ 'SALES.CSV_TITLE' | translate }}</h2>
        <p class="hint">{{ 'SALES.CSV_SUB' | translate }}</p>
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
        <h2>{{ 'SALES.MANUAL_TITLE' | translate }}</h2>
        <app-dynamic-form
          [fields]="formFields"
          [loading]="manualLoading"
          [submitLabel]="'SALES.ADD_SALE' | translate"
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
      [requiredFields]="['date', 'product', 'quantity']"
      [eitherOrFields]="['totalAmount', 'unitPrice']"
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
      <div class="card"><h3>{{ 'SALES.REVENUE_TIME' | translate }}</h3><div class="chart-wrapper"><canvas baseChart [data]="lineChartData" type="line" [options]="lineChartOptions"></canvas></div></div>
      <div class="card"><h3>{{ 'SALES.REVENUE_PRODUCT' | translate }}</h3><div class="chart-wrapper"><canvas baseChart [data]="barChartData" type="bar" [options]="barChartOptions"></canvas></div></div>
    </div>
    <div class="grid grid-2" *ngIf="kpis && kpis.count > 0">
      <div class="card"><h3>{{ 'SALES.REVENUE_CUSTOMER' | translate }}</h3><div class="chart-wrapper doughnut-wrapper"><canvas baseChart [data]="doughnutData" type="doughnut" [options]="doughnutOptions"></canvas></div></div>
      <div class="card" *ngIf="sales.length > 0">
        <h3>{{ 'SALES.RECENT' | translate }}</h3>
        <div class="table-scroll">
          <table class="table">
            <thead><tr><th>{{ 'COMMON.DATE' | translate }}</th><th>{{ 'ACCOUNTANT.TABLE_EMPLOYEE' | translate }}</th><th>{{ 'COMMON.ITEM' | translate }}</th><th>{{ 'PURCHASES.ALERTS' | translate }}</th><th>{{ 'COMMON.QTY' | translate }}</th><th>{{ 'COMMON.UNIT_PRICE' | translate }}</th><th>{{ 'COMMON.TOTAL' | translate }}</th><th></th></tr></thead>
            <tbody>
              <tr *ngFor="let row of sales">
                <td>{{ row.date | date:'yyyy-MM-dd' }}</td><td>{{ row.customer }}</td><td>{{ row.product }}</td>
                <td><span class="type-badge" *ngIf="row.category">{{ row.category }}</span></td>
                <td>{{ row.quantity }}</td><td>{{ row.unitPrice | number:'1.2-2' }}</td>
                <td><strong>{{ row.totalAmount | number:'1.2-2' }}</strong></td>
                <td><button class="btn-del" (click)="deleteSale(row._id)">X</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="card empty-state" *ngIf="!loading && kpis && kpis.count === 0"><div class="empty-icon">--</div><h3>{{ 'SALES.EMPTY_TITLE' | translate }}</h3><p>{{ 'SALES.EMPTY_SUB' | translate }}</p></div>
    <div class="card loading-state" *ngIf="loading"><div class="spinner"></div><p>{{ 'SALES.LOADING' | translate }}</p></div>
  `,
  styles: [`
    .page-header { margin-bottom: 24px; }
    .page-header h1 { font-size: 26px; font-weight: 800; color: var(--c-darkest, #021024); margin: 0 0 6px; }
    .page-subtitle { color: var(--c-mid, #5483B3); font-size: 14px; margin: 0; }
    .hint { color: var(--c-light, #7DA0CA); font-size: 12px; margin: 0 0 8px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .kpi-card { display: flex; align-items: center; gap: 14px; background: var(--bg-primary, white); border-radius: 14px; padding: 18px 20px; box-shadow: 0 2px 12px rgba(2,16,36,0.08); border: 1px solid rgba(84,131,179,0.1); transition: transform 0.2s, box-shadow 0.2s; }
    .kpi-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(2,16,36,0.12); }
    .kpi-card.accent { background: linear-gradient(135deg, var(--c-dark, #052659), var(--c-mid, #5483B3)); }
    .kpi-card.accent .kpi-value, .kpi-card.accent .kpi-label { color: white; }
    .kpi-icon { font-size: 28px; } .kpi-content { display: flex; flex-direction: column; }
    .kpi-value { font-size: 20px; font-weight: 800; color: var(--c-darkest, #021024); }
    .kpi-label { font-size: 11px; color: var(--c-mid, #5483B3); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
    .card-icon { font-size: 28px; margin-bottom: 4px; font-weight: 800; color: var(--c-dark, #052659); }
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
    .empty-state h3 { color: var(--c-dark, #052659); margin-bottom: 8px; } .empty-state p { color: var(--c-mid, #5483B3); font-size: 14px; }
    .loading-state { text-align: center; padding: 40px; }
    .spinner { width: 36px; height: 36px; margin: 0 auto 12px; border: 3px solid var(--c-lightest, #C1E8FF); border-top: 3px solid var(--c-dark, #052659); border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .ai-section { border: 1.5px solid rgba(84,131,179,0.2); background: linear-gradient(135deg, #f8fbff 0%, #f0f6ff 100%); }
    .ai-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
    .ai-header h2 { margin: 0 0 4px; font-size: 18px; color: var(--c-darkest, #021024); border: none !important; padding: 0 !important; }
    .ai-subtitle { color: var(--c-mid, #5483B3); font-size: 13px; margin: 0; }
    .ai-badge { background: linear-gradient(135deg, var(--c-dark, #052659), var(--c-mid, #5483B3)); color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; white-space: nowrap; }
    .perf-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
    .perf-card { background: var(--bg-primary, white); border-radius: 12px; padding: 16px; border: 1px solid var(--border-color, #e2e8f0); transition: all 0.2s; }
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
    .pm-v { font-size: 14px; font-weight: 800; color: var(--c-dark, #052659); }
    .pm-l { font-size: 10px; color: var(--c-light, #7DA0CA); text-transform: uppercase; font-weight: 600; }
    .positive { color: #059669 !important; }
    .negative { color: #ef4444 !important; }
    .perf-explain { font-size: 12px; color: var(--c-mid, #5483B3); margin: 0; line-height: 1.4; }
    .ai-loading { display: flex; align-items: center; gap: 12px; padding: 16px 20px; }
    .spinner-sm { width: 20px; height: 20px; border: 2px solid var(--c-lightest, #C1E8FF); border-top: 2px solid var(--c-dark, #052659); border-radius: 50%; animation: spin 0.8s linear infinite; }
    .ai-loading p { margin: 0; color: var(--c-mid, #5483B3); font-size: 13px; }
  `],
})
export class SalesDashboardComponent implements OnInit {
  loading = true; aiLoading = false;
  kpis: any = null; sales: any[] = [];
  productPerformance: any[] = [];
  uploadMsg = ''; uploadError = false; uploadErrors: string[] = [];
  manualMsg = ''; manualError = false; manualLoading = false;

  // CSV mapping state
  showMapping = false;
  pendingFile: File | null = null;
  csvPreview: any = { headers: [], suggestedMapping: {}, sampleRows: [], totalRows: 0, standardFields: [] };

  // Dynamic form fields
  formFields: FormFieldDef[] = [
    { name: 'date', label: 'COMMON.DATE', type: 'date', required: true, default: new Date().toISOString().slice(0, 10) },
    { name: 'customer', label: 'PARTNERS.CUSTOMER', type: 'text', required: false, placeholder: 'SALES.CUSTOMER_PLACEHOLDER', autocomplete: 'customer' },
    { name: 'product', label: 'COMMON.PRODUCT', type: 'text', required: true, placeholder: 'SALES.PRODUCT_PLACEHOLDER' },
    { name: 'category', label: 'COMMON.CATEGORY', type: 'text', required: false, placeholder: 'SALES.CATEGORY_PLACEHOLDER' },
    { name: 'quantity', label: 'COMMON.QTY', type: 'number', required: true, default: 1 },
    { name: 'unitPrice', label: 'COMMON.UNIT_PRICE', type: 'number', required: false, default: 0, placeholder: 'SALES.UNIT_PRICE_PLACEHOLDER' },
    { name: 'totalAmount', label: 'COMMON.TOTAL', type: 'number', required: false, default: 0, placeholder: 'SALES.TOTAL_PLACEHOLDER' },
    { name: 'notes', label: 'COMMON.NOTES', type: 'text', required: false, placeholder: 'COMMON.NOTES_PLACEHOLDER' },
  ];

  lineChartData: ChartData<'line'> = { labels: [], datasets: [] };
  lineChartOptions: ChartOptions<'line'> = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } };
  barChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  barChartOptions: ChartOptions<'bar'> = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } };
  doughnutData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  doughnutOptions: ChartOptions<'doughnut'> = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } };
  private chartColors: string[] = [];

  constructor(
    private api: ApiService, 
    private translate: TranslateService,
    private themeService: ThemeService
  ) { }

  ngOnInit() { 
    this.loadAll(); 
    // Listen for theme/color changes to update charts
    this.themeService.colorTheme$.subscribe(() => this.updateChartColors());
    this.themeService.isDarkMode$.subscribe(() => this.updateChartColors());
  }

  private updateChartColors() {
    const style = getComputedStyle(document.documentElement);
    const cDark = style.getPropertyValue('--c-dark').trim() || '#052659';
    const cMid = style.getPropertyValue('--c-mid').trim() || '#5483B3';
    const cLight = style.getPropertyValue('--c-light').trim() || '#7DA0CA';
    const cLightest = style.getPropertyValue('--c-lightest').trim() || '#C1E8FF';
    
    this.chartColors = [cDark, cMid, cLight, cLightest, '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
    
    if (this.kpis) {
      this.loadCharts();
    }
  }

  loadAll() {
    this.loading = true;
    this.api.getSaleKpis().subscribe({ next: (k) => { this.kpis = k; this.loading = false; }, error: () => { this.loading = false; } });
    this.api.getSales().subscribe((d) => (this.sales = d));
    this.loadCharts();
    this.loadAi();
  }

  loadCharts() {
    const style = getComputedStyle(document.documentElement);
    const cDark = style.getPropertyValue('--c-dark').trim() || '#052659';
    const cMid = style.getPropertyValue('--c-mid').trim() || '#5483B3';

    this.api.getRevenueOverTime('day').subscribe((data) => {
      this.lineChartData = { 
        labels: data.map((d) => d._id), 
        datasets: [{ 
          data: data.map((d) => d.revenue), 
          label: this.translate.instant('REPORT.REVENUE'), 
          borderColor: cDark, 
          backgroundColor: cMid + '40', // Adding transparency
          tension: 0.4, 
          fill: true, 
          pointBackgroundColor: cDark 
        }] 
      };
    });
    this.api.getRevenueByProduct().subscribe((data) => {
      this.barChartData = { labels: data.map((d) => d._id), datasets: [{ data: data.map((d) => d.revenue), label: this.translate.instant('REPORT.REVENUE'), backgroundColor: data.map((_, i) => this.chartColors[i % this.chartColors.length]), borderRadius: 6 }] };
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

  // ── New CSV flow: preview → mapping → confirm ─────────────
  onCsvSelected(file: File) {
    this.uploadMsg = ''; this.uploadError = false; this.uploadErrors = [];
    this.pendingFile = file;
    this.api.previewSalesCsv(file).subscribe({
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
    this.api.confirmSalesCsv(this.pendingFile, event.mapping).subscribe({
      next: (res: any) => {
        const qualityInfo = res.quality ? ` | Data quality: ${res.quality.qualityPercent}%` : '';
        this.uploadMsg = `✅ Imported ${res.imported} sales` + (res.skipped ? ` (${res.skipped} skipped)` : '') + qualityInfo;
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
    this.api.createSale(formData).subscribe({
      next: () => { this.manualMsg = 'Sale added'; this.loadAll(); this.manualLoading = false; },
      error: (err) => { this.manualMsg = err?.error?.message || 'Failed'; this.manualError = true; this.manualLoading = false; },
    });
  }

  deleteSale(id: string) {
    if (!confirm('Delete this sale?')) return;
    this.api.deleteSale(id).subscribe(() => this.loadAll());
  }

  // ── Invoice Image Upload Handler ─────────────────────────────────
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
    this.api.confirmSalesOcr(validRows).subscribe({
      next: (res: any) => {
        const inv = extraction.quality.invalidRows;
        this.uploadMsg = `Imported ${res.imported} sales from invoice (quality: ${res.quality?.qualityPercent || extraction.quality.qualityPercent}%)`;
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
