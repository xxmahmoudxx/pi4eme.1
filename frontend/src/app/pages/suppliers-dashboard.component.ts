import { CdkDragDrop, CdkDragEnter, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-suppliers-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, TranslateModule],
  template: `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1>{{ 'PARTNERS.SUPPLIERS_TITLE' | translate }}</h1>
          <p class="page-subtitle">{{ 'PARTNERS.SUPPLIERS_SUB' | translate }}</p>
        </div>
        <button class="btn-add" (click)="showModal = true; editingSupplier = null; resetForm()">
          <span class="btn-icon">+</span> {{ 'PARTNERS.ADD_SUPPLIER' | translate }}
        </button>
      </div>
    </div>

    <div class="search-bar">
      <span class="search-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </span>
      <input type="text" [(ngModel)]="searchQuery" (input)="onSearch()" [placeholder]="'PARTNERS.SEARCH_SUPPLIERS' | translate" class="search-input" />
    </div>

    <div class="partner-grid" *ngIf="filteredSuppliers.length > 0" cdkDropListGroup>
      <div
        class="partner-card-shell"
        *ngFor="let s of filteredSuppliers; trackBy: trackBySupplierId"
        cdkDropList
        [id]="getSupplierDropListId(s)"
        [cdkDropListData]="s"
        [cdkDropListConnectedTo]="supplierDropListIds"
        [cdkDropListSortingDisabled]="true"
        (cdkDropListEntered)="onSupplierEntered($event, s)"
        (cdkDropListDropped)="onSupplierDropped($event)"
      >
        <div
          class="partner-card"
          cdkDrag
          [cdkDragData]="s"
          (cdkDragStarted)="onSupplierDragStarted(s)"
          (cdkDragEnded)="onSupplierDragEnded()"
        >
          <div class="partner-card-top">
            <div class="partner-avatar supplier">{{ getInitials(s.name) }}</div>
            <div class="partner-info">
              <span class="partner-name">{{ s.name }}</span>
              <span class="partner-meta" *ngIf="s.email">{{ s.email }}</span>
              <span class="partner-meta" *ngIf="s.phone">{{ s.phone }}</span>
            </div>
            <button
              class="btn-drag-handle"
              type="button"
              cdkDragHandle
              aria-label="Reorder supplier"
              title="Drag to reorder"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="8" cy="6" r="1.6" />
                <circle cx="16" cy="6" r="1.6" />
                <circle cx="8" cy="12" r="1.6" />
                <circle cx="16" cy="12" r="1.6" />
                <circle cx="8" cy="18" r="1.6" />
                <circle cx="16" cy="18" r="1.6" />
              </svg>
            </button>
          </div>
          <div class="partner-card-actions">
            <button class="btn-action edit" (click)="editSupplier(s)" [title]="'SETTINGS.EDIT' | translate">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button class="btn-action delete" (click)="deleteSupplier(s._id)" [title]="'ADMIN.DELETE' | translate">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
          <div class="partner-date">{{ 'PARTNERS.ADDED' | translate }} {{ s.createdAt | date:'mediumDate' }}</div>
        </div>
      </div>
    </div>

    <div class="empty-state card" *ngIf="!loading && filteredSuppliers.length === 0">
      <div class="empty-icon">&#127981;</div>
      <h3>{{ 'PARTNERS.EMPTY_SUPPLIERS' | translate }}</h3>
      <p>{{ 'PARTNERS.SUPPLIERS_SUB' | translate }}</p>
    </div>

    <div class="card loading-state" *ngIf="loading">
      <div class="spinner"></div>
      <p>{{ 'SETTINGS.LOADING' | translate }}</p>
    </div>

    <div class="modal-overlay" *ngIf="showModal" (click)="showModal = false">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>{{ editingSupplier ? ('PARTNERS.EDIT_SUPPLIER' | translate) : ('PARTNERS.ADD_SUPPLIER' | translate) }}</h2>
          <button class="btn-close" (click)="showModal = false">&times;</button>
        </div>
        <form (ngSubmit)="saveSupplier()" class="modal-form">
          <div class="form-group">
            <label>{{ 'PARTNERS.NAME' | translate }} *</label>
            <input type="text" [(ngModel)]="form.name" name="name" required [placeholder]="'PARTNERS.NAME' | translate" />
          </div>
          <div class="form-group">
            <label>{{ 'PARTNERS.EMAIL' | translate }}</label>
            <input type="email" [(ngModel)]="form.email" name="email" [placeholder]="'PARTNERS.EMAIL' | translate" />
          </div>
          <div class="form-group">
            <label>{{ 'PARTNERS.PHONE' | translate }}</label>
            <input type="text" [(ngModel)]="form.phone" name="phone" [placeholder]="'PARTNERS.PHONE' | translate" />
          </div>
          <div *ngIf="formMsg" class="status-msg" [class.error]="formError">{{ formMsg }}</div>
          <button type="submit" class="btn-submit" [disabled]="!form.name.trim() || saving">
            {{ saving ? ('COMMON.SAVING' | translate) : (editingSupplier ? ('COMMON.UPDATE' | translate) : ('COMMON.CREATE' | translate)) }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .page-header { margin-bottom: 20px; }
    .page-header h1 { font-size: 26px; font-weight: 800; color: #021024; margin: 0 0 4px; }
    .page-subtitle { color: #5483B3; font-size: 14px; margin: 0; }
    .page-header-row { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; }

    .btn-add {
      display: flex; align-items: center; gap: 6px;
      padding: 10px 20px; border-radius: 10px; border: none;
      background: linear-gradient(135deg, #052659 0%, #5483B3 100%);
      color: white; font-weight: 600; font-size: 14px; cursor: pointer;
      box-shadow: 0 2px 10px rgba(5,38,89,0.25);
      transition: all 0.2s ease;
    }
    .btn-add:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(5,38,89,0.35); }
    .btn-icon { font-size: 18px; font-weight: 700; }

    .search-bar {
      display: flex; align-items: center; gap: 10px;
      background: white; border: 1.5px solid rgba(84,131,179,0.15);
      border-radius: 12px; padding: 10px 16px; margin-bottom: 20px;
      box-shadow: 0 1px 6px rgba(2,16,36,0.05);
      transition: border-color 0.2s;
    }
    .search-bar:focus-within { border-color: #5483B3; box-shadow: 0 0 0 3px rgba(84,131,179,0.1); }
    .search-icon { color: #7DA0CA; display: flex; }
    .search-input {
      flex: 1; border: none; outline: none; font-size: 14px;
      background: transparent; color: #021024; font-family: inherit;
    }
    .search-input::placeholder { color: #b0b0b0; }

    .partner-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px; margin-bottom: 20px;
    }
    .partner-card-shell { display: block; }
    .partner-card {
      background: white; border-radius: 14px; padding: 18px; height: 100%;
      border: 1px solid rgba(84,131,179,0.1);
      box-shadow: 0 2px 10px rgba(2,16,36,0.06);
      transition: transform 220ms cubic-bezier(0.2, 0, 0, 1), box-shadow 0.2s ease, border-color 0.2s ease;
      position: relative; box-sizing: border-box;
    }
    .partner-card:hover:not(.cdk-drag-placeholder):not(.cdk-drag-dragging) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(2,16,36,0.1);
    }
    .partner-card.cdk-drag-preview {
      box-shadow: 0 18px 40px rgba(2,16,36,0.18);
      border-color: rgba(84,131,179,0.35);
      transform: rotate(1.5deg);
    }
    .partner-card.cdk-drag-placeholder {
      opacity: 1;
      border: 1.5px dashed rgba(84,131,179,0.35);
      background: linear-gradient(135deg, rgba(240,246,255,0.96) 0%, rgba(255,255,255,0.96) 100%);
      box-shadow: none;
    }
    .partner-card.cdk-drag-placeholder * { opacity: 0; }
    .partner-card.cdk-drag-animating { transition: transform 220ms cubic-bezier(0.2, 0, 0, 1); }
    .partner-card-shell.cdk-drop-list-receiving .partner-card:not(.cdk-drag-placeholder) {
      border-color: rgba(84,131,179,0.24);
    }

    .partner-card-top { display: flex; align-items: center; gap: 14px; margin-bottom: 10px; }
    .partner-avatar {
      width: 44px; height: 44px; border-radius: 12px;
      background: linear-gradient(135deg, #052659, #5483B3);
      color: white; display: flex; align-items: center; justify-content: center;
      font-size: 15px; font-weight: 700; flex-shrink: 0;
    }
    .partner-avatar.supplier {
      background: linear-gradient(135deg, #7DA0CA, #C1E8FF);
      color: #052659;
    }
    .partner-info { display: flex; flex: 1; flex-direction: column; min-width: 0; }
    .partner-name { font-weight: 700; font-size: 15px; color: #021024; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .partner-meta { font-size: 12px; color: #7DA0CA; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .btn-drag-handle {
      width: 34px; height: 34px; border-radius: 10px; border: none;
      background: rgba(84,131,179,0.08); color: #5483B3;
      display: inline-flex; align-items: center; justify-content: center;
      cursor: grab; flex-shrink: 0; transition: all 0.2s ease;
    }
    .btn-drag-handle:hover { background: rgba(84,131,179,0.16); color: #052659; }
    .btn-drag-handle:active { cursor: grabbing; }
    .btn-drag-handle:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(84,131,179,0.18); }

    .partner-card-actions { display: flex; gap: 6px; margin-bottom: 8px; }
    .btn-action {
      width: 32px; height: 32px; border-radius: 8px; border: none;
      display: flex; align-items: center; justify-content: center; cursor: pointer;
      transition: all 0.2s;
    }
    .btn-action.edit { background: rgba(84,131,179,0.08); color: #052659; }
    .btn-action.edit:hover { background: rgba(84,131,179,0.18); }
    .btn-action.delete { background: rgba(239,68,68,0.06); color: #ef4444; }
    .btn-action.delete:hover { background: rgba(239,68,68,0.15); }

    .partner-date { font-size: 11px; color: #b0b0b0; }

    .empty-state { text-align: center; padding: 40px; }
    .empty-icon { font-size: 48px; margin-bottom: 10px; }
    .empty-state h3 { color: #052659; margin-bottom: 8px; }
    .empty-state p { color: #5483B3; font-size: 14px; }
    .loading-state { text-align: center; padding: 40px; }
    .spinner { width: 36px; height: 36px; margin: 0 auto 12px; border: 3px solid #C1E8FF; border-top: 3px solid #052659; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.45);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; backdrop-filter: blur(3px);
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .modal-card {
      background: white; border-radius: 16px; width: 90%; max-width: 420px;
      padding: 28px; box-shadow: 0 20px 60px rgba(0,0,0,0.2);
      animation: slideUp 0.25s cubic-bezier(0.4,0,0.2,1);
    }
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .modal-header h2 { margin: 0; font-size: 20px; font-weight: 700; color: #021024; }
    .btn-close { background: none; border: none; font-size: 24px; cursor: pointer; color: #7DA0CA; padding: 0; line-height: 1; }
    .btn-close:hover { color: #052659; }
    .modal-form { display: flex; flex-direction: column; gap: 14px; }
    .modal-form .form-group { display: flex; flex-direction: column; gap: 5px; }
    .modal-form label { font-size: 12px; font-weight: 600; color: #5483B3; text-transform: uppercase; letter-spacing: 0.5px; }
    .modal-form input { padding: 10px 14px; border: 1.5px solid #C1E8FF; border-radius: 10px; font-size: 14px; font-family: inherit; color: #021024; transition: border-color 0.2s; }
    .modal-form input:focus { outline: none; border-color: #5483B3; box-shadow: 0 0 0 3px rgba(84,131,179,0.1); }
    .status-msg { padding: 8px 12px; border-radius: 8px; font-size: 13px; font-weight: 500; background: #e9f7ef; color: #1e8449; border: 1px solid #a9dfbf; }
    .status-msg.error { background: #fce7e7; color: #c0392b; border-color: #f5b7b1; }
    .btn-submit {
      padding: 12px; border: none; border-radius: 10px;
      background: linear-gradient(135deg, #052659 0%, #5483B3 100%);
      color: white; font-size: 15px; font-weight: 700; cursor: pointer;
      transition: all 0.2s; box-shadow: 0 2px 10px rgba(5,38,89,0.2);
    }
    .btn-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(5,38,89,0.3); }
    .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class SuppliersDashboardComponent implements OnInit {
  private readonly orderStorageKey = 'tenexa.suppliers.order';

  suppliers: any[] = [];
  filteredSuppliers: any[] = [];
  searchQuery = '';
  loading = true;
  showModal = false;
  editingSupplier: any = null;
  saving = false;
  formMsg = '';
  formError = false;
  draggedSupplierId: string | null = null;
  form = { name: '', email: '', phone: '' };

  constructor(private api: ApiService, private translate: TranslateService) {}

  get supplierDropListIds(): string[] {
    return this.filteredSuppliers.map(supplier => this.getSupplierDropListId(supplier));
  }

  ngOnInit() {
    this.loadSuppliers();
  }

  loadSuppliers() {
    this.loading = true;
    this.api.getSuppliers().subscribe({
      next: (data) => {
        this.suppliers = this.sortSuppliersByStoredOrder(data ?? []);
        this.persistSupplierOrder();
        this.applyFilter();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  onSearch() {
    this.applyFilter();
  }

  applyFilter() {
    const query = this.searchQuery.trim().toLowerCase();

    if (!query) {
      this.filteredSuppliers = [...this.suppliers];
      return;
    }

    this.filteredSuppliers = this.suppliers.filter(supplier =>
      supplier.name?.toLowerCase().includes(query) ||
      supplier.email?.toLowerCase().includes(query) ||
      supplier.phone?.includes(query)
    );
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  }

  trackBySupplierId(index: number, supplier: any): string {
    return supplier?._id ?? `${index}`;
  }

  getSupplierDropListId(supplier: any): string {
    return `supplier-drop-${supplier?._id ?? supplier?.name ?? 'unknown'}`;
  }

  onSupplierDragStarted(supplier: any) {
    this.draggedSupplierId = supplier?._id ?? null;
  }

  onSupplierEntered(event: CdkDragEnter<any>, targetSupplier: any) {
    const draggedSupplier = event.item.data;

    if (!draggedSupplier?._id || draggedSupplier._id === targetSupplier?._id) {
      return;
    }

    const fromIndex = this.filteredSuppliers.findIndex(supplier => supplier._id === draggedSupplier._id);
    const toIndex = this.filteredSuppliers.findIndex(supplier => supplier._id === targetSupplier._id);

    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
      return;
    }

    moveItemInArray(this.filteredSuppliers, fromIndex, toIndex);
    this.syncSuppliersFromFilteredOrder();
  }

  onSupplierDropped(event: CdkDragDrop<any>) {
    if (!event.item.data?._id) {
      return;
    }

    this.persistSupplierOrder();
    this.draggedSupplierId = null;
  }

  onSupplierDragEnded() {
    this.persistSupplierOrder();
    this.draggedSupplierId = null;
  }

  resetForm() {
    this.form = { name: '', email: '', phone: '' };
    this.formMsg = '';
    this.formError = false;
  }

  editSupplier(supplier: any) {
    this.editingSupplier = supplier;
    this.form = { name: supplier.name, email: supplier.email || '', phone: supplier.phone || '' };
    this.formMsg = '';
    this.formError = false;
    this.showModal = true;
  }

  saveSupplier() {
    if (!this.form.name.trim()) {
      this.formMsg = 'Name is required';
      this.formError = true;
      return;
    }

    this.saving = true;
    this.formMsg = '';

    const request = this.editingSupplier
      ? this.api.updateSupplier(this.editingSupplier._id, this.form)
      : this.api.createSupplier(this.form);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.showModal = false;
        this.loadSuppliers();
      },
      error: (err) => {
        this.formMsg = err?.error?.message || 'Failed to save';
        this.formError = true;
        this.saving = false;
      },
    });
  }

  deleteSupplier(id: string) {
    if (!confirm(this.translate.instant('PARTNERS.DELETE_SUPPLIER'))) return;
    this.api.deleteSupplier(id).subscribe(() => this.loadSuppliers());
  }

  private syncSuppliersFromFilteredOrder() {
    const reorderedVisibleSuppliers = [...this.filteredSuppliers];
    const visibleSupplierIds = new Set(reorderedVisibleSuppliers.map(supplier => supplier._id));
    let visibleIndex = 0;

    this.suppliers = this.suppliers.map(supplier =>
      visibleSupplierIds.has(supplier._id) ? reorderedVisibleSuppliers[visibleIndex++] : supplier
    );
  }

  private sortSuppliersByStoredOrder(suppliers: any[]): any[] {
    const storedOrder = this.readStoredOrder();

    if (!storedOrder.length) {
      return [...suppliers];
    }

    const rankById = new Map(storedOrder.map((id, index) => [id, index]));

    return [...suppliers].sort((left, right) => {
      const leftRank = rankById.has(left._id) ? rankById.get(left._id)! : Number.MAX_SAFE_INTEGER;
      const rightRank = rankById.has(right._id) ? rankById.get(right._id)! : Number.MAX_SAFE_INTEGER;
      return leftRank - rightRank;
    });
  }

  private persistSupplierOrder() {
    if (typeof window === 'undefined') {
      return;
    }

    if (!this.suppliers.length) {
      window.localStorage.removeItem(this.orderStorageKey);
      return;
    }

    window.localStorage.setItem(this.orderStorageKey, JSON.stringify(this.suppliers.map(supplier => supplier._id)));
  }

  private readStoredOrder(): string[] {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const rawValue = window.localStorage.getItem(this.orderStorageKey);
      const parsedValue = JSON.parse(rawValue ?? '[]');
      return Array.isArray(parsedValue) ? parsedValue.filter((id): id is string => typeof id === 'string') : [];
    } catch {
      return [];
    }
  }
}
