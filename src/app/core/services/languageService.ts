import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';

export type AppLang = 'es' | 'en';

export interface AvailableLanguage {
  code: string;
  file: string;
  language: string;
  country: string;
  icon: string;
}

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private translate = inject(TranslateService);
  private platformId = inject(PLATFORM_ID);

  private readonly STORAGE_KEY = 'lang';
  private readonly SUPPORTED_LANGS: AppLang[] = ['es', 'en'];
  private readonly DEFAULT_LANG: AppLang = 'es';

  init(): void {
    const lang = this.getInitialLang();
    this.translate.use(lang);

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.STORAGE_KEY, lang);
    }
  }

  changeLang(lang: AppLang): void {
    if (!this.SUPPORTED_LANGS.includes(lang)) return;

    this.translate.use(lang);

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.STORAGE_KEY, lang);
    }
  }

  getCurrentLang(): AppLang {
    const current = this.translate.currentLang as AppLang | undefined;

    return this.SUPPORTED_LANGS.includes(current as AppLang)
      ? (current as AppLang)
      : this.DEFAULT_LANG;
  }

  getAvailableLanguages(): AvailableLanguage[] {
    const langs = this.translate.instant('navbar.languages') || {};

    return Object.entries(langs).map(([code, data]: [string, any]) => ({
      code,
      file: data?.file ?? '',
      language: data?.language ?? '',
      country: data?.country ?? '',
      icon: data?.icon ?? ''
    }));
  }

  private getInitialLang(): AppLang {
    if (!isPlatformBrowser(this.platformId)) {
      return this.DEFAULT_LANG;
    }

    const savedLang = localStorage.getItem(this.STORAGE_KEY) as AppLang | null;

    if (savedLang && this.SUPPORTED_LANGS.includes(savedLang)) {
      return savedLang;
    }

    return this.DEFAULT_LANG;
  }
}