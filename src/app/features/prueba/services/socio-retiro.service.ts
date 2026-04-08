import { Inject, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BrowserApiService } from '../../../core/services/browser-api.service';
import { ApiConfigService } from '../../../core/services/ApiConfigService ';
import { SocioRetiro } from '../interface/socio.retiro.model';

@Injectable({
  providedIn: 'root'
})
export class SocioRetiroService extends BrowserApiService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiConfigService);

  constructor(
    @Inject(PLATFORM_ID) platformId: object
  ) {
    super(platformId);
  }

  getBancos(): Observable<any> {
    return this.browserOnly(() =>
      this.http.get<any>(`${this.api.baseUrl}/catalogos/bancos`, {
        withCredentials: true
      })
    );
  }

  getHistorial(socioId: string): Observable<any> {
    return this.browserOnly(() =>
      this.http.get<any>(`${this.api.baseUrl}/socios/${socioId}/retiro-extraordinario/history`, {
        withCredentials: true
      })
    );
  }

  create(body: SocioRetiro): Observable<any> {
    return this.http.post<any>(
      `${this.api.baseUrl}/socios/${body.SocioId}/retiro-extraordinario`,
      body,
      { withCredentials: true }
    );
  }
}