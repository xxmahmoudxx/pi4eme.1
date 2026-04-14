import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from '../services/theme.service';
import { Observable } from 'rxjs';

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
  imports: [CommonModule, RouterLink, RouterLinkActive],
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
        <span class="nav-label" *ngIf="!collapsed">Dashboard</span>
      </a>

      <div class="sidebar-sections">
        <ng-container *ngFor="let section of sections">
          <div class="section-title" *ngIf="!collapsed">{{ section.title }}</div>
          <div class="section-divider" *ngIf="collapsed"></div>
          <a *ngFor="let item of section.items"
             class="nav-item"
             [routerLink]="item.route"
             routerLinkActive="active">
            <span class="nav-icon" [innerHTML]="item.icon"></span>
            <span class="nav-label" *ngIf="!collapsed">{{ item.label }}</span>
          </a>
        </ng-container>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 240px;
      min-height: calc(100vh - 64px);
      background: #ffffff;
      border-right: 1px solid rgba(84,131,179,0.12);
      display: flex;
      flex-direction: column;
      padding: 12px 0;
      transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease;
      position: relative;
      overflow: hidden;
      flex-shrink: 0;
      box-shadow: 2px 0 16px rgba(2,16,36,0.04);
    }

    .sidebar.collapsed {
      width: 64px;
    }

    .sidebar.dark {
      background: #1a1a1a;
      border-right-color: #333;
      box-shadow: 2px 0 16px rgba(0,0,0,0.3);
    }

    .sidebar-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: rgba(84,131,179,0.08);
      cursor: pointer;
      margin: 0 auto 12px;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }
    .sidebar-toggle:hover {
      background: rgba(84,131,179,0.15);
      transform: scale(1.05);
    }
    .toggle-icon {
      font-size: 10px;
      color: #5483B3;
      line-height: 1;
    }
    .sidebar.dark .toggle-icon { color: #b0b0b0; }
    .sidebar.dark .sidebar-toggle { background: rgba(255,255,255,0.06); }
    .sidebar.dark .sidebar-toggle:hover { background: rgba(255,255,255,0.12); }

    .sidebar-sections {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow-y: auto;
      padding: 0 8px;
    }

    .section-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #7DA0CA;
      padding: 16px 12px 6px;
      white-space: nowrap;
      overflow: hidden;
    }
    .sidebar.dark .section-title { color: #808080; }

    .section-divider {
      height: 1px;
      background: rgba(84,131,179,0.1);
      margin: 8px 12px;
    }
    .sidebar.dark .section-divider { background: rgba(255,255,255,0.06); }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      border-radius: 10px;
      text-decoration: none;
      color: #052659;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
      position: relative;
      overflow: hidden;
    }
    .nav-item:hover {
      background: rgba(84,131,179,0.08);
      color: #052659;
      transform: translateX(2px);
    }
    .nav-item.active {
      background: linear-gradient(135deg, rgba(5,38,89,0.1) 0%, rgba(84,131,179,0.12) 100%);
      color: #052659;
      font-weight: 600;
    }
    .nav-item.active::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 60%;
      background: linear-gradient(180deg, #052659, #5483B3);
      border-radius: 0 3px 3px 0;
    }

    .sidebar.dark .nav-item { color: #e0e0e0; }
    .sidebar.dark .nav-item:hover { background: rgba(255,255,255,0.06); color: #ffffff; }
    .sidebar.dark .nav-item.active {
      background: linear-gradient(135deg, rgba(102,126,234,0.15) 0%, rgba(118,75,162,0.12) 100%);
      color: #ffffff;
    }
    .sidebar.dark .nav-item.active::before {
      background: linear-gradient(180deg, #667eea, #764ba2);
    }

    .nav-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }
    .nav-icon svg {
      width: 20px;
      height: 20px;
    }

    .nav-label {
      opacity: 1;
      transition: opacity 0.2s ease;
    }
    .sidebar.collapsed .nav-label { opacity: 0; width: 0; overflow: hidden; }

    .dashboard-link {
      margin: 0 8px 4px;
      font-weight: 600;
    }

    .sidebar.collapsed .nav-item {
      justify-content: center;
      padding: 10px;
    }
    .sidebar.collapsed .section-title { display: none; }

    @media (max-width: 768px) {
      .sidebar {
        position: fixed;
        left: 0;
        top: 64px;
        z-index: 90;
        box-shadow: 4px 0 24px rgba(0,0,0,0.15);
      }
      .sidebar.collapsed {
        width: 0;
        padding: 0;
        border: none;
        overflow: hidden;
      }
    }
  `],
})
export class SidebarComponent implements OnInit {
  collapsed = false;
  isDarkMode$: Observable<boolean>;

  sections: NavSection[] = [
    {
      title: 'Documents',
      items: [
        { label: 'Sales', route: '/sales', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' },
        { label: 'Purchases', route: '/purchases', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>' },
      ],
    },
    {
      title: 'Partners',
      items: [
        { label: 'Customers', route: '/customers', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' },
        { label: 'Suppliers', route: '/suppliers', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>' },
      ],
    },
    {
      title: 'Analytics',
      items: [
        { label: 'Reports', route: '/report', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>' },
      ],
    },
    {
      title: 'AI',
      items: [
        { label: 'Predictions', route: '/assistant', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12"/><path d="M12 6v6l4 2"/><circle cx="12" cy="12" r="1"/></svg>' },
      ],
    },
  ];

  constructor(private themeService: ThemeService) {
    this.isDarkMode$ = this.themeService.isDarkMode$;
  }

  ngOnInit() {
    // Restore collapsed state
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved === 'true') this.collapsed = true;
  }

  toggle() {
    this.collapsed = !this.collapsed;
    localStorage.setItem('sidebar-collapsed', String(this.collapsed));
  }
}
