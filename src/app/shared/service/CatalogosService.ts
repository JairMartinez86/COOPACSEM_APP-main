import { Inject, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiConfigService } from '../../core/services/ApiConfigService ';
import { BrowserApiService } from '../../core/services/browser-api.service';

@Injectable({
  providedIn: 'root'
})
export class CatalogosService extends BrowserApiService {
  private http = inject(HttpClient);
  private api = inject(ApiConfigService);

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    super(platformId);
  }

  getNacionalidades(): Observable<any> {
    return this.browserOnly(() =>
      this.http.get<any>(`${this.api.baseUrl}/catalogos/nacionalidades`, {
        withCredentials: true
      })
    );
  }

  getDepartamentos(): Observable<any> {
    return this.browserOnly(() =>
      this.http.get<any>(`${this.api.baseUrl}/catalogos/departamentos`, {
        withCredentials: true
      })
    );
  }

  getMunicipios(departamentoId?: string | null): Observable<any> {
    let params = new HttpParams();

    if (departamentoId) {
      params = params.set('departamentoId', departamentoId);
    }

    return this.browserOnly(() =>
      this.http.get<any>(`${this.api.baseUrl}/catalogos/municipios`, {
        params,
        withCredentials: true
      })
    );
  }

  getPaises(): Observable<any> {
    return this.http.get<any>(
      `${this.api.baseUrl}/catalogos/paises`,
      { withCredentials: true }
    );
  }

getEmpresas(): Observable<any> {
    return this.browserOnly(() =>
      this.http.get<any>(`${this.api.baseUrl}/catalogos/empresas`, {
        withCredentials: true
      })
    );
  }

  getTratamientosProveedor(): Observable<any> {
    return this.browserOnly(() =>
      this.http.get<any>(`${this.api.baseUrl}/catalogos/tratamientos-proveedor`, {
        withCredentials: true
      })
    );
  }

  getSectoresProveedor(): Observable<any> {
    return this.browserOnly(() =>
      this.http.get<any>(`${this.api.baseUrl}/catalogos/sectores-proveedor`, {
        withCredentials: true
      })
    );
  }




  
}