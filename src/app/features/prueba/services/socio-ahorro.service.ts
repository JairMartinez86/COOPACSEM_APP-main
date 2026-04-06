import { Inject, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BrowserApiService } from '../../../core/services/browser-api.service';
import { ApiConfigService } from '../../../core/services/ApiConfigService ';
import { SocioAhorro } from '../interface/socio.ahorro.model';




@Injectable({
  providedIn: 'root'
})
export class SocioAhorroService extends BrowserApiService {
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
      this.http.get<any>(`${this.api.baseUrl}/socios/${socioId}/ahorro-extraordinario/history`, {
        withCredentials: true
      })
    );
  }

  create(body: SocioAhorro): Observable<any> {
    return this.http.post<any>(
      `${this.api.baseUrl}/socios/${body.SocioId}/ahorro-extraordinario`,
      body,
      { withCredentials: true }
    );
  }
}