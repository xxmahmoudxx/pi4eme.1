import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api.service';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, TranslateModule, FormsModule],
  template: `
    <div class="page-header">
      <h1>{{ 'ADMIN.TITLE' | translate }}</h1>
      <p class="page-subtitle">Manage users, roles, and account statuses</p>
    </div>

    <div class="card">
      <div class="filters">
        <div class="search-wrap">
          <span class="search-icon">🔍</span>
          <input type="text" [(ngModel)]="searchTerm" [placeholder]="'ADMIN.SEARCH_PLACEHOLDER' | translate" class="search-input" />
        </div>
        <select [(ngModel)]="roleFilter" class="role-select">
          <option value="">{{ 'ADMIN.ALL_ROLES' | translate }}</option>
          <option value="Admin">{{ 'ADMIN.ADMIN_ROLE' | translate }}</option>
          <option value="CompanyOwner">{{ 'ADMIN.OWNER_ROLE' | translate }}</option>
          <option value="Accountant">{{ 'ADMIN.ACCOUNTANT_ROLE' | translate }}</option>
        </select>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th (click)="sort('companyId')">{{ 'ADMIN.COMPANY_ID' | translate }} <span class="sort-arrow">↕</span></th>
            <th (click)="sort('name')">{{ 'ADMIN.NAME' | translate }} <span class="sort-arrow">↕</span></th>
            <th (click)="sort('email')">{{ 'ADMIN.EMAIL' | translate }} <span class="sort-arrow">↕</span></th>
            <th (click)="sort('role')">{{ 'ADMIN.ROLE' | translate }} <span class="sort-arrow">↕</span></th>
            <th>{{ 'ADMIN.STATUS' | translate }}</th>
            <th>{{ 'ADMIN.ACTIONS' | translate }}</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let user of filteredUsers()">
            <td><code class="company-id">{{ user.companyId }}</code></td>
            <td><strong>{{ user.name }}</strong></td>
            <td class="muted">{{ user.email }}</td>
            <td><span class="role-chip">{{ user.role }}</span></td>
            <td>
              <span [class]="'status-chip ' + (user.status === 'active' ? 'active' : 'inactive')">
                {{ user.status }}
              </span>
            </td>
            <td class="actions-cell">
              <button class="btn-action" (click)="toggleStatus(user)">
                {{ user.status === 'active' ? ('ADMIN.DEACTIVATE' | translate) : ('ADMIN.ACTIVATE' | translate) }}
              </button>
              <button class="btn-action danger" (click)="deleteUser(user)">
                {{ 'ADMIN.DELETE' | translate }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .page-header { margin-bottom: 24px; }
    .page-header h1 { font-size: 26px; font-weight: 800; color: #021024; margin: 0 0 6px; }
    .page-subtitle { color: #5483B3; font-size: 14px; margin: 0; }

    .filters {
      display: flex; gap: 14px; margin-bottom: 20px; flex-wrap: wrap;
    }
    .search-wrap {
      flex: 1; display: flex; align-items: center; gap: 10px;
      background: #f9fdff;
      border: 1.5px solid #C1E8FF;
      border-radius: 8px; padding: 0 14px;
      min-width: 200px;
    }
    .search-icon { font-size: 16px; }
    .search-input {
      flex: 1; border: none; background: transparent;
      padding: 11px 0; font-size: 14px; font-family: inherit;
      color: #021024; outline: none;
    }
    .role-select {
      padding: 11px 14px; border-radius: 8px;
      border: 1.5px solid #C1E8FF;
      background: #f9fdff; color: #021024;
      font-size: 14px; font-family: inherit; outline: none;
      cursor: pointer;
    }
    .role-select:focus { border-color: #5483B3; }

    th { cursor: pointer; user-select: none; }
    .sort-arrow { color: #7DA0CA; font-size: 12px; margin-left: 4px; }

    .company-id {
      font-family: monospace; font-size: 12px;
      background: #f0f6ff; padding: 2px 6px;
      border-radius: 4px; color: #052659;
    }
    .muted { color: #5483B3; }

    .role-chip {
      display: inline-block; padding: 3px 10px; border-radius: 6px;
      background: #C1E8FF; color: #052659;
      font-size: 11px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.3px;
    }
    .status-chip {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 4px 12px; border-radius: 999px;
      font-size: 11px; font-weight: 700; text-transform: uppercase;
    }
    .status-chip::before { content: ''; width: 6px; height: 6px; border-radius: 50%; }
    .status-chip.active { background: #e9f7ef; color: #1e8449; border: 1px solid #a9dfbf; }
    .status-chip.active::before { background: #1e8449; }
    .status-chip.inactive { background: #fce7e7; color: #c0392b; border: 1px solid #f5b7b1; }
    .status-chip.inactive::before { background: #c0392b; }

    .actions-cell { display: flex; gap: 8px; align-items: center; }
    .btn-action {
      padding: 6px 14px; border-radius: 6px; border: 1.5px solid #5483B3;
      background: transparent; color: #052659;
      font-size: 12px; font-weight: 600; font-family: inherit;
      cursor: pointer; transition: all 0.15s; white-space: nowrap;
    }
    .btn-action:hover { background: #C1E8FF; }
    .btn-action.danger { border-color: #f5b7b1; color: #c0392b; }
    .btn-action.danger:hover { background: #fce7e7; }
  `]
})
export class AdminPanelComponent implements OnInit {
  users: any[] = [];
  searchTerm = '';
  roleFilter = '';
  sortKey = 'name';
  sortOrder: 'asc' | 'desc' = 'asc';

  constructor(private api: ApiService) { }

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.api.getAllUsers().subscribe(users => {
      this.users = users;
    });
  }

  filteredUsers() {
    return this.users
      .filter(u => {
        const matchesSearch = (u.name || '').toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          (u.email || '').toLowerCase().includes(this.searchTerm.toLowerCase());
        const matchesRole = this.roleFilter ? u.role === this.roleFilter : true;
        return matchesSearch && matchesRole;
      })
      .sort((a, b) => {
        const valA = a[this.sortKey] || '';
        const valB = b[this.sortKey] || '';
        if (valA < valB) return this.sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return this.sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }

  sort(key: string) {
    if (this.sortKey === key) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortOrder = 'asc';
    }
  }

  toggleStatus(user: any) {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    this.api.updateUserStatus(user._id, newStatus).subscribe(() => {
      user.status = newStatus;
    });
  }

  deleteUser(user: any) {
    if (confirm('ADMIN.DELETE_CONFIRM')) {
      this.api.deleteUser(user._id).subscribe({
        next: () => {
          alert('ADMIN.DELETE_SUCCESS');
          this.loadUsers();
        },
        error: () => {
          alert('ADMIN.DELETE_FAILED');
        }
      });
    }
  }
}
