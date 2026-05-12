import { Inject, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { BrowserApiService } from '../../../core/services/browser-api.service';
import { ApiConfigService } from '../../../core/services/ApiConfigService ';

import {
  CreditosActivosFiltro
} from '../interface/creditos-activos.interface';

@Injectable({
  providedIn: 'root'
})
export class CreditosActivosService extends BrowserApiService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiConfigService);

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    super(platformId);
  }

  getKpis(filtro: Partial<CreditosActivosFiltro>, skipLoader = false): Observable<any> {
    return this.browserOnly(() => {
      const params = this.buildParams(filtro);

      const headers = skipLoader
        ? { 'X-Skip-Loader': 'false' }
        : undefined;

      return this.http.get<any>(
        `${this.api.baseUrl}/CreditosActivos/kpis`,
        {
          params,
          headers,
          withCredentials: true
        }
      );
    });
  }

  getGraficos(filtro: Partial<CreditosActivosFiltro>, skipLoader = false): Observable<any> {
    return this.browserOnly(() => {
      const params = this.buildParams(filtro);

      const headers = skipLoader
        ? { 'X-Skip-Loader': 'false' }
        : undefined;

      return this.http.get<any>(
        `${this.api.baseUrl}/CreditosActivos/graficos`,
        {
          params,
          headers,
          withCredentials: true
        }
      );
    });
  }

  getAll(filtro: CreditosActivosFiltro, skipLoader = false): Observable<any> {
    return this.browserOnly(() => {
      let params = this.buildParams(filtro)
        .set('page', filtro.page)
        .set('pageSize', filtro.pageSize);

      if (filtro.search?.trim()) {
        params = params.set('search', filtro.search.trim());
      }

      const headers = skipLoader
        ? { 'X-Skip-Loader': 'false' }
        : undefined;

      return this.http.get<any>(
        `${this.api.baseUrl}/CreditosActivos`,
        {
          params,
          headers,
          withCredentials: true
        }
      );
    });
  }

  getDetalle(noCredito: string, filtro: Partial<CreditosActivosFiltro>, skipLoader = false): Observable<any> {
    return this.browserOnly(() => {
      const params = this.buildParams(filtro);

      const headers = skipLoader
        ? { 'X-Skip-Loader': 'false' }
        : undefined;

      return this.http.get<any>(
        `${this.api.baseUrl}/CreditosActivos/${encodeURIComponent(noCredito)}/detalle`,
        {
          params,
          headers,
          withCredentials: true
        }
      );
    });
  }

  private buildParams(filtro: Partial<CreditosActivosFiltro>): HttpParams {
    let params = new HttpParams();

    if (filtro.fechaCorte?.trim()) {
      params = params.set('fechaCorte', filtro.fechaCorte.trim());
    }

    if (filtro.codSocio?.trim()) {
      params = params.set('codSocio', filtro.codSocio.trim());
    }

    return params;
  }
}