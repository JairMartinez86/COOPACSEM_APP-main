import { inject, Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BrowserApiService } from '../../../core/services/browser-api.service';
import { ApiConfigService } from '../../../core/services/ApiConfigService ';

@Injectable({
  providedIn: 'root'
})
export class ActivityHistoryService extends BrowserApiService {
  private api = inject(ApiConfigService);

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    super(platformId);
  }

  getByUser(
    user: string,
    days: number = 7,
    page: number = 1,
    pageSize: number = 30
  ): Observable<any> {
    return this.browserOnly(() =>
      this.http.get(
        `${this.api.baseUrl}/activity/user/${encodeURIComponent(user)}`,
        {
          params: new HttpParams()
            .set('days', days)
            .set('page', page)
            .set('pageSize', pageSize),
          withCredentials: true
        }
      )
    );
  }

  getTrustedDevices(user: string): Observable<any> {
    return this.http.get(
      `${this.api.baseUrl}/activity/user/${encodeURIComponent(user)}/trusted-devices`,
      { withCredentials: true }
    );
  }

  deleteTrustedDevice(user: string, deviceId: string): Observable<any> {
    return this.http.delete(
      `${this.api.baseUrl}/activity/user/${encodeURIComponent(user)}/trusted-devices/${encodeURIComponent(deviceId)}`,
      { withCredentials: true }
    );
  }

  revokeSession(sessionId: string, user: string) {
    return this.http.post(
      `${this.api.baseUrl}/Auth/revoke-session/${encodeURIComponent(sessionId)}?user=${encodeURIComponent(user)}`,
      {},
      { withCredentials: true }
    );
  }

  logoutCurrentSession() {
    return this.http.post(
      `${this.api.baseUrl}/Auth/logout`,
      {},
      { withCredentials: true }
    );
  }
}
