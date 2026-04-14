import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageService } from './services/language.service';
import { ThemeService } from './services/theme.service';
import { ChatbotComponent } from './components/chatbot.component';
import { SidebarComponent } from './components/sidebar.component';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, TranslateModule, ChatbotComponent, SidebarComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  showNavigation = false;
  isAdmin$ = this.authService.isAdmin$;
  isDarkMode$: Observable<boolean>;

  constructor(
    private authService: AuthService,
    private router: Router,
    private languageService: LanguageService,
    private themeService: ThemeService,
    private translateService: TranslateService
  ) {
    this.isDarkMode$ = this.themeService.isDarkMode$;
  }

  get currentLang() {
    return this.languageService.getCurrentLanguage();
  }

  get isDarkMode() {
    return this.themeService.isDarkMode();
  }

  ngOnInit() {
    this.authService.isLoggedIn$.subscribe((loggedIn) => {
      this.showNavigation = loggedIn;
    });

    // Initialize theme and language
    this.initializeApp();
  }

  private initializeApp(): void {
    // Set initial language
    const savedLang = localStorage.getItem('language') || 'en';
    this.translateService.setDefaultLang(savedLang);
    this.translateService.use(savedLang);
    
    // Apply RTL for Arabic
    if (savedLang === 'ar') {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.lang = 'ar';
    } else {
      document.documentElement.setAttribute('dir', 'ltr');
      document.documentElement.lang = savedLang;
    }
  }

  changeLang(lang: string) {
    this.languageService.setLanguage(lang);
    this.translateService.use(lang);
    
    // Apply RTL for Arabic
    if (lang === 'ar') {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.lang = 'ar';
    } else {
      document.documentElement.setAttribute('dir', 'ltr');
      document.documentElement.lang = lang;
    }
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
