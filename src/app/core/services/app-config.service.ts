import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { ApiConfigService } from './ApiConfigService ';

export interface AppRegionalConfig {
  companyName: string;
  logoUrl: string;
  logoFileName: string;
  dateFormat: string;
  currency: string;
  decimalSeparator: string;
  thousandSeparator: string;
}

export interface PublicSettingsResponse {
  ok: boolean;
  codigo: number;
  data: Partial<AppRegionalConfig>;
}

@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private http = inject(HttpClient);
  private api = inject(ApiConfigService);

  private settings: AppRegionalConfig = {
    companyName: 'Mi Empresa S.A.',
    logoUrl: '',
    logoFileName: '',
    dateFormat: 'dd/MM/yyyy',
    currency: 'NIO',
    decimalSeparator: '.',
    thousandSeparator: ','
  };

  getPublicSettings(): Observable<PublicSettingsResponse> {
    return this.http
      .get<PublicSettingsResponse>(`${this.api.baseUrl}/System/public-settings`)
      .pipe(
        tap((res) => {
          if (res?.data) {
            this.settings = {
              ...this.settings,
              ...res.data
            };
          }
        })
      );
  }

  getCurrentSettings(): AppRegionalConfig {
    return this.settings;
  }

  getDateFormat(): string {
    return this.settings.dateFormat || 'dd/MM/yyyy';
  }

  formatDate(value: Date | string | null | undefined, format?: string): string {
    if (value == null || value === '') return '';

    const date = this.parseToDate(value);
    if (!date) return '';

    return this.formatDateByPattern(date, format || this.getDateFormat());
  }

  toInputDate(value: Date | string | null | undefined): string {
    if (value == null || value === '') return '';

    const date = this.parseToDate(value);
    if (!date) return '';

    return this.formatDateByPattern(date, 'yyyy-MM-dd');
  }

  private parseToDate(value: Date | string): Date | null {
    if (value instanceof Date) {
      return this.isValidDate(value)
        ? new Date(value.getFullYear(), value.getMonth(), value.getDate())
        : null;
    }

    const raw = String(value).trim();
    if (!raw) return null;

    // ISO datetime: 2026-01-01T00:00:00 o con Z
    const isoDateTime = raw.match(/^(\d{4})-(\d{2})-(\d{2})T/);
    if (isoDateTime) {
      return this.buildDate(
        Number(isoDateTime[1]),
        Number(isoDateTime[2]),
        Number(isoDateTime[3])
      );
    }

    // yyyy-MM-dd
    let match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      return this.buildDate(
        Number(match[1]),
        Number(match[2]),
        Number(match[3])
      );
    }

    // yyyy/MM/dd
    match = raw.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
    if (match) {
      return this.buildDate(
        Number(match[1]),
        Number(match[2]),
        Number(match[3])
      );
    }

    // dd/MM/yyyy o MM/dd/yyyy
    match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) {
      const a = Number(match[1]);
      const b = Number(match[2]);
      const y = Number(match[3]);
      const configured = this.getDateFormat().toLowerCase();

      if (configured.startsWith('mm/')) {
        return this.buildDate(y, a, b);
      }

      return this.buildDate(y, b, a);
    }

    // dd-MM-yyyy o MM-dd-yyyy
    match = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (match) {
      const a = Number(match[1]);
      const b = Number(match[2]);
      const y = Number(match[3]);
      const configured = this.getDateFormat().toLowerCase();

      if (configured.startsWith('mm-')) {
        return this.buildDate(y, a, b);
      }

      return this.buildDate(y, b, a);
    }

    const parsed = new Date(raw);
    if (this.isValidDate(parsed)) {
      return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    }

    return null;
  }

  private buildDate(year: number, month: number, day: number): Date | null {
    if (!year || !month || !day) return null;
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;

    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date;
  }

  private isValidDate(date: Date): boolean {
    return !isNaN(date.getTime());
  }

  private pad(value: number): string {
    return String(value).padStart(2, '0');
  }

  private formatDateByPattern(date: Date, pattern: string): string {
    const dd = this.pad(date.getDate());
    const MM = this.pad(date.getMonth() + 1);
    const yyyy = String(date.getFullYear());

    return (pattern || 'dd/MM/yyyy')
      .replace(/dd/g, dd)
      .replace(/MM/g, MM)
      .replace(/yyyy/g, yyyy);
  }
}