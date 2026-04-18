import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

export interface MappingConfirmed {
  mapping: Record<string, string>;
  isRequest: boolean;
}

@Component({
  selector: 'app-csv-mapping',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="mapping-overlay" *ngIf="visible">
      <div class="mapping-modal">
        <div class="modal-header">
          <h2>{{ 'CSV.MAP_COLUMNS' | translate }}</h2>
          <p class="modal-sub">{{ 'CSV.DETECTED_COLS' | translate:{ headers: headers.length, rows: totalRows } }}</p>
          <button class="btn-close" (click)="cancel()">&times;</button>
        </div>

        <!-- Smart Hints -->
        <div class="hints-section" *ngIf="hints.length > 0">
          <div class="hint-item" *ngFor="let hint of hints">{{ hint }}</div>
        </div>

        <!-- Mapping Table -->
        <div class="mapping-table-wrap">
          <table class="mapping-table">
            <thead>
              <tr>
                <th>{{ 'CSV.COLUMN' | translate }}</th>
                <th>{{ 'CSV.SAMPLE' | translate }}</th>
                <th>{{ 'CSV.MAP_TO' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let h of headers">
                <td class="csv-col">{{ h }}</td>
                <td class="sample-data">{{ getSample(h) }}</td>
                <td>
                  <select [(ngModel)]="mapping[h]" [name]="'map_' + h" class="map-select"
                          [class.mapped]="mapping[h]" [class.unmapped]="!mapping[h]">
                    <option value="">-- {{ 'CSV.SKIP' | translate }} --</option>
                    <option *ngFor="let f of standardFields" [value]="f" [disabled]="isFieldUsed(f, h)">
                      {{ f }}{{ isRequired(f) ? ' *' : '' }}{{ isFieldUsed(f, h) ? ' (' + ('CSV.USED' | translate) + ')' : '' }}
                    </option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Field Requirements -->
        <div class="mapping-status">
          <div class="status-group">
            <span class="status-group-label">{{ 'CSV.REQUIRED' | translate }}:</span>
            <div class="status-item"
                 *ngFor="let f of requiredFields"
                 [class.ok]="isMapped(f)" [class.missing]="!isMapped(f)">
              {{ isMapped(f) ? '&#10003;' : '&#10007;' }} {{ f }}
            </div>
          </div>
          <div class="status-group" *ngIf="eitherOrFields.length > 0">
            <span class="status-group-label">{{ 'CSV.NEED_ONE' | translate }}:</span>
            <div class="status-item"
                 *ngFor="let f of eitherOrFields"
                 [class.ok]="isMapped(f)" [class.neutral]="!isMapped(f) && eitherOrSatisfied()"
                 [class.missing]="!isMapped(f) && !eitherOrSatisfied()">
              {{ isMapped(f) ? '&#10003;' : (eitherOrSatisfied() ? '○' : '&#10007;') }} {{ f }}
            </div>
          </div>
        </div>

        <!-- Data Quality Preview -->
        <div class="quality-section" *ngIf="quality">
          <div class="quality-bar-container">
            <div class="quality-bar" [style.width.%]="quality.qualityPercent"
                 [class.quality-good]="quality.status === 'good'"
                 [class.quality-warning]="quality.status === 'warning'"
                 [class.quality-poor]="quality.status === 'poor'">
            </div>
          </div>
          <div class="quality-summary"
               [class.quality-good-text]="quality.status === 'good'"
               [class.quality-warning-text]="quality.status === 'warning'"
               [class.quality-poor-text]="quality.status === 'poor'">
            <span class="quality-icon" *ngIf="quality.status === 'good'">&#10003;</span>
            <span class="quality-icon" *ngIf="quality.status === 'warning'">!</span>
            <span class="quality-icon" *ngIf="quality.status === 'poor'">&#10007;</span>
            {{ quality.message }}
          </div>
          <div class="quality-details">
            <span class="qd valid">{{ quality.validRows }} {{ 'CSV.ROWS_READY' | translate }}</span>
            <span class="qd invalid" *ngIf="quality.invalidRows > 0">{{ quality.invalidRows }} {{ 'CSV.ROWS_SKIPPED' | translate }}</span>
            <span class="qd percent">{{ quality.qualityPercent }}% {{ 'CSV.QUALITY' | translate }}</span>
          </div>
        </div>

        <!-- Smart Fixes Applied -->
        <div class="smartfixes-section" *ngIf="smartFixes.length > 0">
          <div class="section-label">&#9889; {{ 'CSV.AUTO_FIXES' | translate }}:</div>
          <div class="smartfix-item" *ngFor="let fix of smartFixes">{{ fix }}</div>
        </div>

        <!-- Preview Warnings (not blocking) -->
        <div class="warnings-section" *ngIf="previewWarnings.length > 0">
          <div class="section-label">&#9888; {{ 'CSV.WARNINGS' | translate }}:</div>
          <div class="warning-item" *ngFor="let w of previewWarnings">{{ w }}</div>
        </div>

        <!-- Preview Errors -->
        <div class="errors-section" *ngIf="previewErrors.length > 0">
          <div class="section-label">{{ 'CSV.SKIPPED_ROWS_MSG' | translate }}:</div>
          <div class="error-item" *ngFor="let e of previewErrors">{{ e }}</div>
        </div>

        <!-- Request Toggle -->
        <div class="request-toggle-card">
          <input type="checkbox" id="csvIsRequest" [(ngModel)]="isRequest" />
          <div class="request-label-wrap">
            <label for="csvIsRequest">{{ 'PURCHASES.SUBMIT_AS_REQUEST' | translate }}</label>
            <p class="request-hint">{{ 'PURCHASES.REQUEST_HINT' | translate }}</p>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn-cancel" (click)="cancel()">{{ 'SETTINGS.CANCEL' | translate }}</button>
          <button class="btn-confirm" (click)="confirm()" [disabled]="!canImport()">
            {{ 'CSV.IMPORT_BTN' | translate:{ count: quality ? quality.validRows : totalRows } }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .mapping-overlay {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(2,16,36,0.5); display: flex; align-items: center; justify-content: center;
      z-index: 1000; backdrop-filter: blur(3px);
    }
    .mapping-modal {
      background: white; border-radius: 16px; padding: 28px; width: 90%; max-width: 750px;
      max-height: 85vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(2,16,36,0.3);
    }
    .modal-header { position: relative; margin-bottom: 16px; }
    .modal-header h2 { margin: 0 0 6px; font-size: 20px; color: #021024; }
    .modal-sub { color: #5483B3; font-size: 13px; margin: 0; }
    .btn-close {
      position: absolute; top: 0; right: 0; background: none; border: none;
      font-size: 24px; color: #7DA0CA; cursor: pointer; padding: 4px 8px;
    }
    .btn-close:hover { color: #021024; }

    /* Smart Hints */
    .hints-section {
      margin-bottom: 14px; padding: 10px 14px; background: #f0f6ff; border-radius: 10px;
      border: 1px solid #C1E8FF;
    }
    .hint-item { font-size: 12.5px; color: #052659; padding: 3px 0; line-height: 1.5; }

    /* Mapping Table */
    .mapping-table-wrap { overflow-x: auto; margin-bottom: 14px; }
    .mapping-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .mapping-table th {
      text-align: left; padding: 10px 12px; background: #f0f6ff;
      color: #052659; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;
      border-bottom: 2px solid #C1E8FF;
    }
    .mapping-table td { padding: 10px 12px; border-bottom: 1px solid #f0f4f8; }
    .csv-col { font-weight: 700; color: #021024; }
    .sample-data { color: #7DA0CA; font-size: 12px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .map-select {
      width: 100%; padding: 7px 10px; border: 1.5px solid #C1E8FF; border-radius: 7px;
      font-size: 13px; font-family: inherit; color: #021024; background: white; cursor: pointer;
    }
    .map-select.mapped { border-color: #10b981; background: #f0fdf4; }
    .map-select.unmapped { border-color: #C1E8FF; }
    .map-select:focus { outline: none; border-color: #5483B3; box-shadow: 0 0 0 3px rgba(84,131,179,0.12); }

    /* Status */
    .mapping-status {
      display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px;
      padding: 12px; background: #f8fbff; border-radius: 10px;
    }
    .status-group { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .status-group-label { font-size: 11px; font-weight: 700; color: #5483B3; text-transform: uppercase; min-width: 120px; }
    .status-item { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .status-item.ok { background: #e9f7ef; color: #1e8449; }
    .status-item.missing { background: #fce7e7; color: #c0392b; }
    .status-item.neutral { background: #fef9e7; color: #b7770d; }

    /* Quality Bar */
    .quality-section { margin-bottom: 14px; padding: 14px; background: #f8fbff; border-radius: 10px; border: 1px solid #e2e8f0; }
    .quality-bar-container {
      height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; margin-bottom: 10px;
    }
    .quality-bar { height: 100%; border-radius: 4px; transition: width 0.5s ease; }
    .quality-good { background: linear-gradient(90deg, #10b981, #059669); }
    .quality-warning { background: linear-gradient(90deg, #f59e0b, #d97706); }
    .quality-poor { background: linear-gradient(90deg, #ef4444, #dc2626); }
    .quality-summary {
      display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; margin-bottom: 8px;
    }
    .quality-icon { width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; color: white; }
    .quality-good-text { color: #059669; }
    .quality-good-text .quality-icon { background: #10b981; }
    .quality-warning-text { color: #d97706; }
    .quality-warning-text .quality-icon { background: #f59e0b; }
    .quality-poor-text { color: #dc2626; }
    .quality-poor-text .quality-icon { background: #ef4444; }
    .quality-details { display: flex; gap: 12px; }
    .qd { font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 6px; }
    .qd.valid { background: #e9f7ef; color: #1e8449; }
    .qd.invalid { background: #fef3cd; color: #b7770d; }
    .qd.percent { background: #f0f6ff; color: #052659; }

    /* Smart Fixes, Warnings, Errors */
    .section-label { font-size: 11px; font-weight: 700; color: #5483B3; text-transform: uppercase; margin-bottom: 4px; }
    .smartfixes-section { margin-bottom: 10px; padding: 10px 14px; background: #f0fdf4; border-radius: 8px; border: 1px solid #a9dfbf; }
    .smartfix-item { font-size: 12px; color: #1e8449; padding: 2px 0; }
    .warnings-section { margin-bottom: 10px; padding: 10px 14px; background: #fef9e7; border-radius: 8px; border: 1px solid #f9e79f; }
    .warning-item { font-size: 12px; color: #b7770d; padding: 2px 0; }
    .errors-section { margin-bottom: 14px; padding: 10px 14px; background: #fce7e7; border-radius: 8px; border: 1px solid #f5b7b1; }
    .error-item { font-size: 12px; color: #c0392b; padding: 2px 0; }

    .request-toggle-card {
      margin-bottom: 20px; padding: 14px; border-radius: 12px;
      background: #f0f6ff; border: 2px dashed #5483B3;
      display: flex; align-items: center; gap: 12px;
    }
    .request-toggle-card input { width: 22px; height: 22px; cursor: pointer; }
    .request-label-wrap { display: flex; flex-direction: column; gap: 2px; }
    .request-label-wrap label { font-weight: 700; color: #052659; cursor: pointer; font-size: 14px; }
    .request-hint { font-size: 11px; color: #5483B3; margin: 0; }

    /* Actions */
    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; }
    .btn-cancel {
      padding: 10px 20px; border: 1.5px solid #C1E8FF; border-radius: 8px;
      background: white; color: #5483B3; font-weight: 600; font-size: 13px;
      font-family: inherit; cursor: pointer;
    }
    .btn-cancel:hover { background: #f0f6ff; }
    .btn-confirm {
      padding: 10px 24px; border: none; border-radius: 8px;
      background: linear-gradient(135deg, #052659 0%, #5483B3 100%);
      color: white; font-weight: 700; font-size: 13px; font-family: inherit; cursor: pointer;
      box-shadow: 0 2px 8px rgba(5,38,89,0.25);
    }
    .btn-confirm:hover:not(:disabled) { background: linear-gradient(135deg, #021024 0%, #052659 100%); }
    .btn-confirm:disabled { opacity: 0.45; cursor: not-allowed; }
  `],
})
export class CsvMappingComponent implements OnChanges {
  @Input() visible = false;
  @Input() headers: string[] = [];
  @Input() suggestedMapping: Record<string, string> = {};
  @Input() sampleRows: Record<string, string>[] = [];
  @Input() totalRows = 0;
  @Input() standardFields: string[] = [];
  @Input() requiredFields: string[] = [];
  @Input() eitherOrFields: string[] = [];
  @Input() hints: string[] = [];
  @Input() quality: any = null;
  @Input() previewErrors: string[] = [];
  @Input() previewWarnings: string[] = [];
  @Input() smartFixes: string[] = [];
  @Output() mappingConfirmed = new EventEmitter<MappingConfirmed>();
  @Output() mappingCancelled = new EventEmitter<void>();

  mapping: Record<string, string> = {};
  isRequest = false;

  constructor(private translate: TranslateService) {}

  ngOnChanges(_changes: SimpleChanges) {
    if (this.suggestedMapping) {
      this.mapping = { ...this.suggestedMapping };
    }
  }

  getSample(header: string): string {
    if (!this.sampleRows.length) return '';
    const values = this.sampleRows.map((r) => r[header]).filter(Boolean).slice(0, 3);
    return values.join(', ');
  }

  isFieldUsed(field: string, currentHeader: string): boolean {
    return Object.entries(this.mapping).some(([h, f]) => f === field && h !== currentHeader);
  }

  isMapped(field: string): boolean {
    return Object.values(this.mapping).includes(field);
  }

  isRequired(field: string): boolean {
    return this.requiredFields.includes(field);
  }

  eitherOrSatisfied(): boolean {
    if (this.eitherOrFields.length === 0) return true;
    return this.eitherOrFields.some(f => this.isMapped(f));
  }

  canImport(): boolean {
    const allRequired = this.requiredFields.every((f) => this.isMapped(f));
    const eitherOr = this.eitherOrSatisfied();
    return allRequired && eitherOr;
  }

  confirm() {
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(this.mapping)) {
      if (v) clean[k] = v;
    }
    this.mappingConfirmed.emit({ mapping: clean, isRequest: this.isRequest });
  }

  cancel() {
    this.mappingCancelled.emit();
  }
}
