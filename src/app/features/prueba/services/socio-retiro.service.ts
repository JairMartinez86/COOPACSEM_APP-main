import { Inject, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { BrowserApiService } from '../../../core/services/browser-api.service';
import { ApiConfigService } from '../../../core/services/ApiConfigService ';

@Injectable({
  providedIn: 'root'
})
export class SocioRetiroService extends BrowserApiService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiConfigService);

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    super(platformId);
  }

  getNuevo(socioId: string): Observable<any> {
    return this.browserOnly(() =>
      this.http.get<any>(
        `${this.api.baseUrl}/socios/${socioId}/retiro-extraordinario/nuevo`,
        { withCredentials: true }
      )
    );
  }

  createSolicitud(body: any): Observable<any> {
    return this.http.post<any>(
      `${this.api.baseUrl}/socios/${body.socioId}/retiro-extraordinario/solicitud`,
      body,
      { withCredentials: true }
    );
  }

  getSolicitud(socioId: string, solicitudId: string): Observable<any> {
    return this.browserOnly(() =>
      this.http.get<any>(
        `${this.api.baseUrl}/socios/${socioId}/retiro-extraordinario/solicitud/${solicitudId}`,
        { withCredentials: true }
      )
    );
  }

  updateSolicitud(socioId: string, solicitudId: string, body: any): Observable<any> {
    return this.http.put<any>(
      `${this.api.baseUrl}/socios/${socioId}/retiro-extraordinario/solicitud/${solicitudId}`,
      body,
      { withCredentials: true }
    );
  }
}