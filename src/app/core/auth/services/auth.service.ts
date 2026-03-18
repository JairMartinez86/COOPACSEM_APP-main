import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, finalize } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

import { TokenStorageService } from './token-storage.service';
import { LoaderService } from '../../services/loader.service';
import { LoginRequest } from '../../../features/auth/interface/login.interface';
import { NotificationService } from '../../services/notification.service';
import { ApiConfigService } from '../../services/ApiConfigService ';

export interface ApiResponse<T = any> {
  ok?: boolean;
  mensaje?: string;
  codigo?: number;
  messageCode?: string;
  data?: T;
}

export interface VerifyTwoFactorRequest {
  identifier: string;
  code: string;
  rememberDevice: boolean;
}

export interface ForgotPasswordRequest {
  identifier: string;
}

export interface ResendTwoFactorRequest {
  identifier: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiConfigService);

  private http = inject(HttpClient);
  private storage = inject(TokenStorageService);
  private router = inject(Router);
  private loader = inject(LoaderService);


  login(body: LoginRequest): Observable<ApiResponse> {
    return this.http
      .post<ApiResponse>(`${this.api.baseUrl}/Auth/Login`, body, { withCredentials: true })
      .pipe(
        tap((res: ApiResponse) => {
          const accessToken = res?.data?.accessToken;
          const identifier = res?.data?.user?.user ?? res?.data?.identifier;
          const expiresAt = res?.data?.twoFactor?.expiresAt;
          const serverNow = res?.data?.twoFactor?.serverNow;
          const devCode = res?.data?.devCode;

          if (accessToken) {
            this.storage.setAccessToken(accessToken);
          }

          if (res?.messageCode === 'SECOND_FACTOR_REQUIRED') {
            if (identifier) {
              localStorage.setItem('pending_2fa_identifier', identifier);
            }

            if (expiresAt) {
              localStorage.setItem('pending_2fa_expires_at', expiresAt);
            }

            if (serverNow) {
              localStorage.setItem('pending_2fa_server_now', serverNow);
            }

            if (devCode) {
              localStorage.setItem('dev_2fa_code', devCode);
            }
          }
        })
      );
  }

  verifyTwoFactor(body: VerifyTwoFactorRequest): Observable<ApiResponse> {
    return this.http
      .post<ApiResponse>(`${this.api.baseUrl}/Auth/verify-2fa`, body, { withCredentials: true })
      .pipe(
        tap((res: ApiResponse) => {
          const accessToken = res?.data?.accessToken;

          if (accessToken) {
            this.storage.setAccessToken(accessToken);
          }

          if (res?.messageCode === 'SECOND_FACTOR_SUCCESS') {
            localStorage.removeItem('pending_2fa_identifier');
            localStorage.removeItem('pending_2fa_expires_at');
            localStorage.removeItem('pending_2fa_server_now');
            localStorage.removeItem('dev_2fa_code');
          }
        })
      );
  }

  resendTwoFactor(body: ResendTwoFactorRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.api.baseUrl}/Auth/resend-2fa`, body, { withCredentials: true });
  }

  refresh(): Observable<ApiResponse> {
    return this.http
      .post<ApiResponse>(`${this.api.baseUrl}/Auth/refresh`, {}, { withCredentials: true })
      .pipe(
        tap((res: ApiResponse) => {
          const accessToken = res?.data?.accessToken;

          if (accessToken) {
            this.storage.setAccessToken(accessToken);
          }
        })
      );
  }


  requestPasswordReset(body: ForgotPasswordRequest): Observable<ApiResponse> {
  return this.http.post<ApiResponse>(
    `${this.api.baseUrl}/Auth/forgot-password`,
    body,
    { withCredentials: true }
  );
}

resetPassword(body: { token: string; newPassword: string }) {
  return this.http.post<ApiResponse>(
    `${this.api.baseUrl}/Auth/reset-password`,
    body,
    { withCredentials: true }
  );
}



  validateSession(): Observable<ApiResponse> {
     console.trace('validateSession fue llamado');
    return this.http.get<ApiResponse>(`${this.api.baseUrl}/Auth/validate-session`, {
      withCredentials: true
    });
  }



  logout(): void {
  this.loader.show();

  this.http
    .post<ApiResponse>(`${this.api.baseUrl}/Auth/logout`, {}, { withCredentials: true })
    .pipe(
      finalize(() => {
        this.loader.hide();
      })
    )
    .subscribe({
      next: () => {
        this.clearSession();
        this.storage.clear();
        this.router.navigate(['/login'], { replaceUrl: true });
      },
      error: (err) => {
        console.error('LOGOUT ERROR', err);

        // Si el backend sí cerró sesión pero Firefox rompe la respuesta,
        // igual cerramos local.
        this.clearSession();
        this.storage.clear();
        this.router.navigate(['/login'], { replaceUrl: true });
      }
    });
}



  getAccessToken(): string | null {
    return this.storage.getAccessToken();
  }

  isLoggedIn(): boolean {
    return !!this.storage.getAccessToken();
  }

  clearSession(): void {
    this.storage.clear();

    if (typeof window !== 'undefined') {
      localStorage.removeItem('pending_2fa_identifier');
      localStorage.removeItem('pending_2fa_expires_at');
      localStorage.removeItem('pending_2fa_server_now');
      localStorage.removeItem('dev_2fa_code');
      localStorage.removeItem("user");
      sessionStorage.removeItem('force-logout');
     
    }

  }

  getPendingTwoFactorIdentifier(): string | null {
    return localStorage.getItem('pending_2fa_identifier');
  }

  getPendingTwoFactorExpiresAt(): string | null {
    return localStorage.getItem('pending_2fa_expires_at');
  }

  hasPendingTwoFactor(): boolean {
    return !!this.getPendingTwoFactorIdentifier();
  }
}