import { Inject, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { BrowserApiService } from '../../../core/services/browser-api.service';
import { ApiConfigService } from '../../../core/services/ApiConfigService ';

@Injectable({
  providedIn: 'root'
})
export class SolicitudCreditoService extends BrowserApiService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiConfigService);

  private readonly baseUrl = `${this.api.baseUrl}/SolicitudCreditoListaSocio`;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    super(platformId);
  }

  private getHeaders(skipLoader: boolean): Record<string, string> | undefined {
    return skipLoader ? { 'X-Skip-Loader': 'true' } : undefined;
  }

  getAll(
    page: number,
    pageSize: number,
    search?: string,
    tipoCuenta?: string,
    estado?: string,
    skipLoader = false
  ): Observable<any> {
    return this.browserOnly(() => {
      let params = new HttpParams()
        .set('page', page)
        .set('pageSize', pageSize);

      if (search) params = params.set('search', search);
      if (tipoCuenta) params = params.set('tipoCuenta', tipoCuenta);
      if (estado) params = params.set('estado', estado);

      return this.http.get<any>(this.baseUrl, {
        params,
        headers: this.getHeaders(skipLoader),
        withCredentials: true
      });
    });
  }

  getNuevo(
    socioId: string,
    tipoSolicitud: string,
    skipLoader = false
  ): Observable<any> {
    return this.browserOnly(() =>
      this.http.get<any>(
        `${this.baseUrl}/${socioId}/nuevo/${tipoSolicitud}`,
        {
          headers: this.getHeaders(skipLoader),
          withCredentials: true
        }
      )
    );
  }

  postSolicitudCredito(payload: any, skipLoader = false): Observable<any> {
    return this.browserOnly(() =>
      this.http.post<any>(
        `${this.baseUrl}/solicitud`,
        payload,
        {
          headers: this.getHeaders(skipLoader),
          withCredentials: true
        }
      )
    );
  }

  getSolicitud(
    socioId: string,
    solicitudId: string,
    skipLoader = false
  ): Observable<any> {
    return this.browserOnly(() =>
      this.http.get<any>(
        `${this.baseUrl}/${socioId}/solicitud/${solicitudId}`,
        {
          headers: this.getHeaders(skipLoader),
          withCredentials: true
        }
      )
    );
  }

  putSolicitudCredito(
    solicitudId: string,
    payload: any,
    skipLoader = false
  ): Observable<any> {
    return this.browserOnly(() =>
      this.http.put<any>(
        `${this.baseUrl}/solicitud/${solicitudId}`,
        payload,
        {
          headers: this.getHeaders(skipLoader),
          withCredentials: true
        }
      )
    );
  }

}