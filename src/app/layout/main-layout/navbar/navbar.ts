import {
  Component,
  DOCUMENT,
  EventEmitter,
  Inject,
  OnDestroy,
  OnInit,
  Output,
  PLATFORM_ID,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth/services/auth.service';
import { AppStateService } from '../../../core/services/app-state.service';
import { LanguageService } from '../../../core/services/languageService';
import { ThemeService } from '../../../core/services/theme.service';
import { AppPermissionDirective } from '../../../core/services/app-permission.directive';

type AppLang = 'es' | 'en';

interface LanguageItem {
  code: AppLang;
  file: string;
  language: string;
  country: string;
  icon: string;
}

@Component({
  standalone: true,
  selector: 'app-navbar',
  imports: [CommonModule, TranslateModule, AppPermissionDirective, RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar implements OnInit, OnDestroy {
  public appState = inject(AppStateService);
  private auth = inject(AuthService);
  private translate = inject(TranslateService);
  private langService = inject(LanguageService);
  private themeService = inject(ThemeService);

  private subs = new Subscription();

  public user: any = null;

  @Output() sidebarToggle = new EventEmitter<void>();
  @Output() requestCloseSidebar = new EventEmitter<void>();

  languages: LanguageItem[] = [];
  currentLangCode: AppLang = 'es';
  currentLang: LanguageItem | null = null;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const raw = localStorage.getItem('user');

      if (raw) {
        try {
          this.user = JSON.parse(raw);
        } catch {
          this.user = null;
          localStorage.removeItem('user');
        }
      }
    }

    const theme = (this.user?.theme || 'light') as 'light' | 'dark';
    this.themeService.setTheme(theme);

    this.loadLanguages();

    this.subs.add(
      this.translate.onLangChange.subscribe(() => {
        this.loadLanguages();
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  get currentUsername(): string {
    return this.user?.user || this.user?.username || '';
  }

  private logoError = signal(false);

  headerLogoSrc = computed(() => {
    const logo = this.appState.logoUrl()?.trim();

    if (this.logoError() || !logo) {
      return 'assets/img/logo.webp';
    }

    return logo;
  });

  onHeaderLogoError(): void {
    this.logoError.set(true);
  }

  private loadLanguages(): void {
    this.currentLangCode = this.langService.getCurrentLang();

    this.translate.get('navbar.languages').subscribe((langs: any) => {
      if (!langs || typeof langs !== 'object') {
        this.languages = [];
        this.currentLang = null;
        return;
      }

      this.languages = Object.keys(langs).map((code) => ({
        code: code as AppLang,
        file: langs[code]?.file ?? '',
        language: langs[code]?.language ?? '',
        country: langs[code]?.country ?? '',
        icon: langs[code]?.icon ?? ''
      }));

      this.currentLang =
        this.languages.find(x => x.code === this.currentLangCode) ?? null;
    });
  }

  private query(selector: string): HTMLElement | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return this.document.querySelector(selector) as HTMLElement | null;
  }

  private safePreventDefault(event?: Event): void {
    if (!event) return;

    try {
      event.preventDefault();
    } catch {
      // hydration replay
    }
  }

  private closeMobileMenuPanel(): void {
    const mobileMenu = this.query('.mobile-header-menu');
    const mobileMenuButton = this.query('.mobile-menu-toggle');

    mobileMenu?.classList.remove('active');
    mobileMenuButton?.classList.remove('active');
  }

  private closeMobileSearchPanel(): void {
    const mobileSearch = this.query('.mobile-search');
    mobileSearch?.classList.remove('active');
  }

  private closeFloatingPanels(): void {
    this.closeMobileMenuPanel();
    this.closeMobileSearchPanel();
  }

  changeLanguage(lang: AppLang, event?: Event): void {
    this.safePreventDefault(event);
    event?.stopPropagation();

    if (lang === this.currentLangCode) return;

    this.closeFloatingPanels();
    this.langService.changeLang(lang);
  }

  trackByLang(_: number, item: LanguageItem): string {
    return item.code;
  }

  toggleMenu(event?: Event): void {
    event?.stopPropagation();
    this.closeFloatingPanels();
    this.sidebarToggle.emit();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  toggleMobileMenu(event: Event): void {
    event.stopPropagation();

    const button = event.currentTarget as HTMLElement | null;
    const mobileMenu = this.query('.mobile-header-menu');

    if (!button || !mobileMenu) return;

    this.closeMobileSearchPanel();

    const willOpen = !mobileMenu.classList.contains('active');

    button.classList.toggle('active', willOpen);
    mobileMenu.classList.toggle('active', willOpen);
  }

  toggleSearch(event?: Event): void {
    event?.stopPropagation();

    const mobileSearch = this.query('.mobile-search');
    if (!mobileSearch) return;

    this.closeMobileMenuPanel();

    const willOpen = !mobileSearch.classList.contains('active');
    mobileSearch.classList.toggle('active', willOpen);
  }

  onNavigate(): void {
    this.closeFloatingPanels();
    this.requestCloseSidebar.emit();
  }

  logout(event?: Event): void {
    this.safePreventDefault(event);
    event?.stopPropagation();

    this.closeFloatingPanels();
    this.requestCloseSidebar.emit();
    this.auth.logout();
  }
}