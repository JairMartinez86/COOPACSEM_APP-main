import { isPlatformBrowser } from "@angular/common";
import { DOCUMENT, Inject, Injectable, PLATFORM_ID } from "@angular/core";
import { BehaviorSubject } from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class ThemeService {

  private theme$ = new BehaviorSubject<string>('light');

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    @Inject(DOCUMENT) private document: Document
  ) {

    if (isPlatformBrowser(this.platformId)) {

      const saved = localStorage.getItem('theme') || 'light';
      this.setTheme(saved);

    }

  }

  setTheme(theme: string) {

    const html = this.document.documentElement;

    if (theme === 'dark') {
      html.setAttribute('data-theme', 'dark');
    } else {
      html.removeAttribute('data-theme');
    }

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('theme', theme);
    }

    this.theme$.next(theme);
  }

  toggleTheme() {

    const current = this.theme$.value;
    const next = current === 'dark' ? 'light' : 'dark';

    this.setTheme(next);
  }

  getTheme() {
    return this.theme$.asObservable();
  }

}