import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export const COLOR_THEMES: Record<string, Record<string, string>> = {
  default: {
    '--c-darkest': '#021024',
    '--c-dark': '#052659',
    '--c-mid': '#5483B3',
    '--c-light': '#7DA0CA',
    '--c-lightest': '#C1E8FF',
  },
  emerald: {
    '--c-darkest': '#022c22',
    '--c-dark': '#065f46',
    '--c-mid': '#10b981',
    '--c-light': '#6ee7b7',
    '--c-lightest': '#d1fae5',
  },
  sunset: {
    '--c-darkest': '#431407',
    '--c-dark': '#9a3412',
    '--c-mid': '#f97316',
    '--c-light': '#fdba74',
    '--c-lightest': '#ffedd5',
  },
  purple: {
    '--c-darkest': '#2e1065',
    '--c-dark': '#5b21b6',
    '--c-mid': '#8b5cf6',
    '--c-light': '#c4b5fd',
    '--c-lightest': '#ede9fe',
  }
};

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private isDarkModeSubject = new BehaviorSubject<boolean>(this.getInitialTheme());
  isDarkMode$ = this.isDarkModeSubject.asObservable();

  private colorThemeSubject = new BehaviorSubject<string>(this.getInitialColorTheme());
  colorTheme$ = this.colorThemeSubject.asObservable();

  constructor() {
    this.applyTheme(this.isDarkModeSubject.value);
    this.applyColorTheme(this.colorThemeSubject.value);
  }

  private getInitialTheme(): boolean {
    const saved = localStorage.getItem('theme-preference');
    if (saved) {
      return saved === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  private getInitialColorTheme(): string {
    return localStorage.getItem('color-theme') || 'default';
  }

  toggleTheme(): void {
    const newTheme = !this.isDarkModeSubject.value;
    this.setTheme(newTheme);
  }

  setTheme(isDark: boolean): void {
    this.isDarkModeSubject.next(isDark);
    localStorage.setItem('theme-preference', isDark ? 'dark' : 'light');
    this.applyTheme(isDark);
  }

  setColorTheme(themeName: string): void {
    if (!COLOR_THEMES[themeName]) return;
    this.colorThemeSubject.next(themeName);
    localStorage.setItem('color-theme', themeName);
    this.applyColorTheme(themeName);
  }

  private applyTheme(isDark: boolean): void {
    const root = document.documentElement;
    
    if (isDark) {
      root.classList.add('dark-theme');
      root.classList.remove('light-theme');
    } else {
      root.classList.add('light-theme');
      root.classList.remove('dark-theme');
    }

    this.setCSSVariables(isDark);
  }

  private applyColorTheme(themeName: string): void {
    const root = document.documentElement;
    const themeParams = COLOR_THEMES[themeName] || COLOR_THEMES['default'];
    
    Object.entries(themeParams).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }

  private setCSSVariables(isDark: boolean): void {
    const root = document.documentElement;
    
    if (isDark) {
      root.style.setProperty('--bg-primary', '#1a1a1a');
      root.style.setProperty('--bg-secondary', '#2d2d2d');
      root.style.setProperty('--bg-tertiary', '#3a3a3a');
      root.style.setProperty('--text-primary', '#ffffff');
      root.style.setProperty('--text-secondary', '#b0b0b0');
      root.style.setProperty('--border-color', '#404040');
      root.style.setProperty('--shadow-color', 'rgba(0, 0, 0, 0.5)');
    } else {
      root.style.setProperty('--bg-primary', '#ffffff');
      root.style.setProperty('--bg-secondary', '#f5f5f5');
      root.style.setProperty('--bg-tertiary', '#eeeeee');
      root.style.setProperty('--text-primary', '#1a1a1a');
      root.style.setProperty('--text-secondary', '#666666');
      root.style.setProperty('--border-color', '#e0e0e0');
      root.style.setProperty('--shadow-color', 'rgba(0, 0, 0, 0.1)');
    }
  }

  isDarkMode(): boolean {
    return this.isDarkModeSubject.value;
  }
}
