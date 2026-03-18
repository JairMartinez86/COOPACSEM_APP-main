import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AppStateService {
  appName = signal('Mi Empresa S.A.');
  appYear = signal(new Date().getFullYear());
  logoUrl = signal('');
  logoFileName = signal('');

  setAppName(name: string | null | undefined): void {
    this.appName.set(name?.trim() || 'Mi Empresa S.A.');
  }

  setLogo(url: string | null | undefined, fileName?: string | null | undefined): void {
    this.logoUrl.set(url?.trim() || '');
    this.logoFileName.set(fileName?.trim() || '');
  }

  setPublicSettings(data: any): void {
    this.setAppName(data?.companyName);
    this.setLogo(data?.logoUrl, data?.logoFileName);
  }

  clearLogo(): void {
    this.logoUrl.set('');
    this.logoFileName.set('');
  }
}