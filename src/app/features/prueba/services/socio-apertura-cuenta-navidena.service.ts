import { Inject, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BrowserApiService } from '../../../core/services/browser-api.service';
import { ApiConfigService } from '../../../core/services/ApiConfigService ';
import { SocioAperturaCuentaNavidena } from '../interface/socio-apertura-cuenta-navidena.model';

@Injectable({
  providedIn: 'root'
})
export class SocioAperturaCuentaNavidenaService extends BrowserApiService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiConfigService);

  constructor(
    @Inject(PLATFORM_ID) platformId: object
  ) {
    super(platformId);
  }

  getData(socioId: string): Observable<any> {
    return this.http.get<any>(
      `${this.api.baseUrl}/socios/${socioId}/apertura-cuenta-navidena`,
      { withCredentials: true }
    );
  }

  create(body: any): Observable<any> {
    return this.http.post<any>(
      `${this.api.baseUrl}/socios/${body.SocioId}/apertura-cuenta-navidena`,
      body,
      { withCredentials: true }
    );
  }
}
