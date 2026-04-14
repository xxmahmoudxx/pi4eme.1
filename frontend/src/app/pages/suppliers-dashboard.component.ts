import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-suppliers-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h1>Suppliers</h1>
          <p class="page-subtitle">Manage your supplier database</p>
        </div>
        <button class="btn-add" (click)="showModal = true; editingSupplier = null; resetForm()">
          <span class="btn-icon">+</span> Add Supplier
        </button>
      </div>
    </div>

    <!-- Search -->
    <div class="search-bar">
      <span class="search-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </span>
      <input type="text" [(ngModel)]="searchQuery" (input)="onSearch()" placeholder="Search suppliers..." class="search-input" />
    </div>

    <!-- Supplier Cards -->
    <div class="partner-grid" *ngIf="filteredSuppliers.length > 0">
      <div class="partner-card" *ngFor="let s of filteredSuppliers">
        <div class="partner-card-top">
          <div class="partner-avatar supplier">{{ getInitials(s.name) }}</div>
          <div class="partner-info">
            <span class="partner-name">{{ s.name }}</span>
            <span class="partner-meta" *ngIf="s.email">{{ s.email }}</span>
            <span class="partner-meta" *ngIf="s.phone">{{ s.phone }}</span>
          </div>
        </div>
        <div class="partner-card-actions">
          <button class="btn-action edit" (click)="editSupplier(s)" title="Edit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-action delete" (click)="deleteSupplier(s._id)" title="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
        <div class="partner-date">Added {{ s.createdAt | date:'mediumDate' }}</div>
      </div>
    </div>

    <div class="empty-state card" *ngIf="!loading && filteredSuppliers.length === 0">
      <div class="empty-icon">🏭</div>
      <h3>No suppliers yet</h3>
      <p>Add your first supplier to get started.</p>
    </div>

    <div class="card loading-state" *ngIf="loading">
      <div class="spinner"></div><p>Loading suppliers...</p>
    </div>

    <!-- Modal -->
    <div class="modal-overlay" *ngIf="showModal" (click)="showModal = false">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>{{ editingSupplier ? 'Edit Supplier' : 'Add Supplier' }}</h2>
          <button class="btn-close" (click)="showModal = false">&times;</button>
        </div>
        <form (ngSubmit)="saveSupplier()" class="modal-form">
          <div class="form-group">
            <label>Name *</label>
            <input type="text" [(ngModel)]="form.name" name="name" required placeholder="Supplier name" />
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" [(ngModel)]="form.email" name="email" placeholder="email@example.com (optional)" />
          </div>
          <div class="form-group">
            <label>Phone</label>
            <input type="text" [(ngModel)]="form.phone" name="phone" placeholder="+1 234 567 890 (optional)" />
          </div>
          <div *ngIf="formMsg" class="status-msg" [class.error]="formError">{{ formMsg }}</div>
          <button type="submit" class="btn-submit" [disabled]="!form.name?.trim() || saving">
            {{ saving ? 'Saving...' : (editingSupplier ? 'Update' : 'Create') }}
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
    .partner-card {
      background: white; border-radius: 14px; padding: 18px;
      border: 1px solid rgba(84,131,179,0.1);
      box-shadow: 0 2px 10px rgba(2,16,36,0.06);
      transition: all 0.2s ease; position: relative;
    }
    .partner-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(2,16,36,0.1); }

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
    .partner-info { display: flex; flex-direction: column; min-width: 0; }
    .partner-name { font-weight: 700; font-size: 15px; color: #021024; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .partner-meta { font-size: 12px; color: #7DA0CA; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

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

    /* Modal */
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
  suppliers: any[] = [];
  filteredSuppliers: any[] = [];
  searchQuery = '';
  loading = true;
  showModal = false;
  editingSupplier: any = null;
  saving = false;
  formMsg = '';
  formError = false;
  form = { name: '', email: '', phone: '' };

  constructor(private api: ApiService) {}

  ngOnInit() { this.loadSuppliers(); }

  loadSuppliers() {
    this.loading = true;
    this.api.getSuppliers().subscribe({
      next: (data) => { this.suppliers = data; this.applyFilter(); this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  onSearch() {
    this.applyFilter();
  }

  applyFilter() {
    if (!this.searchQuery.trim()) {
      this.filteredSuppliers = this.suppliers;
    } else {
      const q = this.searchQuery.toLowerCase();
      this.filteredSuppliers = this.suppliers.filter(s =>
        s.name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.phone?.includes(q)
      );
    }
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  resetForm() {
    this.form = { name: '', email: '', phone: '' };
    this.formMsg = '';
    this.formError = false;
  }

  editSupplier(s: any) {
    this.editingSupplier = s;
    this.form = { name: s.name, email: s.email || '', phone: s.phone || '' };
    this.formMsg = '';
    this.formError = false;
    this.showModal = true;
  }

  saveSupplier() {
    if (!this.form.name?.trim()) {
      this.formMsg = 'Name is required';
      this.formError = true;
      return;
    }
    this.saving = true;
    this.formMsg = '';

    const obs = this.editingSupplier
      ? this.api.updateSupplier(this.editingSupplier._id, this.form)
      : this.api.createSupplier(this.form);

    obs.subscribe({
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
    if (!confirm('Delete this supplier?')) return;
    this.api.deleteSupplier(id).subscribe(() => this.loadSuppliers());
  }
}
