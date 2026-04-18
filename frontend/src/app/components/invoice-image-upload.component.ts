import { Component, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

export interface InvoiceExtraction {
  rawText: string;
  rows: any[];
  quality: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    qualityPercent: number;
    status: 'good' | 'warning' | 'poor';
    message: string;
  };
  recommendation: {
    canProceed: boolean;
    needsReview: boolean;
    hint: string;
  };
}

@Component({
  selector: 'app-invoice-image-upload',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <!-- Upload Area -->
    <div class="upload-area" *ngIf="!extractedData"
         (dragover)="onDragOver($event)" (dragleave)="onDragLeave($event)" (drop)="onDrop($event)"
         [class.drag-over]="isDragOver">
      <input #fileInput type="file" accept="image/jpeg,image/png" (change)="onFileSelected($event)" style="display:none" />
      <button class="btn-upload" (click)="fileInput.click()" [disabled]="uploading">
        {{ uploading ? ('COMMON.PROCESSING' | translate) : ('INVOICE.UPLOAD_IMAGE' | translate) }}
      </button>
      <p class="upload-hint">{{ 'INVOICE.UPLOAD_HINT' | translate }}</p>
      <div *ngIf="uploadError" class="error-msg">{{ uploadError }}</div>
    </div>

    <!-- Preview & Edit -->
    <div class="preview-section" *ngIf="extractedData">
      <!-- Quality Alert -->
      <div class="quality-alert" [class]="extractedData.quality.status">
        <span class="q-badge" *ngIf="extractedData.quality.status === 'good'">{{ 'COMMON.GOOD' | translate | uppercase }}</span>
        <span class="q-badge" *ngIf="extractedData.quality.status === 'warning'">{{ 'COMMON.WARNING' | translate | uppercase }}</span>
        <span class="q-badge" *ngIf="extractedData.quality.status === 'poor'">{{ 'COMMON.POOR' | translate | uppercase }}</span>
        <div>
          <p class="q-msg">{{ extractedData.quality.message }}</p>
          <p class="q-hint">{{ extractedData.recommendation.hint }}</p>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-row">
        <div class="stat"><span class="stat-label">{{ 'INVOICE.TOTAL_ROWS' | translate }}</span><span class="stat-value">{{ extractedData.quality.totalRows }}</span></div>
        <div class="stat"><span class="stat-label">{{ 'INVOICE.VALID' | translate }}</span><span class="stat-value valid">{{ extractedData.quality.validRows }}</span></div>
        <div class="stat"><span class="stat-label">{{ 'INVOICE.NEEDS_REVIEW' | translate }}</span><span class="stat-value invalid">{{ extractedData.quality.invalidRows }}</span></div>
        <div class="stat"><span class="stat-label">{{ 'CSV.QUALITY' | translate }}</span><span class="stat-value">{{ extractedData.quality.qualityPercent }}%</span></div>
      </div>

      <!-- User Note -->
      <div class="user-note">
        {{ 'INVOICE.USER_NOTE' | translate:{ count: extractedData.quality.totalRows } }}
      </div>

      <!-- Editable Table -->
      <div class="table-container">
        <table class="invoice-table">
          <thead>
            <tr>
              <th>{{ (type === 'sales' ? 'INVOICE.PRODUCT' : 'INVOICE.ITEM') | translate }}</th>
              <th>{{ 'COMMON.QTY' | translate }}</th>
              <th>{{ (type === 'sales' ? 'INVOICE.UNIT_PRICE' : 'INVOICE.UNIT_COST') | translate }}</th>
              <th>{{ (type === 'sales' ? 'INVOICE.TOTAL_AMOUNT' : 'INVOICE.TOTAL_COST') | translate }}</th>
              <th>{{ 'COMMON.DATE' | translate }}</th>
              <th *ngIf="type === 'sales'">{{ 'PARTNERS.CUSTOMER' | translate }}</th>
              <th *ngIf="type === 'purchases'">{{ 'PARTNERS.SUPPLIER' | translate }}</th>
              <th>{{ 'COMMON.STATUS' | translate }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of extractedData.rows; let i = index" [class.invalid-row]="!row.isValid">
              <td>
                <input *ngIf="type === 'sales'" [(ngModel)]="row.product" (ngModelChange)="onRowEdited(i)" class="cell-input" [placeholder]="'INVOICE.PRODUCT_NAME' | translate" />
                <input *ngIf="type === 'purchases'" [(ngModel)]="row.item" (ngModelChange)="onRowEdited(i)" class="cell-input" [placeholder]="'INVOICE.ITEM_NAME' | translate" />
              </td>
              <td><input [(ngModel)]="row.quantity" type="number" step="1" min="0" (ngModelChange)="onRowEdited(i)" class="cell-input num" /></td>
              <td>
                <input *ngIf="type === 'sales'" [(ngModel)]="row.unitPrice" type="number" step="0.01" min="0" (ngModelChange)="onRowEdited(i)" class="cell-input num" />
                <input *ngIf="type === 'purchases'" [(ngModel)]="row.unitCost" type="number" step="0.01" min="0" (ngModelChange)="onRowEdited(i)" class="cell-input num" />
              </td>
              <td>
                <input *ngIf="type === 'sales'" [(ngModel)]="row.totalAmount" type="number" step="0.01" min="0" (ngModelChange)="onRowEdited(i)" class="cell-input num" />
                <input *ngIf="type === 'purchases'" [(ngModel)]="row.totalCost" type="number" step="0.01" min="0" (ngModelChange)="onRowEdited(i)" class="cell-input num" />
              </td>
              <td><input [(ngModel)]="row.date" type="date" (ngModelChange)="onRowEdited(i)" class="cell-input" /></td>
              <td *ngIf="type === 'sales'"><input [(ngModel)]="row.customer" class="cell-input" [placeholder]="'COMMON.OPTIONAL' | translate" /></td>
              <td *ngIf="type === 'purchases'"><input [(ngModel)]="row.supplier" class="cell-input" [placeholder]="'COMMON.OPTIONAL' | translate" /></td>
              <td>
                <span class="status-icon" [class.ok]="row.isValid" [class.warn]="!row.isValid"
                      [title]="row.issues?.join(', ') || ('COMMON.VALID' | translate)">
                  {{ row.isValid ? 'OK' : '!!' }}
                </span>
              </td>
              <td><button class="btn-del-row" (click)="deleteRow(i)" [title]="'COMMON.REMOVE' | translate">X</button></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Add Row -->
      <button class="btn-add-row" (click)="addEmptyRow()">+ {{ 'COMMON.ADD_ROW' | translate }}</button>

      <!-- Issues Summary -->
      <div *ngIf="extractedData.quality.invalidRows > 0" class="issues-summary">
        <strong>{{ 'COMMON.ISSUES' | translate }}:</strong>
        <span *ngFor="let row of extractedData.rows; let i = index">
          <span *ngIf="!row.isValid" class="issue-item">
            {{ 'COMMON.ROW' | translate }} {{ i + 1 }}: {{ row.issues?.join(', ') }}
          </span>
        </span>
      </div>

      <!-- Actions -->
      <div class="action-buttons">
        <button class="btn-secondary" (click)="resetUpload()" [disabled]="saving">{{ 'SETTINGS.CANCEL' | translate }}</button>
        <button class="btn-primary" (click)="onDataConfirm()" [disabled]="saving || extractedData.quality.validRows === 0">
          {{ saving ? ('SETTINGS.SAVING' | translate) : ('INVOICE.CONFIRM_SAVE' | translate:{ count: extractedData.quality.validRows }) }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .upload-area { text-align: center; padding: 32px; border: 2px dashed var(--border-color, #ddd); border-radius: 8px; background: var(--bg-secondary, #f9f9f9); transition: all 0.2s; }
    .upload-area:hover, .upload-area.drag-over { border-color: #5483B3; background: var(--bg-hover, #f0f7ff); }
    .btn-upload { padding: 10px 20px; font-size: 14px; background: #5483B3; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; transition: all 0.2s; }
    .btn-upload:hover:not(:disabled) { background: #052659; }
    .btn-upload:disabled { opacity: 0.6; cursor: not-allowed; }
    .upload-hint { font-size: 12px; color: var(--text-muted, #888); margin-top: 8px; }
    .error-msg { color: #d32f2f; margin-top: 10px; padding: 8px; background: #ffebee; border-radius: 4px; font-size: 13px; }
    .preview-section { margin-top: 16px; }

    .quality-alert { display: flex; gap: 10px; padding: 10px 14px; border-radius: 6px; margin-bottom: 14px; align-items: flex-start; }
    .quality-alert.good { background: #e8f5e9; border-left: 4px solid #4caf50; }
    .quality-alert.warning { background: #fff3e0; border-left: 4px solid #ff9800; }
    .quality-alert.poor { background: #ffebee; border-left: 4px solid #d32f2f; }
    .q-badge { font-weight: 700; font-size: 11px; padding: 3px 8px; border-radius: 4px; white-space: nowrap; color: white; }
    .quality-alert.good .q-badge { background: #4caf50; }
    .quality-alert.warning .q-badge { background: #ff9800; }
    .quality-alert.poor .q-badge { background: #d32f2f; }
    .q-msg { margin: 0 0 2px; font-weight: 600; font-size: 13px; color: var(--text-primary, #333); }
    .q-hint { margin: 0; font-size: 12px; color: var(--text-muted, #666); }

    .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
    .stat { background: var(--bg-secondary, #f5f5f5); padding: 10px; border-radius: 6px; text-align: center; }
    .stat-label { display: block; font-size: 11px; color: var(--text-muted, #999); margin-bottom: 2px; }
    .stat-value { display: block; font-size: 16px; font-weight: 700; color: var(--text-primary, #333); }
    .stat-value.valid { color: #4caf50; }
    .stat-value.invalid { color: #d32f2f; }

    .user-note { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 8px 12px; border-radius: 4px; margin-bottom: 14px; font-size: 13px; color: #1565c0; }

    .table-container { overflow-x: auto; border: 1px solid var(--border-color, #ddd); border-radius: 6px; margin-bottom: 10px; }
    .invoice-table { width: 100%; border-collapse: collapse; background: var(--bg-primary, white); }
    .invoice-table thead { background: var(--bg-secondary, #f5f5f5); }
    .invoice-table th { padding: 8px 10px; text-align: left; font-weight: 600; font-size: 11px; color: var(--text-muted, #666); border-bottom: 1px solid var(--border-color, #ddd); white-space: nowrap; }
    .invoice-table td { padding: 6px 8px; border-bottom: 1px solid var(--border-color, #eee); }
    .invoice-table tr.invalid-row { background: #fff8e1; }
    .cell-input { width: 100%; padding: 5px 6px; border: 1px solid var(--border-color, #ddd); border-radius: 3px; font-size: 12px; background: var(--bg-primary, white); color: var(--text-primary, #333); }
    .cell-input.num { width: 80px; text-align: right; }
    .cell-input:focus { outline: none; border-color: #5483B3; box-shadow: 0 0 0 2px rgba(84,131,179,0.15); }

    .status-icon { font-weight: 700; font-size: 11px; padding: 2px 6px; border-radius: 3px; }
    .status-icon.ok { background: #e8f5e9; color: #2e7d32; }
    .status-icon.warn { background: #fff3e0; color: #e65100; }

    .btn-del-row { background: none; border: none; cursor: pointer; font-size: 14px; padding: 2px 6px; color: #c0392b; font-weight: 700; border-radius: 4px; }
    .btn-del-row:hover { background: #ffebee; }

    .btn-add-row { background: none; border: 1px dashed var(--border-color, #ccc); color: var(--text-muted, #666); padding: 6px 14px; border-radius: 4px; cursor: pointer; font-size: 12px; margin-bottom: 14px; transition: all 0.2s; }
    .btn-add-row:hover { border-color: #5483B3; color: #5483B3; }

    .issues-summary { background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 10px 14px; margin-bottom: 14px; font-size: 12px; color: #856404; }
    .issue-item { display: inline-block; margin: 2px 8px 2px 0; }

    .action-buttons { display: flex; gap: 10px; justify-content: flex-end; }
    .btn-primary, .btn-secondary { padding: 8px 18px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; transition: all 0.2s; }
    .btn-primary { background: #4caf50; color: white; }
    .btn-primary:hover:not(:disabled) { background: #388e3c; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary { background: var(--bg-secondary, #e0e0e0); color: var(--text-primary, #333); }
    .btn-secondary:hover:not(:disabled) { opacity: 0.8; }
  `]
})
export class InvoiceImageUploadComponent {
  @Output() dataExtracted = new EventEmitter<InvoiceExtraction>();
  @Input() type: 'sales' | 'purchases' = 'sales';

  extractedData: InvoiceExtraction | null = null;
  uploading = false;
  saving = false;
  uploadError: string | null = null;
  isDragOver = false;

  constructor(private api: ApiService, private translate: TranslateService) {}

  onDragOver(e: DragEvent) { e.preventDefault(); this.isDragOver = true; }
  onDragLeave(e: DragEvent) { e.preventDefault(); this.isDragOver = false; }
  onDrop(e: DragEvent) {
    e.preventDefault();
    this.isDragOver = false;
    const file = e.dataTransfer?.files?.[0];
    if (file) this.processFile(file);
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.processFile(file);
  }

  private processFile(file: File) {
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      this.uploadError = this.translate.instant('INVOICE.ERR_TYPE');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.uploadError = this.translate.instant('INVOICE.ERR_SIZE');
      return;
    }
    this.uploadError = null;
    this.uploading = true;

    const apiCall = this.type === 'sales'
      ? this.api.uploadSaleImage(file)
      : this.api.uploadPurchaseImage(file);

    apiCall.subscribe({
      next: (result) => {
        this.extractedData = result;
        // Re-process status labels
        this.recalculateQuality();
        this.uploading = false;
      },
      error: (err) => {
        this.uploadError = err?.error?.message || this.translate.instant('INVOICE.ERR_UPLOAD');
        this.uploading = false;
      },
    });
  }

  onRowEdited(index: number) {
    if (!this.extractedData) return;
    const row = this.extractedData.rows[index];

    // Re-apply smart fallback logic
    if (this.type === 'sales') {
      this.applySmartFixes(row, 'unitPrice', 'totalAmount');
      this.validateSaleRow(row);
    } else {
      this.applySmartFixes(row, 'unitCost', 'totalCost');
      this.validatePurchaseRow(row);
    }
    this.recalculateQuality();
  }

  private applySmartFixes(row: any, unitField: string, totalField: string) {
    const qty = Number(row.quantity) || 0;
    const unit = Number(row[unitField]) || 0;
    const total = Number(row[totalField]) || 0;

    // Auto-compute missing field
    if (unit > 0 && !total && qty > 0) {
      row[totalField] = Math.round(qty * unit * 100) / 100;
    } else if (total > 0 && !unit && qty > 0) {
      row[unitField] = Math.round(total / qty * 100) / 100;
    }
  }

  private validateSaleRow(row: any) {
    const issues: string[] = [];
    if (!row.product) issues.push(this.translate.instant('INVOICE.MISSING_PRODUCT'));
    if (!row.quantity || row.quantity <= 0) issues.push(this.translate.instant('INVOICE.INVALID_QTY'));
    if (!row.date) issues.push(this.translate.instant('INVOICE.MISSING_DATE'));
    if ((!row.totalAmount || row.totalAmount <= 0) && (!row.unitPrice || row.unitPrice <= 0))
      issues.push(this.translate.instant('INVOICE.MISSING_PRICE'));
    row.issues = issues;
    row.isValid = issues.length === 0;
  }

  private validatePurchaseRow(row: any) {
    const issues: string[] = [];
    if (!row.item) issues.push(this.translate.instant('INVOICE.MISSING_ITEM'));
    if (!row.quantity || row.quantity <= 0) issues.push(this.translate.instant('INVOICE.INVALID_QTY'));
    if ((!row.totalCost || row.totalCost <= 0) && (!row.unitCost || row.unitCost <= 0))
      issues.push(this.translate.instant('INVOICE.MISSING_PRICE'));
    row.issues = issues;
    row.isValid = issues.length === 0;
  }

  addEmptyRow() {
    if (!this.extractedData) return;
    const today = new Date().toISOString().slice(0, 10);
    const newRow: any = {
      product: '', item: '', quantity: 1,
      unitPrice: 0, unitCost: 0, totalAmount: 0, totalCost: 0,
      date: today, customer: '', supplier: '',
      isValid: false, issues: [this.type === 'sales' ? this.translate.instant('INVOICE.MISSING_PRODUCT') : this.translate.instant('INVOICE.MISSING_ITEM'), this.translate.instant('INVOICE.MISSING_PRICE')],
    };
    this.extractedData.rows.push(newRow);
    this.recalculateQuality();
  }

  deleteRow(index: number) {
    if (this.extractedData) {
      this.extractedData.rows.splice(index, 1);
      this.recalculateQuality();
    }
  }

  resetUpload() {
    this.extractedData = null;
    this.uploading = false;
    this.saving = false;
    this.uploadError = null;
  }

  onDataConfirm() {
    if (!this.extractedData) return;
    this.saving = true;
    this.dataExtracted.emit(this.extractedData);
    setTimeout(() => this.resetUpload(), 1500);
  }

  private recalculateQuality() {
    if (!this.extractedData) return;
    const rows = this.extractedData.rows;
    const validRows = rows.filter(r => r.isValid);
    const total = rows.length;
    const qualityPercent = total > 0 ? Math.round((validRows.length / total) * 100) : 0;

    let status: 'good' | 'warning' | 'poor' = 'good';
    let message = this.translate.instant('INVOICE.QUALITY_GOOD', { percent: qualityPercent });
    if (qualityPercent < 50) { 
        status = 'poor'; 
        message = this.translate.instant('INVOICE.QUALITY_POOR', { percent: qualityPercent }); 
    }
    else if (qualityPercent < 80) { 
        status = 'warning'; 
        message = this.translate.instant('INVOICE.QUALITY_FAIR', { percent: qualityPercent }); 
    }

    this.extractedData.quality = {
      totalRows: total,
      validRows: validRows.length,
      invalidRows: total - validRows.length,
      qualityPercent,
      status,
      message,
    };
    this.extractedData.recommendation = {
      canProceed: qualityPercent >= 50,
      needsReview: qualityPercent < 80,
      hint: qualityPercent < 50
        ? this.translate.instant('INVOICE.HINT_POOR')
        : qualityPercent < 80
        ? this.translate.instant('INVOICE.HINT_FAIR')
        : this.translate.instant('INVOICE.HINT_GOOD'),
    };
  }
}
