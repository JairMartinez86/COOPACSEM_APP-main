import { Inject, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BrowserApiService } from '../../../core/services/browser-api.service';
import { SocioCambioCuota } from '../interface/socio.cambio.cuota';
import { ApiConfigService } from '../../../core/services/ApiConfigService ';

@Injectable({
  providedIn: 'root'
})
export class SocioCambioCuotaService extends BrowserApiService {
  private http = inject(HttpClient);
  private api = inject(ApiConfigService);

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    super(platformId);
  }

  getData(socioId: string): Observable<any> {
    return this.http.get<any>(
      `${this.api.baseUrl}/socios/${socioId}/cambio-cuota`,
      {
        withCredentials: true
      }
    );
  }

  create(socioId: string, body: SocioCambioCuota): Observable<any> {
    return this.http.post<any>(
      `${this.api.baseUrl}/socios/${socioId}/cambio-cuota`,
      body,
      { withCredentials: true }
    );
  }

  approve(socioId: string, id: string): Observable<any> {
    return this.http.post<any>(
      `${this.api.baseUrl}/socios/${socioId}/cambio-cuota/${id}/aprobar`,
      {},
      { withCredentials: true }
    );
  }
}