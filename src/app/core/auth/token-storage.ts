import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const ACCESS = 'access_token';
const REFRESH = 'refresh_token';

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

  getRefreshToken(): string | null {
    if (!this.isBrowser()) return null;
    return localStorage.getItem(REFRESH);
  }

  setAccessToken(access: string): void {
    if (!this.isBrowser()) return;
    localStorage.setItem(ACCESS, access);
  }

  setRefreshToken(refresh: string): void {
    if (!this.isBrowser()) return;
    localStorage.setItem(REFRESH, refresh);
  }

  setTokens(access: string, refresh: string): void {
    if (!this.isBrowser()) return;
    localStorage.setItem(ACCESS, access);
    localStorage.setItem(REFRESH, refresh);
  }

  clear(): void {
    if (!this.isBrowser()) return;
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
  }

  // 👇 Nuevo: limpieza completa de sesión local + marca de force-logout
  performLocalLogout(): void {
    if (!this.isBrowser()) return;

    this.clear();

    localStorage.removeItem('pending_2fa_identifier');
    localStorage.removeItem('pending_2fa_expires_at');
    localStorage.removeItem('pending_2fa_server_now');
    localStorage.removeItem('dev_2fa_code');
    localStorage.removeItem('user');
    localStorage.removeItem('permissions');
    sessionStorage.removeItem('user');
    sessionStorage.setItem('force-logout', '1');
  }
}