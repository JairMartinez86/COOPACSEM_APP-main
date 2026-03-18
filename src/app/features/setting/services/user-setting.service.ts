import { inject, Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BrowserApiService } from '../../../core/services/browser-api.service';
import { environment } from '../../../../environments/environment';
import { UserSettingRequest } from '../interface/user-setting.interface';
import { ApiResponse } from '../../../core/auth/services/auth.service';
import { ApiConfigService } from '../../../core/services/ApiConfigService ';


@Injectable({
  providedIn: 'root'
})
export class UserSettingService extends BrowserApiService {
  private http = inject(HttpClient);
  private api = inject(ApiConfigService)

  constructor(
    @Inject(PLATFORM_ID) platformId: object
  ) {
    super(platformId);
  }

  getUserSettings(user?: string): Observable<UserSettingRequest> {
    return this.browserOnly(() =>
      this.http.get<UserSettingRequest>(`${this.api.baseUrl}/user-settings`, {
        params: user ? { user } : undefined,
        withCredentials: true
      })
    );
  }


  putUserSettings(body: UserSettingRequest, user?: string): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(
      `${this.api.baseUrl}/user-settings`,
      body,
      {
        params: user ? { user } : undefined,
        withCredentials: true
      }
    );
  }
}