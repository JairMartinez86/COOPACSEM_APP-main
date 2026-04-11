import { Inject, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AhorroDashboardResponse } from '../interface/ahorro.models';
import { BrowserApiService } from '../../../core/services/browser-api.service';
import { ApiConfigService } from '../../../core/services/ApiConfigService ';


@Injectable({
  providedIn: 'root'
})
export class AhorroService extends BrowserApiService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiConfigService);

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    super(platformId);
  }


  getDashboard(
  payload: {
    page: number;
    pageSize: number;
    search?: string;
    tipoCuenta?: string;
    estado?: string;
    socioId?: string | null;
  },
  skipLoader = false
): Observable<{ ok: boolean; codigo: string; data: AhorroDashboardResponse }> {
  return this.browserOnly(() => {
    let params = new HttpParams()
      .set('page', payload.page)
      .set('pageSize', payload.pageSize);

    if (payload.search) params = params.set('search', payload.search);
    if (payload.tipoCuenta) params = params.set('tipoCuenta', payload.tipoCuenta);
    if (payload.estado) params = params.set('estado', payload.estado);
    if (payload.socioId) params = params.set('socioId', payload.socioId);

    const headers = skipLoader
      ? { 'X-Skip-Loader': 'true' }
      : undefined;

    return this.http.get<{ ok: boolean; codigo: string; data: AhorroDashboardResponse }>(
      `${this.api.baseUrl}/ahorro/dashboard`,
      {
        params,
        headers,
        withCredentials: true
      }
    );
  });
}

}
