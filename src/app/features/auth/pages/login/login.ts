import { ChangeDetectorRef, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/auth/services/auth.service';
import {
  JMartAutoFocusNextDirective,
  JMartEngineSyncDirective,
  JMartErrorNotifyDirective,
  JMartMassiveValidationService,
  JMartAutoFocusDirective
} from '@JairMartinez86/jmartinez-validator';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AppStateService } from '../../../../core/services/app-state.service';
import { EMPTY_USER_SETTING, LoginRequest } from '../../interface/login.interface';
import { finalize } from 'rxjs';
import { AppLang, LanguageService } from '../../../../core/services/languageService';
import { TokenStorageService } from '../../../../core/auth/services/token-storage.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { LoaderService } from '../../../../core/services/loader.service';
import { RequestLocationService } from '../../../../core/services/request-location.service';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    JMartAutoFocusNextDirective,
    JMartErrorNotifyDirective,
    JMartEngineSyncDirective,
    JMartAutoFocusDirective,
    RouterLink
  ],
  templateUrl: './login.html',
})
export class Login implements OnInit {
  public appState = inject(AppStateService);
  private storage = inject(TokenStorageService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private engine = inject(JMartMassiveValidationService);
  public notify = inject(NotificationService);
  private translate = inject(TranslateService);
  private langService = inject(LanguageService);
  private loader = inject(LoaderService);
  private cdr = inject(ChangeDetectorRef);

  isSubmitting = false;
  private requestLocation = inject(RequestLocationService);

  loginRequest: LoginRequest = { ...EMPTY_USER_SETTING };

  ngOnInit(): void {
    this.loadLoginConfig();

    this.translate.onLangChange.subscribe(() => {
      this.reloadLoginConfig();
    });
  }

  private reloadLoginConfig(): void {
    this.engine.resetRules();
    this.engine.clearErrors();
    this.loadLoginConfig();
  }

  loadLoginConfig(): void {
    this.engine.resetRules();
    this.engine.clearFieldsMeta();

    const fieldMeta = this.translate.instant('login.form.fieldMeta') || {};
    const validations = this.translate.instant('login.form.validations') || {};

    for (const [fieldId, meta] of Object.entries(fieldMeta as Record<string, any>)) {
      this.engine.addFieldMeta({
        id: fieldId,
        label: meta?.label ?? '',
        tooltip: meta?.tooltip ?? '',
        tooltipIconClass: meta?.tooltipIconClass ?? ''
      });
    }

    for (const [fieldId, fieldConfig] of Object.entries(validations as Record<string, any>)) {
      const rules = fieldConfig?.data || {};

      for (const rule of Object.values(rules) as any[]) {
        const value = rule?.value ?? '';

        this.engine.addRule({
          id: fieldId,
          condition: String(rule?.rule ?? '').trim(),
          when: String(rule?.when ?? '').trim(),
          value: String(value ?? ''),
          message: String(rule?.msj ?? '').replace('{value}', String(value ?? '')),
          classIconSuccess: rule?.classIconSuccess ?? '',
          classIconError: rule?.classIconError ?? ''
        });
      }
    }

    this.engine.patchValues({
      identifier: this.loginRequest.identifier ?? '',
      password: this.loginRequest.password ?? '',
    });

    this.engine.clearErrors();
  }

  public async iniciarSesion(): Promise<void> {
    if (this.isSubmitting) {
      return;
    }

    const ok = this.engine.validateAll();

    if (!ok) {
      this.notify.show(
        this.notify.errorFortmat(this.engine.getGroupedErrorsSnapshot()),
        '',
        'warning'
      );
      return;
    }

    this.engine.clearErrors();
    this.notify.close();
    this.isSubmitting = true;

    this.loader.show();
    try {
      await this.requestLocation.ensureFreshLocation();
      this.loader.hide();
    } catch {
      // continue without browser location
      this.loader.hide();
    }

    this.auth.login(this.loginRequest)
      .pipe(finalize(() => { this.isSubmitting = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: (res: any) => {
          if (res?.messageCode === 'SECOND_FACTOR_REQUIRED' && res?.codigo === 200) {
            const identifier = res?.data?.identifier || res?.data?.user?.user;
            const devCode = res?.data?.devCode;
            const expiresAt = res?.data?.twoFactor?.expiresAt;
            const serverNow = res?.data?.twoFactor?.serverNow;


            if (identifier) {
              localStorage.setItem('pending_2fa_identifier', identifier);
            } else {
              localStorage.removeItem('pending_2fa_identifier');
            }

            if (expiresAt) {
              localStorage.setItem('pending_2fa_expires_at', expiresAt);
            } else {
              localStorage.removeItem('pending_2fa_expires_at');
            }

            if (serverNow) {
              localStorage.setItem('pending_2fa_server_now', serverNow);
            } else {
              localStorage.removeItem('pending_2fa_server_now');
            }

            if (devCode) {
              localStorage.setItem('dev_2fa_code', devCode);
            } else {
              localStorage.removeItem('dev_2fa_code');
            }

            this.router.navigate(['/two-factor']);
            return;
          }

          if (res?.messageCode === 'LOGIN_SUCCESS' && res?.codigo === 200) {
            const accessToken = res?.data?.accessToken;
            const user = res?.data?.user;

            if (!accessToken) {
              this.notify.show(
                this.translate.instant('interceptor.errors.refreshNoAccessToken'),
                this.translate.instant('interceptor.errors.genericTitle'),
                'warning'
              );
              return;
            }

            this.storage.setAccessToken(accessToken);

            localStorage.removeItem('pending_2fa_identifier');
            localStorage.removeItem('pending_2fa_expires_at');
            localStorage.removeItem('pending_2fa_server_now');
            localStorage.removeItem('dev_2fa_code');

            if (user) {
              localStorage.setItem('user', JSON.stringify(user));
            } else {
              localStorage.removeItem('user');
            }


            sessionStorage.removeItem('force-logout');

            const targetRoute = this.getFirstAllowedRoute(user);
            this.router.navigate([targetRoute]);
            return;
          }

          this.notify.show(
            this.translate.instant('interceptor.errors.unexpected'),
            this.translate.instant('interceptor.errors.genericTitle'),
            'warning'
          );
        },
        error: (err: any) => {
          const apiErr = err?.error ?? err;
          if (apiErr?.codigo === 428 && apiErr?.messageCode === 'PASSWORD_CHANGE_REQUIRED') {
            this.notify.showFromApiResponse(apiErr, this.translate.instant('interceptor.errors.genericTitle'));
            return;
          }

          this.notify.showFromApiResponse(apiErr, 'Error');
        }
      });
  }


  private getFirstAllowedRoute(user: any): string {
    const permissions = user?.permissionsByRoute ?? {};

    const preferredRoutes = [
      '/dashboard'
    ];

    for (const route of preferredRoutes) {
      if (permissions?.[route]?.View === true) {
        return route;
      }
    }

    const firstAllowed = Object.entries(permissions).find(
      ([, value]: any) => value?.View === true
    )?.[0];

    return (firstAllowed as string) || '/dashboard';
  }
  changeLang(lang: AppLang): void {
    this.langService.changeLang(lang);
  }

  public forgotPassword(): void {
    this.router.navigate(['forgot-password'], { replaceUrl: true });
  }


  private logoError = signal(false);

  headerLogoSrc = computed(() => {
    const logo = this.appState.logoUrl()?.trim();

    if (this.logoError() || !logo) {
      return 'assets/img/logo.webp';
    }

    return logo;
  });

  onHeaderLogoError(): void {
    this.logoError.set(true);
  }



}