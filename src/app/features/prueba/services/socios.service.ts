import { Inject, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BrowserApiService } from '../../../core/services/browser-api.service';
import { ApiConfigService } from '../../../core/services/ApiConfigService ';
import { ApiResponse } from '../../../core/auth/services/auth.service';
import { SocioForm } from '../interface/socio.model';
import { BeneficiarioForm } from '../interface/beneficiario.model';

@Injectable({
  providedIn: 'root'
})
export class SociosService extends BrowserApiService {
  private http = inject(HttpClient);
  private api = inject(ApiConfigService);

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    super(platformId);
  }

  getDashboard(): Observable<any> {
    return this.browserOnly(() =>
      this.http.get<any>(`${this.api.baseUrl}/socios/dashboard`, { withCredentials: true })
    );
  }

  getAll(): Observable<any> {
    return this.browserOnly(() =>
      this.http.get<any>(`${this.api.baseUrl}/socios`, { withCredentials: true })
    );
  }

  getById(id: string): Observable<any> {
    return this.browserOnly(() =>
      this.http.get<any>(`${this.api.baseUrl}/socios/${id}`, { withCredentials: true })
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

  changeStatus(id: string, activo: boolean): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(
      `${this.api.baseUrl}/socios/${id}/status`,
      { activo },
      { withCredentials: true }
    );
  }

  importExcel(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<any>(
      `${this.api.baseUrl}/socios/import-excel`,
      formData,
      { withCredentials: true }
    );
  }

  getBeneficiarios(socioId: string): Observable<any> {
    return this.http.get<any>(
      `${this.api.baseUrl}/socios/${socioId}/beneficiarios`,
      { withCredentials: true }
    );
  }

  createBeneficiario(socioId: string, body: BeneficiarioForm): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.api.baseUrl}/socios/${socioId}/beneficiarios`,
      body,
      { withCredentials: true }
    );
  }

  updateBeneficiario(socioId: string, beneficiarioId: string, body: BeneficiarioForm): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(
      `${this.api.baseUrl}/socios/${socioId}/beneficiarios/${beneficiarioId}`,
      body,
      { withCredentials: true }
    );
  }

  deleteBeneficiario(socioId: string, beneficiarioId: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(
      `${this.api.baseUrl}/socios/${socioId}/beneficiarios/${beneficiarioId}`,
      { withCredentials: true }
    );
  }

  getFiles(socioId: string, path: string = ''): Observable<any> {
    return this.http.get<any>(
      `${this.api.baseUrl}/socios/${socioId}/files`,
      {
        params: { path },
        withCredentials: true
      }
    );
  }

  createFolder(socioId: string, body: { folderName: string; path?: string | null }): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.api.baseUrl}/socios/${socioId}/files/folder`,
      body,
      { withCredentials: true }
    );
  }
  uploadFiles(socioId: string, formData: FormData): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.api.baseUrl}/socios/${socioId}/files/upload`,
      formData,
      { withCredentials: true }
    );
  }

  downloadFile(socioId: string, path: string): Observable<Blob> {
    return this.http.get(
      `${this.api.baseUrl}/socios/${socioId}/files/download`,
      {
        params: { path },
        withCredentials: true,
        responseType: 'blob'
      }
    );
  }

  deleteFile(socioId: string, path: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(
      `${this.api.baseUrl}/socios/${socioId}/files`,
      {
        params: { path },
        withCredentials: true
      }
    );
  }

  getFilePreviewUrl(socioId: string, path: string): string {
  return `${this.api.baseUrl}/socios/${socioId}/files/download?path=${encodeURIComponent(path)}`;
}
}