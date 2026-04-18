import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgChartsModule } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';
import { CsvUploadComponent } from '../components/csv-upload.component';
import { CsvMappingComponent, MappingConfirmed } from '../components/csv-mapping.component';
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
      <h1>{{ 'PURCHASES.TITLE' | translate }}</h1>
      <p class="page-subtitle">{{ 'PURCHASES.SUBTITLE' | translate }}</p>
    </div>

    <!-- KPI Cards -->
    <div class="kpi-grid" *ngIf="kpis">
      <div class="kpi-card">
        <span class="kpi-icon">💰</span>
        <div class="kpi-content">
          <span class="kpi-value">{{ kpis.totalPurchases | number:'1.2-2' }}</span>
          <span class="kpi-label">{{ 'PURCHASES.TOTAL' | translate }}</span>
        </div>
      </div>
      <div class="kpi-card">
        <span class="kpi-icon">📋</span>
        <div class="kpi-content">
          <span class="kpi-value">{{ kpis.count }}</span>
          <span class="kpi-label">{{ 'PURCHASES.ORDERS' | translate }}</span>
        </div>
      </div>
      <div class="kpi-card">
        <span class="kpi-icon">📊</span>
        <div class="kpi-content">
          <span class="kpi-value">{{ kpis.avgPurchaseValue | number:'1.2-2' }}</span>
          <span class="kpi-label">{{ 'PURCHASES.AVG_PURCHASE' | translate }}</span>
        </div>
      </div>
      <div class="kpi-card">
        <span class="kpi-icon">🏭</span>
        <div class="kpi-content">
          <span class="kpi-value">{{ kpis.uniqueSuppliers }}</span>
          <span class="kpi-label">{{ 'PURCHASES.SUPPLIERS' | translate }}</span>
        </div>
      </div>
      <div class="kpi-card accent">
        <span class="kpi-icon">⭐</span>
        <div class="kpi-content">
          <span class="kpi-value">{{ kpis.topSupplier }}</span>
          <span class="kpi-label">{{ 'PURCHASES.TOP_SUPPLIER' | translate }}</span>
        </div>
      </div>
    </div>

    <!-- AI SECTION: Inventory Alerts -->
    <div class="card ai-section" *ngIf="stockoutRisks.length > 0">
      <div class="ai-header">
        <div>
          <h2>{{ 'PURCHASES.ALERTS_TITLE' | translate }}</h2>
          <p class="ai-subtitle">{{ 'PURCHASES.ALERTS_SUB' | translate }}</p>
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
              {{ 'PURCHASES.RISK_' + item.risk.toUpperCase() | translate }}
            </span>
          </div>
          <div class="alert-metrics">
            <div class="metric"><span class="metric-val">{{ item.estimatedStock }}</span><span class="metric-lbl">{{ 'PURCHASES.EST_STOCK' | translate }}</span></div>
            <div class="metric"><span class="metric-val">{{ item.dailySalesVelocity }}/day</span><span class="metric-lbl">{{ 'PURCHASES.SALES_RATE' | translate }}</span></div>
            <div class="metric">
              <span class="metric-val" [class.danger-text]="item.daysUntilStockout < 7">
                {{ item.daysUntilStockout < 999 ? (item.daysUntilStockout | number:'1.0-0') : 'inf' }} {{ 'SETTINGS.DAYS' | translate }}
              </span>
              <span class="metric-lbl">{{ 'PURCHASES.UNTIL_STOCKOUT' | translate }}</span>
            </div>
          </div>
          <div class="reorder-box" *ngIf="item.reorderQty > 0">
            <div class="reorder-header">
              <span class="reorder-icon" *ngIf="item.urgency === 'Urgent'">!!</span>
              <span class="reorder-icon" *ngIf="item.urgency === 'Soon'">!</span>
              <strong>{{ 'PURCHASES.REORDER_UNITS' | translate:{count: item.reorderQty} }}</strong>
              <span class="urgency" [class.urgent]="item.urgency === 'Urgent'">{{ item.urgency }}</span>
            </div>
            <p class="reorder-reason">{{ item.explanation }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="card ai-empty" *ngIf="stockoutRisks.length === 0 && kpis && kpis.count > 0 && !aiLoading">
      <span class="ai-empty-icon">OK</span>
      <p>{{ 'PURCHASES.NO_RISKS' | translate }}</p>
    </div>

    <div class="card ai-loading" *ngIf="aiLoading">
      <div class="spinner-sm"></div>
      <p>{{ 'PURCHASES.ANALYZING' | translate }}</p>
    </div>

    <!-- Upload + Manual Entry Row -->
    <div class="grid grid-2">
      <div class="card">
        <div class="card-icon">📷</div>
        <h2>{{ 'PURCHASES.UPLOAD_TITLE' | translate }}</h2>
        <p class="hint">{{ 'PURCHASES.UPLOAD_SUB' | translate }}</p>
        <app-invoice-image-upload [type]="'purchases'" (dataExtracted)="onInvoiceImageExtracted($event)"></app-invoice-image-upload>
        
        <div class="local-request-toggle" style="margin-top: 15px; padding: 10px; background: #f0f6ff; border-radius: 8px; border: 1px dashed #5483B3; display: flex; align-items: center; gap: 8px;">
          <input type="checkbox" id="ocrIsRequest" [(ngModel)]="ocrAsRequest" style="width: 18px; height: 18px; cursor: pointer;" />
          <label for="ocrIsRequest" style="font-size: 13px; font-weight: 700; color: #052659; cursor: pointer;">{{ 'PURCHASES.SEND_TO_ACCOUNTANT' | translate }}</label>
        </div>

        <div *ngIf="uploadMsg && !showMapping" class="status-msg" [class.error]="uploadError" style="margin-top: 10px;">{{ uploadMsg }}</div>
      </div>
      <div class="card">
        <div class="card-icon">CSV</div>
        <h2>{{ 'PURCHASES.CSV_TITLE' | translate }}</h2>
        <p class="hint">{{ 'PURCHASES.CSV_SUB' | translate }}</p>
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
        <h2>{{ 'PURCHASES.MANUAL_TITLE' | translate }}</h2>
        <app-dynamic-form
          [fields]="formFields"
          [loading]="manualLoading"
          [submitLabel]="'PURCHASES.ADD_PURCHASE' | translate"
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
    .kpi-icon { font-size: 28px; } .kpi-content { display: flex; flex-direction: column; }
    .kpi-value { font-size: 20px; font-weight: 800; color: #021024; }
    .kpi-label { font-size: 11px; color: #5483B3; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
    .card-icon { font-size: 28px; margin-bottom: 4px; font-weight: 800; color: #052659; }
    .status-msg { margin-top: 10px; padding: 10px 14px; background: #e9f7ef; color: #1e8449; border-radius: 8px; font-size: 13px; font-weight: 500; border: 1px solid #a9dfbf; }
    .status-msg.error { background: #fce7e7; color: #c0392b; border-color: #f5b7b1; }
    .validation-errors { margin-top: 8px; } .val-err { font-size: 12px; color: #b7770d; margin: 4px 0; }
    .alert-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; margin-top: 12px; }
    .alert-card { background: white; border-radius: 14px; padding: 20px; border: 1px solid #e2e8f0; border-left: 5px solid #CBD5E1; transition: transform 0.2s; }
    .alert-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
    .alert-card.risk-high { border-left-color: #ef4444; }
    .alert-card.risk-medium { border-left-color: #f59e0b; }
    .alert-card.risk-low { border-left-color: #10b981; }
    .alert-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .product-name { font-weight: 800; font-size: 16px; color: #021024; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .risk-badge { padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .risk-badge.high { background: #fef2f2; color: #ef4444; }
    .risk-badge.medium { background: #fffbeb; color: #f59e0b; }
    .risk-badge.low { background: #f0fdf4; color: #10b981; }
    .alert-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
    .metric { display: flex; flex-direction: column; }
    .metric-val { font-size: 14px; font-weight: 800; color: #052659; }
    .metric-lbl { font-size: 10px; color: #5483B3; text-transform: uppercase; font-weight: 600; margin-top: 2px; }
    .danger-text { color: #ef4444 !important; }
    .reorder-box { background: #f8fafc; border-radius: 10px; padding: 12px; border: 1px solid #e2e8f0; }
    .reorder-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; font-size: 13px; }
    .reorder-icon { color: #ef4444; font-weight: 900; }
    .urgency { font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; background: #e2e8f0; color: #64748b; }
    .urgency.urgent { background: #fef2f2; color: #ef4444; }
    .reorder-reason { font-size: 12px; color: #5483B3; margin: 0; line-height: 1.4; }
    .ai-section { border: 1.5px solid rgba(84,131,179,0.2); background: linear-gradient(135deg, #f8fbff 0%, #f0f6ff 100%); }
    .ai-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
    .ai-header h2 { margin: 0 0 4px; font-size: 18px; color: #021024; border: none !important; padding: 0 !important; }
    .ai-subtitle { color: #5483B3; font-size: 13px; margin: 0; }
    .ai-badge { background: linear-gradient(135deg, #052659, #5483B3); color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; }
    .ai-empty, .ai-loading { text-align: center; padding: 30px; }
    .ai-empty-icon { font-size: 32px; background: #10b981; color: white; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; border-radius: 50%; margin: 0 auto 12px; font-weight: 800; }
    .spinner-sm { width: 30px; height: 30px; margin: 0 auto 10px; border: 3px solid #C1E8FF; border-top: 3px solid #052659; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class PurchasesDashboardComponent implements OnInit {
  loading = true; aiLoading = false;
  kpis: any = null; purchases: any[] = [];
  stockoutRisks: any[] = [];
  uploadMsg = ''; uploadError = false; uploadErrors: string[] = [];
  manualMsg = ''; manualError = false; manualLoading = false;

  // New toggle for OCR
  ocrAsRequest = false;

  // CSV mapping state
  showMapping = false;
  pendingFile: File | null = null;
  csvPreview: any = { headers: [], suggestedMapping: {}, sampleRows: [], totalRows: 0, standardFields: [] };

  // Dynamic form fields
  formFields: FormFieldDef[] = [
    { name: 'date', label: 'COMMON.DATE', type: 'date', required: true, default: new Date().toISOString().slice(0, 10) },
    { name: 'supplier', label: 'PARTNERS.SUPPLIER', type: 'text', required: true, placeholder: 'PURCHASES.SUPPLIER_PLACEHOLDER', autocomplete: 'supplier' },
    { name: 'item', label: 'COMMON.ITEM', type: 'text', required: true, placeholder: 'PURCHASES.ITEM_PLACEHOLDER' },
    { name: 'category', label: 'COMMON.CATEGORY', type: 'text', required: false, placeholder: 'PURCHASES.CATEGORY_PLACEHOLDER' },
    { name: 'quantity', label: 'COMMON.QTY', type: 'number', required: true, default: 1 },
    { name: 'unitPrice', label: 'COMMON.UNIT_PRICE', type: 'number', required: false, default: 0, placeholder: 'PURCHASES.UNIT_PRICE_PLACEHOLDER' },
    { name: 'totalCost', label: 'COMMON.TOTAL', type: 'number', required: false, default: 0, placeholder: 'PURCHASES.TOTAL_PLACEHOLDER' },
    { name: 'isRequest', label: 'PURCHASES.SEND_TO_ACCOUNTANT', type: 'checkbox', required: false, default: false },
  ];

  constructor(private api: ApiService, private translate: TranslateService) { }

  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.loading = true;
    this.api.getPurchaseKpis().subscribe({ next: (k) => { this.kpis = k; this.loading = false; }, error: () => { this.loading = false; } });
    this.api.getPurchases().subscribe((d) => (this.purchases = d));
    this.loadAi();
  }

  loadAi() {
    this.aiLoading = true;
    this.api.getStockoutRisks().subscribe({
      next: (r) => { this.stockoutRisks = r; this.aiLoading = false; },
      error: () => { this.stockoutRisks = []; this.aiLoading = false; },
    });
  }

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

  onMappingConfirmed(event: MappingConfirmed) {
    this.showMapping = false;
    if (!this.pendingFile) return;
    this.api.confirmPurchasesCsv(this.pendingFile, event.mapping, event.isRequest).subscribe({
      next: (res: any) => {
        const typeLabel = event.isRequest ? 'purchase requests' : 'purchases';
        this.uploadMsg = `✅ Imported ${res.imported} ${typeLabel}`;
        if (res.skipped) this.uploadMsg += ` (${res.skipped} skipped)`;
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

  onInvoiceImageExtracted(extraction: InvoiceExtraction) {
    if (!extraction || !extraction.rows || extraction.rows.length === 0) {
      this.uploadMsg = 'No data extracted. Please try another image.';
      this.uploadError = true;
      return;
    }

    const validRows = extraction.rows.filter(r => r.isValid);
    if (validRows.length === 0) {
      this.uploadMsg = 'No valid rows to import.';
      this.uploadError = true;
      return;
    }

    this.api.confirmPurchasesOcr(validRows, this.ocrAsRequest).subscribe({
      next: (res: any) => {
        const typeLabel = this.ocrAsRequest ? 'requests' : 'purchases';
        this.uploadMsg = `Imported ${res.imported} ${typeLabel} from invoice`;
        this.uploadError = false;
        this.loadAll();
      },
      error: (err) => {
        this.uploadMsg = err?.error?.message || 'Import failed';
        this.uploadError = true;
      },
    });
  }
}
