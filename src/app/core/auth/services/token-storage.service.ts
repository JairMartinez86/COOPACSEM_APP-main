import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const ACCESS = 'access_token';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private platformId = inject(PLATFORM_ID);

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  getAccessToken(): string | null {
    if (!this.isBrowser()) return null;
    return localStorage.getItem(ACCESS);
  }

  setAccessToken(token: string): void {
    if (!this.isBrowser()) return;
    localStorage.setItem(ACCESS, token);
  }

  clear(): void {
    if (!this.isBrowser()) return;
    localStorage.removeItem(ACCESS);
  }
}