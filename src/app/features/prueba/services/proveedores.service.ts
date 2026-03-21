import { Inject, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BrowserApiService } from '../../../core/services/browser-api.service';
import { ApiConfigService } from '../../../core/services/ApiConfigService ';


@Injectable({
  providedIn: 'root'
})
export class ProveedoresService extends BrowserApiService {
  private http = inject(HttpClient);
  private api = inject(ApiConfigService);

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    super(platformId);
  }

  getAll(): Observable<any> {
    return this.browserOnly(() =>
      this.http.get<any>(`${this.api.baseUrl}/proveedores`, {
        withCredentials: true
      })
    );
  }

  getById(id: string): Observable<any> {
    return this.browserOnly(() =>
      this.http.get<any>(`${this.api.baseUrl}/proveedores/${id}`, {
        withCredentials: true
      })
    );
  }

  save(payload: any): Observable<any> {
    if (payload?.id) {
      return this.browserOnly(() =>
        this.http.put<any>(`${this.api.baseUrl}/proveedores/${payload.id}`, payload, {
          withCredentials: true
        })
      );
    }

    return this.browserOnly(() =>
      this.http.post<any>(`${this.api.baseUrl}/proveedores`, payload, {
        withCredentials: true
      })
    );
  }

  delete(id: string): Observable<any> {
    return this.browserOnly(() =>
      this.http.delete<any>(`${this.api.baseUrl}/proveedores/${id}`, {
        withCredentials: true
      })
    );
  }

  changeStatus(id: string, activo: boolean): Observable<any> {
    return this.browserOnly(() =>
      this.http.patch<any>(`${this.api.baseUrl}/proveedores/${id}/status`, { activo }, {
        withCredentials: true
      })
    );
  }
}