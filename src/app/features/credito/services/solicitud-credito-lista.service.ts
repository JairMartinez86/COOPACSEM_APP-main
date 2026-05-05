import { Inject, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { BrowserApiService } from '../../../core/services/browser-api.service';
import { ApiConfigService } from '../../../core/services/ApiConfigService ';

import {
  SolicitudCreditoAprobacionRequest,
  SolicitudCreditoListaFiltro
} from '../interface/solicitud-credito-lista.interface';

@Injectable({
  providedIn: 'root'
})
export class SolicitudCreditoListaService extends BrowserApiService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiConfigService);

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    super(platformId);
  }

  getAll(filtro: SolicitudCreditoListaFiltro, skipLoader = false): Observable<any> {
    return this.browserOnly(() => {
      let params = new HttpParams()
        .set('page', filtro.page)
        .set('pageSize', filtro.pageSize);

      if (filtro.search?.trim()) params = params.set('search', filtro.search.trim());
      if (filtro.estado?.trim()) params = params.set('estado', filtro.estado.trim());
      if (filtro.etapa?.trim()) params = params.set('etapa', filtro.etapa.trim());
      if (filtro.fechaInicio?.trim()) params = params.set('fechaInicio', filtro.fechaInicio.trim());
      if (filtro.fechaFin?.trim()) params = params.set('fechaFin', filtro.fechaFin.trim());

      const headers = skipLoader
        ? { 'X-Skip-Loader': 'false' }
        : undefined;

      return this.http.get<any>(
        `${this.api.baseUrl}/SolicitudCreditoLista`,
        {
          params,
          headers,
          withCredentials: true
        }
      );
    });
  }

  aprobar(request: SolicitudCreditoAprobacionRequest, skipLoader = false): Observable<any> {
    const headers = skipLoader
      ? { 'X-Skip-Loader': 'false' }
      : undefined;

    return this.http.post<any>(
      `${this.api.baseUrl}/SolicitudCreditoLista/${request.solicitudId}/aprobar`,
      {
        etapa: request.etapa,
        comentario: request.comentario ?? ''
      },
      {
        headers,
        withCredentials: true
      }
    );
  }

  rechazar(request: SolicitudCreditoAprobacionRequest, skipLoader = false): Observable<any> {
    const headers = skipLoader
      ? { 'X-Skip-Loader': 'false' }
      : undefined;

    return this.http.post<any>(
      `${this.api.baseUrl}/SolicitudCreditoLista/${request.solicitudId}/rechazar`,
      {
        etapa: request.etapa,
        comentario: request.comentario ?? ''
      },
      {
        headers,
        withCredentials: true
      }
    );
  }

  desembolsar(solicitudId: string, comentario = '', skipLoader = false): Observable<any> {
    const headers = skipLoader
      ? { 'X-Skip-Loader': 'false' }
      : undefined;

    return this.http.post<any>(
      `${this.api.baseUrl}/SolicitudCreditoLista/${solicitudId}/desembolsar`,
      {
        comentario
      },
      {
        headers,
        withCredentials: true
      }
    );
  }
}