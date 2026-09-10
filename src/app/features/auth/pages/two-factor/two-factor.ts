import {
    ChangeDetectorRef,
    Component,
    NgZone,
    OnDestroy,
    OnInit,
    PLATFORM_ID,
    inject
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, interval, Subscription } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { AuthService } from '../../../../core/auth/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { LoaderService } from '../../../../core/services/loader.service';
import { AppStateService } from '../../../../core/services/app-state.service';
import { TokenStorageService } from '../../../../core/auth/services/token-storage.service';
import { RequestLocationService } from '../../../../core/services/request-location.service';

@Component({
    selector: 'app-two-factor',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, TranslateModule],
    templateUrl: './two-factor.html',
    styleUrl: './two-factor.scss'
})
export class TwoFactor implements OnInit, OnDestroy {
    public appState = inject(AppStateService);

    private fb = inject(FormBuilder);
    private auth = inject(AuthService);
    private router = inject(Router);
    private notify = inject(NotificationService);
    private loader = inject(LoaderService);
    protected translate = inject(TranslateService);
    private storage = inject(TokenStorageService);
    private requestLocation = inject(RequestLocationService);

    private cdr = inject(ChangeDetectorRef);
    private zone = inject(NgZone);
    private platformId = inject(PLATFORM_ID);

    private countdownSub?: Subscription;

    private get isBrowser(): boolean {
        return isPlatformBrowser(this.platformId);
    }

    verifying = false;
    resending = false;
    identifier = '';
    devCode: string | null = null;
    rememberDevice = false;

    digits: string[] = ['', '', '', '', '', ''];

    expiresAt: string | null = null;
    countdownText = '00:00';
    expired = false;
    remainingSeconds = 0;
    serverOffset = 0;

    form = this.fb.nonNullable.group({
        code: ['']
    });

    ngOnInit(): void {
        if (!this.isBrowser) {
            return;
        }

        const pendingIdentifier = localStorage.getItem('pending_2fa_identifier') || '';
        const pendingExpiresAt = localStorage.getItem('pending_2fa_expires_at');
        const pendingServerNow = localStorage.getItem('pending_2fa_server_now');

        if (!pendingIdentifier || !pendingExpiresAt) {
            this.router.navigate(['/login'], { replaceUrl: true });
            return;
        }

        this.identifier = pendingIdentifier;
        this.expiresAt = pendingExpiresAt;
        this.devCode = localStorage.getItem('dev_2fa_code');

        if (pendingServerNow) {
            const serverTime = new Date(pendingServerNow).getTime();
            const clientTime = Date.now();
            this.serverOffset = serverTime - clientTime;
        } else {
            this.serverOffset = 0;
        }

        this.startCountdown();
    }

    ngOnDestroy(): void {
        this.countdownSub?.unsubscribe();
    }

    onDigitInput(event: Event, index: number): void {
        if (this.expired) {
            return;
        }

        const input = event.target as HTMLInputElement;
        const value = (input.value || '').replace(/\D/g, '');

        if (!value) {
            this.digits[index] = '';
            input.value = '';
            this.syncCode();
            return;
        }

        this.digits[index] = value[0];
        input.value = value[0];

        this.syncCode();

        const next = this.getNextInput(input);

        if (next) {
            next.focus();
            next.select();
        }
    }

    onPaste(event: ClipboardEvent): void {
        if (this.expired) {
            event.preventDefault();
            return;
        }

        event.preventDefault();

        const pasted = event.clipboardData?.getData('text') || '';
        const clean = pasted.replace(/\D/g, '').slice(0, 6);

        if (!clean) {
            return;
        }

        this.fillDigits(clean);
    }

    onKeyDown(event: KeyboardEvent, index: number): void {
        const input = event.target as HTMLInputElement;

        if (event.key === 'Backspace') {
            if (input.value) {
                this.digits[index] = '';
                input.value = '';
                this.syncCode();
                return;
            }

            const prev = this.getPrevInput(input);

            if (prev) {
                prev.focus();
                prev.select();
            }
        }
    }

    async submit(): Promise<void> {
        if (this.verifying || this.resending) {
            return;
        }

        const code = this.digits.join('');

        if (!this.identifier) {
            this.router.navigate(['/login'], { replaceUrl: true });
            return;
        }

        if (this.expired) {
            this.notify.show(
                this.translate.instant('twoFactor.expired'),
                this.translate.instant('modal.types.warning.title'),
                'warning'
            );
            return;
        }

        if (code.length !== 6) {
            this.notify.show(
                this.translate.instant('twoFactor.validations.codeLength'),
                this.translate.instant('modal.types.warning.title'),
                'warning'
            );
            return;
        }


        try {
            this.loader.show();
            await this.requestLocation.ensureFreshLocation();
            this.loader.hide();
        } catch {
            // continue without browser location
             this.loader.hide();
        }

        this.verifying = true;
      

        this.auth.verifyTwoFactor({
            identifier: this.identifier,
            code,
            rememberDevice: this.rememberDevice
        })
            .pipe(
                finalize(() => {
                    this.verifying = false;
                    this.loader.hide();
                    this.cdr.markForCheck();
                })
            )
            .subscribe({
                next: (res: any) => {
                    if (res?.messageCode === 'SECOND_FACTOR_SUCCESS' && res?.codigo === 200) {
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

                        this.clearPendingTwoFactor();

                        if (user) {
                            localStorage.setItem('user', JSON.stringify(user));
                        } else {
                            localStorage.removeItem('user');
                        }

                        sessionStorage.removeItem('force-logout');

                        const targetRoute = this.getFirstAllowedRoute(user);
                        this.router.navigate([targetRoute], { replaceUrl: true });
                        return;
                    }

                    this.notify.show(
                        this.translate.instant('interceptor.errors.unexpected'),
                        this.translate.instant('interceptor.errors.genericTitle'),
                        'warning'
                    );
                },
                error: (err: any) => {
                    this.notify.showFromApiResponse(
                        err?.error ?? err,
                        this.translate.instant('modal.types.error.title')
                    );
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
    resendCode(): void {
        if (!this.identifier || this.resending || this.verifying) {
            return;
        }

        this.resending = true;
        this.auth.resendTwoFactor({ identifier: this.identifier })
            .pipe(finalize(() => {
                this.resending = false;
                this.cdr.markForCheck();
            }))
            .subscribe({
                next: (res: any) => {
                    const expiresAt = res?.data?.twoFactor?.expiresAt;
                    const serverNow = res?.data?.twoFactor?.serverNow;
                    const devCode = res?.data?.devCode;

                    if (expiresAt) {
                        this.expiresAt = expiresAt;
                        localStorage.setItem('pending_2fa_expires_at', expiresAt);
                    }

                    if (serverNow) {
                        localStorage.setItem('pending_2fa_server_now', serverNow);
                        const serverTime = new Date(serverNow).getTime();
                        const clientTime = Date.now();
                        this.serverOffset = serverTime - clientTime;
                    }

                    if (typeof devCode === 'string' && devCode) {
                        this.devCode = devCode;
                        localStorage.setItem('dev_2fa_code', devCode);
                    } else {
                        this.devCode = null;
                        localStorage.removeItem('dev_2fa_code');
                    }

                    this.fillDigits('');
                    this.expired = false;
                    this.startCountdown();
                    this.notify.showFromApiResponse(res, this.translate.instant('modal.types.success.title'));
                },
                error: (err: any) => {
                    this.notify.showFromApiResponse(err?.error ?? err, this.translate.instant('modal.types.error.title'));
                }
            });
    }

    backToLogin(): void {
        this.auth.clearSession();
        this.clearPendingTwoFactor();
        this.router.navigate(['/login'], { replaceUrl: true });
    }

    private startCountdown(): void {
        if (!this.isBrowser) {
            return;
        }

        this.countdownSub?.unsubscribe();

        this.updateCountdown();
        this.cdr.detectChanges();

        this.countdownSub = interval(1000).subscribe(() => {
            this.zone.run(() => {
                this.updateCountdown();
                this.cdr.detectChanges();
            });
        });
    }

    private updateCountdown(): void {
        if (!this.expiresAt) {
            this.expired = true;
            this.remainingSeconds = 0;
            this.countdownText = '00:00';
            return;
        }

        const end = new Date(this.expiresAt).getTime();

        if (isNaN(end)) {
            this.expired = true;
            this.remainingSeconds = 0;
            this.countdownText = '00:00';
            return;
        }

        const now = Date.now() + this.serverOffset;
        const diff = Math.max(0, Math.floor((end - now) / 1000));

        this.remainingSeconds = diff;
        this.expired = diff <= 0;

        const minutes = Math.floor(diff / 60);
        const seconds = diff % 60;

        this.countdownText =
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        if (diff <= 0) {
            this.countdownSub?.unsubscribe();
        }
    }

    private fillDigits(code: string): void {
        if (!this.isBrowser) {
            return;
        }

        const inputs = document.querySelectorAll<HTMLInputElement>('.fauth-otp-input');

        this.digits = ['', '', '', '', '', ''];

        const chars = code.split('');

        for (let i = 0; i < 6; i++) {
            const value = chars[i] || '';

            this.digits[i] = value;

            if (inputs[i]) {
                inputs[i].value = value;
            }
        }

        this.syncCode();
    }

    private syncCode(): void {
        const code = this.digits.join('');

        this.form.patchValue(
            { code },
            { emitEvent: false }
        );

        if (code.length === 6 && !this.verifying && !this.expired) {
            setTimeout(() => {
                this.submit();
            }, 120);
        }
    }

    private getNextInput(current: HTMLInputElement): HTMLInputElement | null {
        let next = current.nextElementSibling as HTMLElement | null;

        while (next) {
            if (next instanceof HTMLInputElement && next.classList.contains('fauth-otp-input')) {
                return next;
            }

            next = next.nextElementSibling as HTMLElement | null;
        }

        return null;
    }

    private getPrevInput(current: HTMLInputElement): HTMLInputElement | null {
        let prev = current.previousElementSibling as HTMLElement | null;

        while (prev) {
            if (prev instanceof HTMLInputElement && prev.classList.contains('fauth-otp-input')) {
                return prev;
            }

            prev = prev.previousElementSibling as HTMLElement | null;
        }

        return null;
    }

    private clearPendingTwoFactor(): void {
        if (!this.isBrowser) {
            return;
        }

        localStorage.removeItem('pending_2fa_identifier');
        localStorage.removeItem('pending_2fa_expires_at');
        localStorage.removeItem('pending_2fa_server_now');
        localStorage.removeItem('dev_2fa_code');
    }
}