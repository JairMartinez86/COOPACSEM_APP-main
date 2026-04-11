import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
  HttpClient
} from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError, BehaviorSubject, of } from 'rxjs';
import { catchError, switchMap, filter, take, finalize } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';

import { TokenStorageService } from '../auth/services/token-storage.service';
import { NotificationService } from '../services/notification.service';
import { RequestLocationService } from '../services/request-location.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private platformId = inject(PLATFORM_ID);
  private storage = inject(TokenStorageService);
  private router = inject(Router);
  private notification = inject(NotificationService);
  private translate = inject(TranslateService);
  private http = inject(HttpClient);
  private requestLocation = inject(RequestLocationService);

  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  private readonly forceLogoutKey = 'force-logout';
  private isLoggingOut = false;

  private t(key: string, params?: Record<string, unknown>): string {
    return this.translate.instant(key, params);
  }

  private getCurrentLanguageHeader(): string {
    if (!isPlatformBrowser(this.platformId)) {
      return 'es-NI';
    }

    const lang = localStorage.getItem('lang') || 'es';

    switch (lang) {
      case 'en':
        return 'en-US';
      case 'es':
      default:
        return 'es-NI';
    }
  }

  private isAssetRequest(url: string): boolean {
    const value = (url || '').toLowerCase();
    return value.includes('/assets/') || value.includes('assets/i18n/');
  }

  private isApiRequest(url: string): boolean {
    return (url || '').toLowerCase().includes('/api/');
  }

  private isLoginEndpoint(url: string): boolean {
    return (url || '').toLowerCase().includes('/api/auth/login');
  }

  private isRefreshEndpoint(url: string): boolean {
    return (url || '').toLowerCase().includes('/api/auth/refresh');
  }

  private isLogoutEndpoint(url: string): boolean {
    return (url || '').toLowerCase().includes('/api/auth/logout');
  }

  private isVerifyTwoFactorEndpoint(url: string): boolean {
    return (url || '').toLowerCase().includes('/api/auth/verify-2fa');
  }

  private isValidateSessionEndpoint(url: string): boolean {
    return (url || '').toLowerCase().includes('/api/auth/validate-session');
  }

  private isPublicSettingsEndpoint(url: string): boolean {
    return (url || '').toLowerCase().includes('/api/system/public-settings');
  }

  private isAuthEndpoint(url: string): boolean {
    return (
      this.isLoginEndpoint(url) ||
      this.isRefreshEndpoint(url) ||
      this.isLogoutEndpoint(url) ||
      this.isVerifyTwoFactorEndpoint(url)
    );
  }

  private isPublicEndpoint(url: string): boolean {
    return this.isPublicSettingsEndpoint(url);
  }

  private isOnLoginRoute(): boolean {
    return (this.router.url || '').startsWith('/login');
  }

  private isForceLogoutActive(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    return sessionStorage.getItem(this.forceLogoutKey) === '1';
  }

  private activateForceLogout(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    sessionStorage.setItem(this.forceLogoutKey, '1');
  }

  private clearForceLogout(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    sessionStorage.removeItem(this.forceLogoutKey);
  }

  private isHtmlPayload(payload: any): boolean {
    if (typeof payload !== 'string') {
      return false;
    }

    const value = payload.toLowerCase();
    return value.includes('<!doctype html') || value.includes('<html');
  }
  /*
    private extractErrorMessage(err: any, fallbackKey: string): string {
      const fallback = this.t(fallbackKey);
  
      if (!err) {
        return fallback;
      }
  
      if (typeof err?.mensaje === 'string' && err.mensaje.trim()) {
        return err.mensaje;
      }
  
      if (typeof err?.message === 'string' && err.message.trim()) {
        return err.message;
      }
  
      if (typeof err?.error?.mensaje === 'string' && err.error.mensaje.trim()) {
        return err.error.mensaje;
      }
  
      if (typeof err?.error?.message === 'string' && err.error.message.trim()) {
        return err.error.message;
      }
  
      if (typeof err?.error === 'string') {
        if (this.isHtmlPayload(err.error)) {
          return this.t('interceptor.errors.sessionExpiredMessage');
        }
  
        if (err.error.trim()) {
          return err.error;
        }
      }
  
      if (typeof err === 'string') {
        if (this.isHtmlPayload(err)) {
          return this.t('interceptor.errors.sessionExpiredMessage');
        }
  
        if (err.trim()) {
          return err;
        }
      }
  
      return fallback;
    }*/


  private extractErrorMessage(err: any, fallbackKey: string): string {
    const fallback = this.t(fallbackKey);

    if (!err) {
      return fallback;
    }

    // Primero: mensaje real que viene del backend
    if (typeof err?.error?.mensaje === 'string' && err.error.mensaje.trim()) {
      return err.error.mensaje;
    }

    if (typeof err?.error?.message === 'string' && err.error.message.trim()) {
      return err.error.message;
    }

    if (typeof err?.error?.Message === 'string' && err.error.Message.trim()) {
      return err.error.Message;
    }

    if (typeof err?.error === 'string') {
      if (this.isHtmlPayload(err.error)) {
        return this.t('interceptor.errors.sessionExpiredMessage');
      }

      if (err.error.trim()) {
        return err.error;
      }
    }

    // Después: errores locales
    if (typeof err?.mensaje === 'string' && err.mensaje.trim()) {
      return err.mensaje;
    }

    if (typeof err?.message === 'string' && err.message.trim()) {
      return err.message;
    }

    if (typeof err === 'string') {
      if (this.isHtmlPayload(err)) {
        return this.t('interceptor.errors.sessionExpiredMessage');
      }

      if (err.trim()) {
        return err;
      }
    }

    return fallback;
  }

  private cloneRequest(req: HttpRequest<any>, token?: string): HttpRequest<any> {
  const currentHeaders: Record<string, string> = {};

  req.headers.keys().forEach((key) => {
    const value = req.headers.get(key);
    if (value !== null) {
      currentHeaders[key] = value;
    }
  });

  const headers: Record<string, string> = {
    ...currentHeaders,
    'Accept-Language': this.getCurrentLanguageHeader(),
    ...this.requestLocation.getHeadersSnapshot()
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return req.clone({
    setHeaders: headers,
    withCredentials: true
  });
}


  private buildRequest(req: HttpRequest<any>): HttpRequest<any> {
    if (this.isAssetRequest(req.url)) {
      return req;
    }

    if (this.isPublicEndpoint(req.url)) {
      return this.cloneRequest(req);
    }

    if (this.isAuthEndpoint(req.url)) {
      return this.cloneRequest(req);
    }

    const token = this.storage.getAccessToken();
    return this.cloneRequest(req, token || undefined);
  }

  private handleLogout(): void {
    if (this.isLoggingOut) {
      return;
    }

    this.isLoggingOut = true;
    this.activateForceLogout();

    this.storage.clear();

    localStorage.removeItem('pending_2fa_identifier');
    localStorage.removeItem('pending_2fa_expires_at');
    localStorage.removeItem('pending_2fa_server_now');
    localStorage.removeItem('dev_2fa_code');
    localStorage.removeItem('user');
    localStorage.removeItem('access_token');
    localStorage.removeItem('permissions');
    sessionStorage.removeItem('user');

    this.isRefreshing = false;
    this.refreshTokenSubject.next(null);

    if (isPlatformBrowser(this.platformId)) {
      window.location.replace('/login');
      return;
    }

    this.router.navigate(['/login'], { replaceUrl: true });
  }

  private refreshAccessToken(): Observable<string> {
    return this.http
      .post<any>(
        '/api/auth/refresh',
        {},
        {
          withCredentials: true,
          headers: {
            'Accept-Language': this.getCurrentLanguageHeader(),
            ...this.requestLocation.getHeadersSnapshot()
          }
        }
      )
      .pipe(
        switchMap((resp) => {
          const newToken = resp?.data?.accessToken;

          if (!newToken) {
            return throwError(() => ({
              ok: false,
              mensaje: this.t('interceptor.errors.refreshNoAccessToken'),
              codigo: 401
            }));
          }

          this.storage.setAccessToken(newToken);
          return of(newToken);
        }),
        catchError((error) => {
          const message = this.extractErrorMessage(
            error,
            'interceptor.errors.refreshFailed'
          );

          return throwError(() => ({
            ok: false,
            mensaje: message,
            codigo: 401
          }));
        })
      );
  }

  private debugHttp(label: string, data: any): void {
    console.log(`%c${label}`, 'color:#0d6efd;font-weight:bold;', data);
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!isPlatformBrowser(this.platformId)) {
      return next.handle(req);
    }

    if (this.isAssetRequest(req.url)) {
      return next.handle(req);
    }

    const requestToSend = this.buildRequest(req);
    const isAuthRequest = this.isAuthEndpoint(req.url);
    const isRefreshEndpoint = this.isRefreshEndpoint(req.url);
    const isLogoutEndpoint = this.isLogoutEndpoint(req.url);
    const isVerifyTwoFactorEndpoint = this.isVerifyTwoFactorEndpoint(req.url);
    const isValidateSessionEndpoint = this.isValidateSessionEndpoint(req.url);
    const forceLogout = this.isForceLogoutActive();
    const onLoginRoute = this.isOnLoginRoute();

    if (forceLogout && onLoginRoute) {
      this.clearForceLogout();
      this.isLoggingOut = false;
    }

    /*
    this.debugHttp('HTTP REQUEST', {
      originalUrl: req.url,
      finalUrl: requestToSend.url,
      method: requestToSend.method,
      withCredentials: requestToSend.withCredentials,
      authorization: requestToSend.headers.get('Authorization'),
      acceptLanguage: requestToSend.headers.get('Accept-Language'),
      body: requestToSend.body
    });
    */

    return next.handle(requestToSend).pipe(
      catchError((err: unknown) => {
        if (!(err instanceof HttpErrorResponse)) {
          const fallback = {
            ok: false,
            mensaje: this.extractErrorMessage(err, 'interceptor.errors.unexpected'),
            codigo: (err as any)?.codigo || 0
          };

          if (!forceLogout && !this.isLoggingOut) {
            this.notification.showFromApiResponse(
              fallback,
              this.t('interceptor.errors.genericTitle')
            );
          }

          return throwError(() => fallback);
        }

        /*
        this.debugHttp('HTTP ERROR RAW', {
          requestUrl: req.url,
          finalUrl: requestToSend.url,
          status: err.status,
          statusText: err.statusText,
          responseUrl: err.url,
          contentType: err.headers?.get('content-type'),
          error: err.error,
          isHtml: this.isHtmlPayload(err.error)
        });
        */

        if (this.isHtmlPayload(err.error)) {
          const normalized = {
            ok: false,
            mensaje: this.t('interceptor.errors.sessionExpiredMessage'),
            codigo: err.status ?? 0
          };

          if (this.isApiRequest(req.url)) {
            this.handleLogout();
          }

          return throwError(() => normalized);
        }

        if (forceLogout) {
          const normalized = {
            ok: false,
            mensaje: this.extractErrorMessage(
              err,
              'interceptor.errors.sessionExpiredMessage'
            ),
            codigo: err.status ?? 0
          };

          return throwError(() => normalized);
        }

        if (err.status === 401 && onLoginRoute && !isAuthRequest && !isValidateSessionEndpoint) {
          const normalized = {
            ok: false,
            mensaje: this.extractErrorMessage(
              err,
              'interceptor.errors.sessionExpiredMessage'
            ),
            codigo: 401
          };

          return throwError(() => normalized);
        }

        if (err.status === 401 && !isAuthRequest && !isValidateSessionEndpoint) {
          if (this.isRefreshing) {
            return this.refreshTokenSubject.pipe(
              filter((token): token is string => token !== null),
              take(1),
              switchMap((token) => {
                const retryReq = this.cloneRequest(req, token);
                return next.handle(retryReq);
              })
            );
          }

          this.isRefreshing = true;
          this.refreshTokenSubject.next(null);

          return this.refreshAccessToken().pipe(
            switchMap((newToken) => {
              this.refreshTokenSubject.next(newToken);
              const retryReq = this.cloneRequest(req, newToken);
              return next.handle(retryReq);
            }),
            catchError((refreshErr) => {
              const message = this.extractErrorMessage(
                refreshErr,
                'interceptor.errors.sessionExpiredMessage'
              );

              if (!this.isLoggingOut) {
                this.notification.show(
                  message,
                  this.t('interceptor.errors.sessionExpiredTitle'),
                  'warning'
                );
              }

              this.handleLogout();

              return throwError(() => ({
                ok: false,
                mensaje: message,
                codigo: 401
              }));
            }),
            finalize(() => {
              this.isRefreshing = false;
            })
          );
        }

        let title = this.t('interceptor.errors.genericTitle');
        let type: 'success' | 'error' | 'warning' = 'error';
        let message = this.t('interceptor.errors.unexpected');

        switch (err.status) {
          case 0:
            title = this.t('interceptor.errors.noConnectionTitle');
            type = 'error';
            message = this.t('interceptor.errors.noConnectionMessage');
            break;

          case 400:
            title = this.t('interceptor.errors.badRequestTitle');
            type = 'warning';
            message = this.extractErrorMessage(
              err,
              'interceptor.errors.badRequestMessage'
            );
            break;

          case 401:
            if (isVerifyTwoFactorEndpoint) {
              title = this.t('modal.types.warning.title');
              type = 'warning';
              message = this.extractErrorMessage(err, 'twoFactor.invalidCode');
              break;
            }

            if (this.isLoginEndpoint(req.url)) {
              title = this.t('modal.types.warning.title');
              type = 'warning';
              message = this.extractErrorMessage(
                err,
                'interceptor.errors.badRequestMessage'
              );
              break;
            }

            title = this.t('interceptor.errors.sessionExpiredTitle');
            type = 'warning';
            message = this.extractErrorMessage(
              err,
              'interceptor.errors.sessionExpiredMessage'
            );

            if (isRefreshEndpoint || isLogoutEndpoint || isValidateSessionEndpoint) {
              this.handleLogout();
            }
            break;

          case 403:
            title = this.t('interceptor.errors.forbiddenTitle');
            type = 'warning';
            message = this.extractErrorMessage(
              err,
              'interceptor.errors.forbiddenMessage'
            );

            this.handleLogout();
            break;

          case 404:
            title = this.t('interceptor.errors.notFoundTitle');
            type = 'warning';
            message = this.extractErrorMessage(
              err,
              'interceptor.errors.notFoundMessage'
            );
            break;

          case 409:
            title = this.t('interceptor.errors.genericTitle');
            type = 'warning';
            message = this.extractErrorMessage(
              err,
              'interceptor.errors.conflictMessage'
            );
            break;

          case 422:
            title = this.t('interceptor.errors.genericTitle');
            type = 'warning';
            message = this.extractErrorMessage(
              err,
              'interceptor.errors.validationMessage'
            );
            break;

          case 429:
            title = this.t('interceptor.errors.genericTitle');
            type = 'warning';
            message = this.extractErrorMessage(
              err,
              'interceptor.errors.tooManyRequestsMessage'
            );
            break;

          case 500:
            title = this.t('interceptor.errors.serverTitle');
            type = 'error';
            message = this.extractErrorMessage(
              err,
              'interceptor.errors.serverMessage'
            );
            break;

          case 502:
            title = this.t('interceptor.errors.serverTitle');
            type = 'error';
            message = this.extractErrorMessage(
              err,
              'interceptor.errors.badGatewayMessage'
            );
            break;

          case 503:
            title = this.t('interceptor.errors.serverTitle');
            type = 'error';
            message = this.extractErrorMessage(
              err,
              'interceptor.errors.serviceUnavailableMessage'
            );
            break;

          default:
            title = this.t('interceptor.errors.genericTitle');
            type = 'error';
            message = this.extractErrorMessage(
              err,
              'interceptor.errors.genericMessage'
            );
            break;
        }

        const normalized = {
          ...(err?.error ?? {}), // 👈 mantiene todo lo del backend
          ok: false,
          mensaje: message,
          codigo: err.status ?? err?.error?.codigo ?? 0
        };


       const errorCode = err?.error?.errorCode;

      const skipModal =
        errorCode === 'CUSTOM_ERROR';

      if (!this.isLoggingOut && !skipModal) {
        this.notification.show(message, title, type);
      }
        return throwError(() => normalized);
      })
    );
  }
}