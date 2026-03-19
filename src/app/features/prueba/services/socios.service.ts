import { Inject, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BrowserApiService } from '../../../core/services/browser-api.service';
import { ApiConfigService } from '../../../core/services/ApiConfigService ';
import { ApiResponse } from '../../../core/auth/services/auth.service';
import { SocioForm } from '../interface/socio.model';

@Injectable({
  providedIn: 'root'
})
export class SociosService extends BrowserApiService {
  private http = inject(HttpClient);
  private api = inject(ApiConfigService);

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    super(platformId);
  }

  getAll(): Observable<any> {
    return this.browserOnly(() =>
      this.http.get<any>(`${this.api.baseUrl}/socios`)
    );
  }

  getById(id: string): Observable<any> {
    return this.browserOnly(() =>
      this.http.get<any>(`${this.api.baseUrl}/socios/${id}`)
    );
  }

  post(body: SocioForm): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.api.baseUrl}/socios`,
      body,
      { withCredentials: true }
    );
  }

  put(id: string, body: SocioForm): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(
      `${this.api.baseUrl}/socios/${id}`,
      body,
      { withCredentials: true }
    );
  }

  delete(id: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(
      `${this.api.baseUrl}/socios/${id}`,
      { withCredentials: true }
    );
  }

  save(body: SocioForm): Observable<ApiResponse> {
    return body.id ? this.put(body.id, body) : this.post(body);
  }
}