import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CsvUploadComponent } from '../components/csv-upload.component';
import { ApiService } from '../services/api.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-purchases-dashboard',
  standalone: true,
  imports: [CommonModule, CsvUploadComponent, TranslateModule],
  template: `
    <div class="page-header">
      <h1>{{ 'PURCHASES.UPLOAD_CSV' | translate }}</h1>
      <p class="page-subtitle">Track inventory, purchases, and stock alerts</p>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <div class="card-icon">📤</div>
        <h2>{{ 'PURCHASES.UPLOAD_CSV' | translate }}</h2>
        <app-csv-upload (fileSelected)="upload($event)"></app-csv-upload>
        <p *ngIf="message" class="status-msg">{{ message }}</p>
      </div>
      <div class="card">
        <div class="card-icon">🚨</div>
        <h2>{{ 'PURCHASES.ALERTS' | translate }}</h2>
        <div *ngIf="alerts.length === 0" class="no-alerts">
          ✅ {{ 'PURCHASES.NO_ALERTS' | translate }}
        </div>
        <div *ngFor="let alert of alerts" class="alert-row">
          <span class="badge badge-high">High</span>
          <span class="alert-text">{{ alert.item }} — {{ 'PURCHASES.STOCKOUT_IN' | translate }} <strong>{{ alert.predicted_stockout_days }}</strong> {{ 'PURCHASES.DAYS' | translate }}</span>
        </div>
      </div>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <h3>{{ 'PURCHASES.RECENT' | translate }}</h3>
        <table class="table">
          <thead>
            <tr>
              <th>{{ 'COMMON.DATE' | translate }}</th>
              <th>{{ 'COMMON.ITEM' | translate }}</th>
              <th>{{ 'COMMON.TYPE' | translate }}</th>
              <th>{{ 'COMMON.QTY' | translate }}</th>
              <th>{{ 'COMMON.TOTAL' | translate }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of purchases">
              <td>{{ row.date | date: 'yyyy-MM-dd' }}</td>
              <td>{{ row.item }}</td>
              <td><span class="type-badge">{{ row.type }}</span></td>
              <td>{{ row.quantity }}</td>
              <td><strong>{{ row.totalCost }}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="card">
        <h3>{{ 'PURCHASES.STOCK_TABLE' | translate }}</h3>
        <table class="table">
          <thead>
            <tr>
              <th>{{ 'COMMON.ITEM' | translate }}</th>
              <th>{{ 'PURCHASES.STOCK' | translate }}</th>
              <th>{{ 'PURCHASES.UPDATED' | translate }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of stock">
              <td>{{ row.item }}</td>
              <td>
                <span class="stock-num" [class.low]="row.currentStock < 20">
                  {{ row.currentStock }}
                </span>
              </td>
              <td>{{ row.lastUpdated | date: 'yyyy-MM-dd' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .page-header { margin-bottom: 24px; }
    .page-header h1 { font-size: 26px; font-weight: 800; color: #021024; margin: 0 0 6px; }
    .page-subtitle { color: #5483B3; font-size: 14px; margin: 0; }
    .card-icon { font-size: 28px; margin-bottom: 4px; }
    .status-msg {
      margin-top: 10px; padding: 10px 14px;
      background: #C1E8FF; color: #052659;
      border-radius: 8px; font-size: 13px; font-weight: 500;
      border: 1px solid #7DA0CA;
    }
    .no-alerts {
      background: #e9f7ef; color: #1e8449;
      border: 1px solid #a9dfbf; border-radius: 8px;
      padding: 12px 16px; font-size: 13.5px; font-weight: 500;
      margin-top: 8px;
    }
    .alert-row {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 14px; border-radius: 8px;
      margin-top: 8px;
      background: #fce7e7; border: 1px solid #f5b7b1;
    }
    .alert-text { font-size: 13px; color: #021024; }
    .type-badge {
      display: inline-block; padding: 2px 8px; border-radius: 6px;
      background: #C1E8FF; color: #052659;
      font-size: 11px; font-weight: 600; text-transform: uppercase;
    }
    .stock-num { font-weight: 700; color: #052659; }
    .stock-num.low { color: #c0392b; }
  `],
})
export class PurchasesDashboardComponent implements OnInit {
  message = '';
  purchases: any[] = [];
  stock: any[] = [];
  alerts: any[] = [];

  constructor(private api: ApiService, private translate: TranslateService) { }

  ngOnInit() {
    this.loadData();
  }

  upload(file: File) {
    this.api.uploadPurchases(file).subscribe({
      next: () => {
        this.message = this.translate.instant('PURCHASES.SUCCESS');
        this.loadData();
      },
      error: (err) => {
        this.message = err?.error?.message || this.translate.instant('SALES.FAILED');
      },
    });
  }

  loadData() {
    this.api.getPurchases().subscribe((data) => (this.purchases = data));
    this.api.getStock().subscribe((data) => (this.stock = data));
    this.api.getInventoryAlerts().subscribe((data) => (this.alerts = data));
  }
}
