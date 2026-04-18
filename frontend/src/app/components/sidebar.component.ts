import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from '../services/theme.service';
import { AuthService } from '../services/auth.service';
import { Observable, map } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslateModule],
  template: `
    <aside class="sidebar" [class.collapsed]="collapsed" [class.dark]="isDarkMode$ | async">
      <div class="sidebar-toggle" (click)="toggle()">
        <span class="toggle-icon">{{ collapsed ? '▶' : '◀' }}</span>
      </div>

      <!-- Dashboard Link -->
      <a class="nav-item dashboard-link" routerLink="/sales" routerLinkActive="active">
        <span class="nav-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
        </span>
        <span class="nav-label" *ngIf="!collapsed">{{ 'NAV.DASHBOARD' | translate }}</span>
      </a>

      <div class="sidebar-sections">
        <ng-container *ngFor="let section of (filteredSections$ | async)">
          <div class="section-title" *ngIf="!collapsed">{{ section.title | translate }}</div>
          <div class="section-divider" *ngIf="collapsed"></div>
          <a *ngFor="let item of section.items"
             class="nav-item"
             [routerLink]="item.route"
             routerLinkActive="active">
            <span class="nav-icon" [innerHTML]="item.icon"></span>
            <span class="nav-label" *ngIf="!collapsed">{{ item.label | translate }}</span>
          </a>
        </ng-container>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar { width: 240px; min-height: calc(100vh - 64px); background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-right: 1px solid rgba(255, 255, 255, 0.1); display: flex; flex-direction: column; padding: 12px 0; transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease; position: relative; overflow: hidden; flex-shrink: 0; box-shadow: 2px 0 16px rgba(0,0,0,0.2); }
    .sidebar.collapsed { width: 64px; }
    .sidebar.dark { box-shadow: 2px 0 16px rgba(0,0,0,0.5); }
    .sidebar-toggle { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 8px; background: rgba(255, 255, 255, 0.15); cursor: pointer; margin: 0 auto 12px; transition: all 0.2s ease; flex-shrink: 0; }
    .sidebar-toggle:hover { background: rgba(255, 255, 255, 0.25); transform: scale(1.05); }
    .toggle-icon { font-size: 10px; color: #ffffff; line-height: 1; }
    .sidebar-sections { flex: 1; display: flex; flex-direction: column; gap: 2px; overflow-y: auto; padding: 0 8px; }
    .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(255, 255, 255, 0.7); padding: 16px 12px 6px; white-space: nowrap; overflow: hidden; }
    .section-divider { height: 1px; background: rgba(255, 255, 255, 0.15); margin: 8px 12px; }
    .nav-item { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 10px; text-decoration: none; color: rgba(255, 255, 255, 0.85); font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s ease; white-space: nowrap; position: relative; overflow: hidden; }
    .nav-item:hover { background: rgba(255, 255, 255, 0.15); color: #ffffff; transform: translateX(2px); }
    .nav-item.active { background: rgba(255, 255, 255, 0.25); color: #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.1); font-weight: 600; }
    .nav-item.active::before { content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 4px; height: 60%; background: #ffffff; border-radius: 0 3px 3px 0; }
    .nav-icon { display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; flex-shrink: 0; }
    .nav-icon svg { width: 20px; height: 20px; }
    .nav-label { opacity: 1; transition: opacity 0.2s ease; }
    .sidebar.collapsed .nav-label { opacity: 0; width: 0; overflow: hidden; }
    .dashboard-link { margin: 0 8px 4px; font-weight: 600; }
    .sidebar.collapsed .nav-item { justify-content: center; padding: 10px; }
    @media (max-width: 768px) { .sidebar { position: fixed; left: 0; top: 64px; z-index: 90; box-shadow: 4px 0 24px rgba(0,0,0,0.3); } .sidebar.collapsed { width: 0; padding: 0; border: none; overflow: hidden; } }
  `],
})
export class SidebarComponent implements OnInit {
  collapsed = false;
  isDarkMode$: Observable<boolean>;
  filteredSections$: Observable<NavSection[]>;

  private sections: NavSection[] = [
    {
      title: 'NAV.DOCUMENTS',
      items: [
        { label: 'NAV.SALES', route: '/sales', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' },
        { label: 'NAV.PURCHASES', route: '/purchases', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>' },
      ],
    },
    {
      title: 'NAV.PARTNERS',
      items: [
        { label: 'NAV.CUSTOMERS', route: '/customers', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' },
        { label: 'NAV.SUPPLIERS', route: '/suppliers', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>' },
      ],
    },
    {
      title: 'NAV.ANALYTICS',
      items: [
        { label: 'NAV.REPORTS', route: '/report', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>' },
      ],
    },
    {
      title: 'NAV.AI',
      items: [
        { label: 'NAV.PREDICTIONS', route: '/assistant', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12"/><path d="M12 6v6l4 2"/><circle cx="12" cy="12" r="1"/></svg>' },
      ],
    },
    {
      title: 'NAV.ACCOUNTANT_SECTION',
      items: [
        { label: 'NAV.REQUESTS', route: '/purchase-requests', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>' },
        { label: 'NAV.HISTORY', route: '/purchase-history', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>' },
      ],
    },
  ];

  constructor(private themeService: ThemeService, private authService: AuthService) {
    this.isDarkMode$ = this.themeService.isDarkMode$;
    this.filteredSections$ = this.authService.currentUserRole$.pipe(
      map(role => {
        return this.sections.filter(section => {
          if (section.title === 'NAV.ACCOUNTANT_SECTION') return role === 'Accountant';
          return true;
        });
      })
    );
  }

  ngOnInit() {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved === 'true') this.collapsed = true;
  }

  toggle() {
    this.collapsed = !this.collapsed;
    localStorage.setItem('sidebar-collapsed', String(this.collapsed));
  }
}
