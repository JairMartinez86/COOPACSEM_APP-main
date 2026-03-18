import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { ApiConfigService } from './ApiConfigService ';

export interface PublicSettingsResponse {
  ok: boolean;
  codigo: number;
  data: {
    companyName: string;
  };
}

@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private http = inject(HttpClient);
   private api = inject(ApiConfigService);


  getPublicSettings(): Observable<PublicSettingsResponse> {
    return this.http.get<PublicSettingsResponse>(`${this.api.baseUrl}/System/public-settings`);
  }
}