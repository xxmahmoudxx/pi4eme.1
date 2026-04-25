import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { AccountantAiReport } from '../models/accountant-ai-report.model';

@Component({
  selector: 'app-accountant-ai-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <h1>AI Accountant Reports</h1>
      <p class="page-subtitle">
        Generate, review, edit, and approve company-scoped AI reports before sending to the company owner.
      </p>
    </div>

    <div class="card controls-card">
      <div class="controls-grid">
        <div>
          <label class="label">Focus Areas (optional)</label>
          <input
            type="text"
            [(ngModel)]="focusAreasInput"
            placeholder="Example: cash flow, stockout mitigation, supplier renegotiation"
          />
        </div>
        <div>
          <label class="label">Custom Instructions (optional)</label>
          <input
            type="text"
            [(ngModel)]="customInstructions"
            placeholder="Any extra guidance for this report generation"
          />
        </div>
      </div>
      <label class="checkbox-row">
        <input type="checkbox" [(ngModel)]="includeWebResearch" />
        <span>Include grounded web context (if available)</span>
      </label>
      <div class="button-row">
        <button class="button" (click)="generateReport()" [disabled]="isGenerating">
          {{ isGenerating ? 'Generating...' : 'Generate AI Report' }}
        </button>
        <button class="button secondary" (click)="regenerateReport()" [disabled]="!selectedReport || isGenerating">
          Regenerate
        </button>
        <button class="button secondary" (click)="saveDraft()" [disabled]="!selectedReport || isSaving">
          {{ isSaving ? 'Saving...' : 'Save Draft' }}
        </button>
        <button class="button approve-btn" (click)="openApproveModal()" [disabled]="!selectedReport || isSending">
          Approve And Send
        </button>
      </div>
      <p class="hint">
        Reports are never auto-sent. Accountant validation is required before delivery.
      </p>
    </div>

    <div class="status-row" *ngIf="errorMessage">{{ errorMessage }}</div>
    <div class="status-row success" *ngIf="successMessage">{{ successMessage }}</div>

    <div class="workspace-grid">
      <div class="card history-card">
        <div class="history-head">
          <h2>Report History</h2>
          <button class="mini-btn" (click)="loadHistory(false)">Refresh</button>
        </div>
        <div class="history-list" *ngIf="reports.length > 0; else emptyHistory">
          <button
            class="history-item"
            *ngFor="let report of reports; trackBy: trackById"
            [class.active]="selectedReport?._id === report._id"
            (click)="selectReport(report)"
          >
            <div class="item-row">
              <span class="badge" [ngClass]="statusClass(report.status)">{{ report.status }}</span>
              <span class="item-date">{{ formatDate(report.generatedAt || report.createdAt) }}</span>
            </div>
            <div class="item-meta">
              <span>{{ report.usedWebResearch ? 'Web+Internal' : 'Internal Only' }}</span>
              <span>{{ report.ownerEmail }}</span>
            </div>
          </button>
        </div>
        <ng-template #emptyHistory>
          <div class="empty-state">No reports generated yet.</div>
        </ng-template>
      </div>

      <div class="card report-card">
        <ng-container *ngIf="selectedReport; else emptySelection">
          <div class="report-head">
            <h2>Current Draft</h2>
            <span class="badge" [ngClass]="statusClass(selectedReport.status)">
              {{ selectedReport.status }}
            </span>
          </div>

          <div class="sections-grid">
            <div class="section-box">
              <h3>Executive Summary</h3>
              <p>{{ selectedReport.sections.executiveSummary || 'N/A' }}</p>
            </div>
            <div class="section-box">
              <h3>Current Business State</h3>
              <p>{{ selectedReport.sections.businessState || 'N/A' }}</p>
            </div>
            <div class="section-box">
              <h3>Major Risks</h3>
              <ul>
                <li *ngFor="let item of selectedReport.sections.risks || []">{{ item }}</li>
              </ul>
            </div>
            <div class="section-box">
              <h3>Major Opportunities</h3>
              <ul>
                <li *ngFor="let item of selectedReport.sections.opportunities || []">{{ item }}</li>
              </ul>
            </div>
            <div class="section-box">
              <h3>Inventory Recommendations</h3>
              <ul>
                <li *ngFor="let item of selectedReport.sections.inventoryActions || []">{{ item }}</li>
              </ul>
            </div>
            <div class="section-box">
              <h3>Purchasing Recommendations</h3>
              <ul>
                <li *ngFor="let item of selectedReport.sections.purchasingActions || []">{{ item }}</li>
              </ul>
            </div>
          </div>

          <div class="edit-block">
            <label class="label">Short Email Summary</label>
            <textarea rows="3" [(ngModel)]="shortEmailSummary"></textarea>

            <label class="label">Editable Full Draft</label>
            <textarea rows="18" [(ngModel)]="editedDraft"></textarea>
          </div>

          <div class="citations-block">
            <h3>Citations / Sources</h3>
            <div *ngIf="(selectedReport.citations || []).length === 0" class="empty-inline">
              No citations captured for this draft.
            </div>
            <div class="citation-item" *ngFor="let citation of selectedReport.citations || []">
              <a [href]="citation.url" target="_blank" rel="noopener noreferrer">{{ citation.title || citation.url }}</a>
              <p>{{ citation.snippet }}</p>
              <small>{{ citation.source }}</small>
            </div>
          </div>

          <div class="errors-block" *ngIf="selectedReport.generationErrors?.length || selectedReport.sendErrors?.length">
            <h3>System Errors</h3>
            <ul>
              <li *ngFor="let err of selectedReport.generationErrors || []">{{ err }}</li>
              <li *ngFor="let err of selectedReport.sendErrors || []">{{ err }}</li>
            </ul>
          </div>
        </ng-container>
      </div>
    </div>

    <ng-template #emptySelection>
      <div class="empty-state large">Select a report from history or generate a new one.</div>
    </ng-template>

    <div class="modal-backdrop" *ngIf="showApproveModal">
      <div class="modal-card">
        <h3>Confirm Approval And Send</h3>
        <p>
          You are about to send the approved report PDF to:
          <strong>{{ selectedReport?.ownerEmail }}</strong>
        </p>
        <p>This action will update status to SENT if email delivery succeeds.</p>
        <div class="modal-actions">
          <button class="button secondary" (click)="closeApproveModal()">Cancel</button>
          <button class="button approve-btn" (click)="confirmApproveAndSend()" [disabled]="isSending">
            {{ isSending ? 'Sending...' : 'Confirm And Send' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-header { margin-bottom: 20px; }
    .page-header h1 { margin: 0 0 6px; font-size: 28px; font-weight: 800; color: #021024; }
    .page-subtitle { margin: 0; color: #5483B3; }

    .controls-card { margin-bottom: 14px; }
    .controls-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; margin-bottom: 10px; }
    .label { display: block; margin-bottom: 6px; font-size: 12px; font-weight: 700; color: #052659; }
    .checkbox-row { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: #052659; margin-bottom: 10px; }
    .button-row { display: flex; flex-wrap: wrap; gap: 8px; }
    .button-row .button { width: auto; min-width: 150px; }
    .approve-btn { background: linear-gradient(135deg, #0f766e, #0891b2); }
    .approve-btn:hover:not(:disabled) { background: linear-gradient(135deg, #115e59, #0e7490); }
    .hint { margin: 10px 0 0; color: #7DA0CA; font-size: 12px; }

    .status-row { margin-bottom: 10px; padding: 10px 12px; border-radius: 8px; background: #fee2e2; color: #991b1b; font-weight: 600; }
    .status-row.success { background: #dcfce7; color: #166534; }

    .workspace-grid { display: grid; grid-template-columns: 320px minmax(0, 1fr); gap: 14px; align-items: flex-start; }
    .history-card { position: sticky; top: 12px; max-height: calc(100vh - 120px); overflow: auto; }
    .history-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    .history-head h2 { margin: 0; font-size: 16px; }
    .mini-btn { border: 1px solid #c1e8ff; background: #f0f6ff; color: #052659; border-radius: 8px; padding: 6px 10px; cursor: pointer; font-weight: 600; }
    .history-list { display: flex; flex-direction: column; gap: 8px; }
    .history-item { width: 100%; text-align: left; border: 1px solid #dbeafe; border-radius: 10px; padding: 10px; background: #fff; cursor: pointer; }
    .history-item.active { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15); }
    .item-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
    .item-date { font-size: 11px; color: #6b7280; }
    .item-meta { display: flex; flex-direction: column; gap: 2px; font-size: 12px; color: #4b5563; }

    .report-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .report-head h2 { margin: 0; border: none; padding: 0; }
    .sections-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px; }
    .section-box { border: 1px solid rgba(84, 131, 179, 0.2); border-radius: 10px; padding: 10px; background: #fbfdff; }
    .section-box h3 { margin: 0 0 8px; font-size: 13px; color: #052659; border: none; padding: 0; }
    .section-box p { margin: 0; font-size: 13px; color: #1f2937; white-space: pre-wrap; }
    .section-box ul { margin: 0; padding-left: 18px; font-size: 13px; color: #1f2937; }

    .edit-block { margin-top: 14px; }
    .edit-block textarea { width: 100%; border-radius: 10px; padding: 10px; resize: vertical; margin-bottom: 10px; }

    .citations-block { margin-top: 8px; border-top: 1px solid #e5efff; padding-top: 10px; }
    .citations-block h3, .errors-block h3 { margin: 0 0 8px; font-size: 14px; color: #052659; border: none; padding: 0; }
    .citation-item { padding: 8px 0; border-bottom: 1px solid #edf2fb; }
    .citation-item a { color: #1d4ed8; font-weight: 700; text-decoration: none; }
    .citation-item p { margin: 4px 0; color: #374151; font-size: 13px; }
    .citation-item small { color: #6b7280; font-size: 12px; }
    .empty-inline { color: #6b7280; font-size: 13px; }

    .errors-block { margin-top: 8px; border-top: 1px solid #fee2e2; padding-top: 8px; }
    .errors-block ul { margin: 0; padding-left: 18px; color: #991b1b; }

    .badge { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .status-draft_generated { background: #dbeafe; color: #1d4ed8; }
    .status-edited { background: #fef9c3; color: #854d0e; }
    .status-approved { background: #ede9fe; color: #6d28d9; }
    .status-sent { background: #dcfce7; color: #166534; }
    .status-failed_to_send { background: #fee2e2; color: #991b1b; }

    .empty-state { border: 1px dashed #cbd5e1; padding: 16px; text-align: center; color: #64748b; border-radius: 10px; }
    .empty-state.large { margin: 30px 0; }

    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45);
      display: flex; align-items: center; justify-content: center; z-index: 1000;
    }
    .modal-card {
      width: min(560px, calc(100vw - 20px));
      background: #fff;
      border-radius: 14px;
      box-shadow: 0 18px 40px rgba(0, 0, 0, 0.25);
      padding: 18px;
    }
    .modal-card h3 { margin: 0 0 10px; border: none; padding: 0; color: #021024; }
    .modal-card p { margin: 0 0 8px; color: #334155; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
    .modal-actions .button { width: auto; min-width: 130px; }

    @media (max-width: 980px) {
      .workspace-grid { grid-template-columns: 1fr; }
      .history-card { position: static; max-height: none; }
    }
  `],
})
export class AccountantAiReportsComponent implements OnInit {
  reports: AccountantAiReport[] = [];
  selectedReport: AccountantAiReport | null = null;

  editedDraft = '';
  shortEmailSummary = '';
  focusAreasInput = '';
  customInstructions = '';
  includeWebResearch = true;

  isGenerating = false;
  isSaving = false;
  isSending = false;

  errorMessage = '';
  successMessage = '';
  showApproveModal = false;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadHistory(true);
  }

  trackById(_: number, item: AccountantAiReport): string {
    return item._id;
  }

  loadHistory(selectFirst: boolean): void {
    this.api.getAccountantAiReports(50).subscribe({
      next: (items) => {
        this.reports = items || [];
        if (selectFirst) {
          this.selectReport(this.reports[0] || null);
        } else if (this.selectedReport) {
          const updated = this.reports.find((item) => item._id === this.selectedReport?._id);
          if (updated) this.selectReport(updated);
        }
      },
      error: (error) => this.setError(this.extractError(error)),
    });
  }

  selectReport(report: AccountantAiReport | null): void {
    this.selectedReport = report;
    this.editedDraft = report?.editedDraft || report?.aiDraft || '';
    this.shortEmailSummary = report?.shortEmailSummary || '';
  }

  generateReport(): void {
    this.clearMessages();
    this.isGenerating = true;

    this.api
      .generateAccountantAiReport({
        includeWebResearch: this.includeWebResearch,
        focusAreas: this.parseFocusAreas(),
        customInstructions: this.customInstructions.trim() || undefined,
      })
      .subscribe({
        next: (report) => {
          this.successMessage = 'AI report draft generated successfully.';
          this.isGenerating = false;
          this.loadHistory(false);
          if (report?._id) {
            this.selectReport(report);
          }
        },
        error: (error) => {
          this.isGenerating = false;
          this.setError(this.extractError(error));
        },
      });
  }

  regenerateReport(): void {
    if (!this.selectedReport) return;
    this.clearMessages();
    this.isGenerating = true;
    this.api
      .regenerateAccountantAiReport(this.selectedReport._id, {
        includeWebResearch: this.includeWebResearch,
        focusAreas: this.parseFocusAreas(),
        customInstructions: this.customInstructions.trim() || undefined,
      })
      .subscribe({
        next: (report) => {
          this.successMessage = 'Report draft regenerated.';
          this.isGenerating = false;
          this.selectReport(report);
          this.loadHistory(false);
        },
        error: (error) => {
          this.isGenerating = false;
          this.setError(this.extractError(error));
        },
      });
  }

  saveDraft(): void {
    if (!this.selectedReport) return;
    this.clearMessages();
    this.isSaving = true;
    this.api
      .updateAccountantAiReportDraft(this.selectedReport._id, {
        editedDraft: this.editedDraft,
        shortEmailSummary: this.shortEmailSummary,
      })
      .subscribe({
        next: (report) => {
          this.successMessage = 'Draft saved.';
          this.isSaving = false;
          this.selectReport(report);
          this.loadHistory(false);
        },
        error: (error) => {
          this.isSaving = false;
          this.setError(this.extractError(error));
        },
      });
  }

  openApproveModal(): void {
    if (!this.selectedReport) return;
    this.showApproveModal = true;
  }

  closeApproveModal(): void {
    this.showApproveModal = false;
  }

  confirmApproveAndSend(): void {
    if (!this.selectedReport) return;
    this.clearMessages();
    this.isSending = true;
    this.api
      .approveAndSendAccountantAiReport(this.selectedReport._id, {
        finalApprovedText: this.editedDraft,
        shortEmailSummary: this.shortEmailSummary,
      })
      .subscribe({
        next: (report) => {
          this.successMessage = 'Report approved and sent successfully.';
          this.isSending = false;
          this.showApproveModal = false;
          this.selectReport(report);
          this.loadHistory(false);
        },
        error: (error) => {
          this.isSending = false;
          this.showApproveModal = false;
          this.setError(this.extractError(error));
          this.loadHistory(false);
        },
      });
  }

  statusClass(status: string): string {
    return `status-${(status || '').toLowerCase()}`;
  }

  formatDate(value?: string): string {
    if (!value) return '-';
    return new Date(value).toLocaleString();
  }

  private parseFocusAreas(): string[] {
    return this.focusAreasInput
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  private setError(message: string): void {
    this.errorMessage = message;
    this.successMessage = '';
  }

  private extractError(error: any): string {
    return (
      error?.error?.message ||
      error?.error?.error ||
      error?.message ||
      'An unexpected error occurred.'
    );
  }
}
