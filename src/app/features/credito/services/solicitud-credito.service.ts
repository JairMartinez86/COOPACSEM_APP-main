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

    constructor(@Inject(PLATFORM_ID) platformId: object) {
        super(platformId);
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

            const headers = skipLoader
                ? { 'X-Skip-Loader': 'false' }
                : undefined;

            return this.http.get<any>(
                `${this.api.baseUrl}/SolicitudCreditoListaSocio`,
                {
                    params,
                    headers,
                    withCredentials: true
                }
            );
        });
    }


    getNuevo(socioId: string, skipLoader = false) {
  const headers = skipLoader
    ? { 'X-Skip-Loader': 'false' }
    : undefined;

  return this.http.get<any>(
    `${this.api.baseUrl}/SolicitudCreditoListaSocio/${socioId}/nuevo`,
    {
      headers,
      withCredentials: true
    }
  );
}

postSolicitudCredito(payload: any, skipLoader = false): Observable<any> {
  const headers = skipLoader
    ? { 'X-Skip-Loader': 'false' }
    : undefined;

  return this.http.post<any>(
    `${this.api.baseUrl}/SolicitudCreditoListaSocio/solicitud`,
    payload,
    {
      headers,
      withCredentials: true
    }
  );
}

}