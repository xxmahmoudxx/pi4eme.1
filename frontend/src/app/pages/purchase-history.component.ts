import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-purchase-history',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="page-container">
      <header class="page-header">
        <div class="header-content">
          <h1>{{ 'ACCOUNTANT.HISTORY_TITLE' | translate }}</h1>
          <p class="subtitle">{{ 'ACCOUNTANT.SUBTITLE' | translate }}</p>
        </div>
        <div class="stats-summary">
          <div class="summary-pill">
            <span class="dot approved"></span>
            <strong>{{ stats?.approved || 0 }}</strong> {{ 'ACCOUNTANT.APPROVED_COUNT' | translate }}
          </div>
          <div class="summary-pill">
            <span class="dot rejected"></span>
            <strong>{{ stats?.rejected || 0 }}</strong> {{ 'ACCOUNTANT.REJECTED_COUNT' | translate }}
          </div>
          <div class="summary-pill accent">
            <span class="icon">🤖</span>
            <strong>{{ stats?.accuracy || 100 }}%</strong> {{ 'ACCOUNTANT.AI_MATCH' | translate }}
          </div>
        </div>
      </header>

      <div class="filters-bar">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" [(ngModel)]="filters.search" (input)="filterData()" [placeholder]="'ACCOUNTANT.HISTORY_SEARCH' | translate" />
        </div>
        <div class="filter-group">
          <select [(ngModel)]="filters.status" (change)="filterData()">
            <option value="">{{ 'ACCOUNTANT.ALL_STATUSES' | translate }}</option>
            <option value="APPROVED">{{ 'ACCOUNTANT.APPROVED_COUNT' | translate }}</option>
            <option value="REJECTED">{{ 'ACCOUNTANT.REJECTED_COUNT' | translate }}</option>
          </select>
          <select [(ngModel)]="filters.employee" (change)="filterData()">
            <option value="">{{ 'ACCOUNTANT.ALL_EMPLOYEES' | translate }}</option>
            <option *ngFor="let emp of employees" [value]="emp">{{ emp }}</option>
          </select>
        </div>
      </div>

      <div class="table-container">
        <table class="history-table">
          <thead>
            <tr>
              <th>{{ 'ACCOUNTANT.TABLE_DATE' | translate }}</th>
              <th>{{ 'ACCOUNTANT.TABLE_EMPLOYEE' | translate }}</th>
              <th>{{ 'ACCOUNTANT.TABLE_ITEM' | translate }}</th>
              <th>{{ 'ACCOUNTANT.TABLE_AMOUNT' | translate }}</th>
              <th>{{ 'ACCOUNTANT.TABLE_AI' | translate }}</th>
              <th>{{ 'ACCOUNTANT.TABLE_FINAL' | translate }}</th>
              <th>{{ 'ACCOUNTANT.TABLE_DIFF' | translate }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of filteredItems" class="history-row">
              <td>{{ item.date | date:'shortDate' }}</td>
              <td>
                <div class="user-cell">
                  <div class="avatar">{{ item.submittedBy?.charAt(0) || 'U' }}</div>
                  <span>{{ item.submittedBy || 'Owner' }}</span>
                </div>
              </td>
              <td>
                <div class="item-cell">
                  <span class="item-name">{{ item.item }}</span>
                  <span class="category-tag">{{ item.category || ('COMMON.N_A' | translate) }}</span>
                </div>
              </td>
              <td class="amount-cell">{{ item.totalCost | currency:'USD' }}</td>
              <td>
                <span class="badge" [class.approved]="item.aiDecision === 'APPROVED'" [class.rejected]="item.aiDecision === 'REJECTED'">
                  {{ item.aiDecision ? ('ACCOUNTANT.' + item.aiDecision | translate) : ('COMMON.N_A' | translate) }}
                </span>
              </td>
              <td>
                <span class="badge solid" [class.approved]="item.finalStatus === 'APPROVED'" [class.rejected]="item.finalStatus === 'REJECTED'">
                  {{ 'ACCOUNTANT.' + item.finalStatus | translate }}
                </span>
              </td>
              <td>
                <div class="match-cell" *ngIf="item.aiDecision">
                  <span *ngIf="item.aiDecision === item.finalStatus" class="check">✅ {{ 'ACCOUNTANT.MATCH' | translate }}</span>
                  <span *ngIf="item.aiDecision !== item.finalStatus" class="warning">⚠️ {{ 'ACCOUNTANT.OVERRIDE' | translate }}</span>
                </div>
                <span *ngIf="!item.aiDecision" class="na">--</span>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="empty-results" *ngIf="filteredItems.length === 0">
          <p>{{ 'ACCOUNTANT.EMPTY_HISTORY' | translate }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 1300px;
      margin: 0 auto;
      padding: 2rem;
      animation: fadeIn 0.4s ease-out;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 3rem;
    }

    h1 {
      font-size: 2.2rem;
      font-weight: 800;
      color: #052659;
      margin: 0;
    }

    .subtitle {
      color: #5483B3;
      margin-top: 0.5rem;
    }

    .stats-summary {
      display: flex;
      gap: 1rem;
    }

    .summary-pill {
      background: white;
      padding: 0.6rem 1.2rem;
      border-radius: 50px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.04);
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 0.9rem;
      color: #64748b;
      border: 1px solid rgba(0,0,0,0.02);
    }

    .summary-pill.accent {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      color: #052659;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .dot.approved { background: #10b981; }
    .dot.rejected { background: #ef4444; }

    .filters-bar {
      display: flex;
      justify-content: space-between;
      gap: 2rem;
      margin-bottom: 2rem;
      flex-wrap: wrap;
    }

    .search-box {
      position: relative;
      flex: 1;
      min-width: 300px;
    }

    .search-icon {
      position: absolute;
      left: 1rem;
      top: 50%;
      transform: translateY(-50%);
      opacity: 0.4;
    }

    .search-box input {
      width: 100%;
      padding: 0.8rem 1rem 0.8rem 2.8rem;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      background: white;
      transition: all 0.2s;
    }

    .search-box input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102,126,234,0.1);
    }

    .filter-group {
      display: flex;
      gap: 1rem;
    }

    .filter-group select {
      padding: 0.8rem 1.2rem;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      background: white;
      color: #64748b;
      cursor: pointer;
    }

    .table-container {
      background: white;
      border-radius: 24px;
      padding: 1.5rem;
      box-shadow: 0 20px 50px rgba(0,0,0,0.04);
      border: 1px solid rgba(0,0,0,0.02);
      overflow-x: auto;
    }

    .history-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0 0.5rem;
    }

    th {
      text-align: left;
      padding: 1rem 1.5rem;
      color: #94a3b8;
      font-size: 0.85rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .history-row {
      transition: background 0.2s;
    }

    .history-row:hover {
      background: #f8fafc;
    }

    td {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
      vertical-align: middle;
    }

    .user-cell {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .avatar {
      width: 32px;
      height: 32px;
      background: #e2e8f0;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      color: #64748b;
      font-size: 0.8rem;
    }

    .item-cell {
      display: flex;
      flex-direction: column;
    }

    .item-name {
      font-weight: 600;
      color: #1e293b;
    }

    .category-tag {
      font-size: 0.75rem;
      color: #94a3b8;
    }

    .amount-cell {
      font-weight: 700;
      color: #052659;
    }

    .badge {
      padding: 0.35rem 0.75rem;
      border-radius: 8px;
      font-size: 0.75rem;
      font-weight: 700;
    }

    .badge.approved { color: #059669; background: #ecfdf5; }
    .badge.rejected { color: #dc2626; background: #fef2f2; }

    .badge.solid.approved { background: #10b981; color: white; }
    .badge.solid.rejected { background: #ef4444; color: white; }

    .match-cell {
      font-size: 0.85rem;
      font-weight: 600;
    }

    .match-cell .check { color: #059669; }
    .match-cell .warning { color: #f59e0b; }

    .empty-results {
      text-align: center;
      padding: 4rem;
      color: #94a3b8;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(15px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class PurchaseHistoryComponent implements OnInit {
  items: any[] = [];
  filteredItems: any[] = [];
  stats: any = null;
  employees: string[] = [];
  filters = {
    search: '',
    status: '',
    employee: ''
  };

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadHistory();
    this.loadStats();
  }

  loadHistory() {
    this.api.getPurchaseHistory().subscribe({
      next: (res) => {
        this.items = res.filter(i => i.finalStatus !== 'PENDING' && i.finalStatus !== undefined);
        this.filteredItems = [...this.items];
        this.extractEmployees();
      },
      error: (err) => console.error('Failed to load history', err)
    });
  }

  loadStats() {
    this.api.getPurchaseReviewStats().subscribe({
      next: (res) => this.stats = res,
      error: (err) => console.error('Failed to load stats', err)
    });
  }

  extractEmployees() {
    const emps = new Set(this.items.map(i => i.submittedBy || 'Owner'));
    this.employees = Array.from(emps);
  }

  filterData() {
    this.filteredItems = this.items.filter(item => {
      const matchesSearch = !this.filters.search || 
        item.item.toLowerCase().includes(this.filters.search.toLowerCase()) ||
        (item.submittedBy || '').toLowerCase().includes(this.filters.search.toLowerCase());
      
      const matchesStatus = !this.filters.status || item.finalStatus === this.filters.status;
      const matchesEmployee = !this.filters.employee || (item.submittedBy || 'Owner') === this.filters.employee;

      return matchesSearch && matchesStatus && matchesEmployee;
    });
  }
}
