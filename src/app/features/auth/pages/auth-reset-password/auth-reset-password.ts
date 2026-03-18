import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnDestroy, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { AppStateService } from '../../../../core/services/app-state.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import {
  JMartAutoFocusNextDirective,
  JMartEngineSyncDirective,
  JMartErrorNotifyDirective,
  JMartMassiveValidationService
} from '@JairMartinez86/jmartinez-validator';

@Component({
  selector: 'app-auth-reset-password',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    JMartAutoFocusNextDirective,
    JMartErrorNotifyDirective,
    JMartEngineSyncDirective
  ],
  templateUrl: './auth-reset-password.html',
  styleUrl: './auth-reset-password.scss'
})
export class AuthResetPassword implements OnDestroy {
  public appState = inject(AppStateService);

  private platformId = inject(PLATFORM_ID);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  public notify = inject(NotificationService);
  public translate = inject(TranslateService);
  private engine = inject(JMartMassiveValidationService);

  ResetPasswordRequest: any = {
    token: '',
    newPassword: '',
    confirmPassword: ''
  };

  expiresAt: string | null = null;
  serverOffset = 0;
  private timerId: number | null = null;

  remainingSeconds = signal(0);
  expired = signal(false);

  remainingTimeFormatted = computed(() => {
    const total = this.remainingSeconds();
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  });

  ngOnInit(): void {
    this.loadLoginConfig();

    this.route.queryParamMap.subscribe(params => {
      const token = params.get('token') || '';
      const expiresAt = params.get('expiresAt');
      const serverNow = params.get('serverNow');

      if (!token) {
        if (isPlatformBrowser(this.platformId)) {
          this.notify.show(
            this.translate.instant('resetPassword.invalidToken'),
            this.translate.instant('modal.types.warning.title'),
            'warning'
          );

          this.router.navigate(['/login'], { replaceUrl: true });
        }
        return;
      }

      this.ResetPasswordRequest.token = token;
      this.expiresAt = expiresAt || null;

      if (!isPlatformBrowser(this.platformId)) {
        return;
      }

      if (serverNow) {
        const serverTime = new Date(serverNow).getTime();
        const clientTime = Date.now();
        this.serverOffset = serverTime - clientTime;
      } else {
        this.serverOffset = 0;
      }

      if (this.expiresAt) {
        this.startCountdown(this.expiresAt);
      }
    });
  }

  ngOnDestroy(): void {
    this.stopCountdown();
  }


  loadLoginConfig(): void {
  this.engine.resetRules();
  this.engine.clearFieldsMeta();


  const fieldMeta = this.translate.instant('resetPassword.form.fieldMeta') || {};
  const validations = this.translate.instant('resetPassword.form.validations') || {};

  this.ResetPasswordRequest = {
    ...this.ResetPasswordRequest,
    ...{ identifier: ""}
  };

  /* =========================
     REGISTRAR META DEL CAMPO
  ========================= */

  for (const [fieldId, meta] of Object.entries(fieldMeta as Record<string, any>)) {
    this.engine.addFieldMeta({
      id: fieldId,
      label: meta?.label ?? '',
      tooltip: meta?.tooltip ?? '',
      tooltipIconClass: meta?.tooltipIconClass ?? ''
    });
  }

  /* =========================
     REGISTRAR REGLAS
  ========================= */

  for (const [fieldId, fieldConfig] of Object.entries(validations as Record<string, any>)) {
    const rules = fieldConfig?.data || {};

    for (const rule of Object.values(rules) as any[]) {
      const value = String(rule?.value ?? '');

      let message = String(rule?.msj ?? '');
      message = message.replace('{value}', value);

      this.engine.addRule({
        id: fieldId,
        condition: String(rule?.rule ?? '').trim(),
        when: String(rule?.when ?? '').trim(),
        value,
        message,
        classIconSuccess: rule?.classIconSuccess ?? '',
        classIconError: rule?.classIconError ?? ''
      });
    }
  }

  this.engine.patchValues({
    email: this.ResetPasswordRequest.email ?? '',
    code: this.ResetPasswordRequest.code ?? '',
    newPassword: this.ResetPasswordRequest.newPassword ?? '',
    confirmPassword: this.ResetPasswordRequest.confirmPassword ?? ''
  });

  this.engine.clearErrors();
}

  private startCountdown(expiresAtIso: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.stopCountdown();

    const expiresMs = new Date(expiresAtIso).getTime();

    if (isNaN(expiresMs)) {
      this.expired.set(true);
      this.remainingSeconds.set(0);
      return;
    }

    this.updateCountdown(expiresMs);

    this.timerId = window.setInterval(() => {
      this.updateCountdown(expiresMs);
    }, 1000);
  }

  private updateCountdown(expiresMs: number): void {
    const nowMs = Date.now() + this.serverOffset;
    const diffSeconds = Math.floor((expiresMs - nowMs) / 1000);

    this.remainingSeconds.set(Math.max(diffSeconds, 0));
    this.expired.set(diffSeconds <= 0);

    console.log('remainingSeconds', this.remainingSeconds());

    if (this.expired()) {
      this.stopCountdown();
    }
  }

  private stopCountdown(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  public resetPassword(): void {
    if (this.expired()) {
      this.notify.show(
        this.translate.instant('resetPassword.expired'),
        this.translate.instant('modal.types.warning.title'),
        'warning'
      );
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

    if (!this.ResetPasswordRequest.token) {
      this.notify.show(
        this.translate.instant('resetPassword.invalidToken'),
        this.translate.instant('modal.types.warning.title'),
        'warning'
      );
      return;
    }

    if (this.ResetPasswordRequest.newPassword !== this.ResetPasswordRequest.confirmPassword) {
      this.notify.show(
        this.translate.instant('resetPassword.passwordsDoNotMatch'),
        this.translate.instant('modal.types.warning.title'),
        'warning'
      );
      return;
    }

    this.auth.resetPassword({
      token: this.ResetPasswordRequest.token,
      newPassword: this.ResetPasswordRequest.newPassword
    }).subscribe({
      next: (res) => {
        this.notify.showFromApiResponse(
          res,
          this.translate.instant('modal.types.success.title')
        );

        this.router.navigate(['/login'], { replaceUrl: true });
      },
      error: (err) => {
        this.notify.showFromApiResponse(
          err?.error ?? err,
          this.translate.instant('modal.types.error.title')
        );
      }
    });
  }

  public goLogin(): void {
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}