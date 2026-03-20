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
}