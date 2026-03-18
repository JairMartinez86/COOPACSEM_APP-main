import { inject, Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BrowserApiService } from '../../../core/services/browser-api.service';
import { ApiResponse } from '../../../core/auth/services/auth.service';
import { CompanyRequest } from '../interface/company.interface';
import { ApiConfigService } from '../../../core/services/ApiConfigService ';


@Injectable({
  providedIn: 'root'
})
export class CompanyService extends BrowserApiService {
    private http = inject(HttpClient);
  private api = inject(ApiConfigService);

  constructor(
    @Inject(PLATFORM_ID) platformId: object
  ) {
    super(platformId);
  }

  getCompany(): Observable<any> {
    return this.browserOnly(() =>
      this.http.get<any>(`${this.api.baseUrl}/company`)
    );
  }

  putCompany(body: CompanyRequest): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(
      `${this.api.baseUrl}/company`,
      body,
      { withCredentials: true }
    );
  }


  uploadLogo(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<any>(
      `${this.api.baseUrl}/company/logo`,
      formData,
      { withCredentials: true }
    );
  }
}