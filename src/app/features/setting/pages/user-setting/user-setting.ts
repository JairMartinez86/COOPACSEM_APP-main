import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
  inject
} from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  JMartAutoFocusNextDirective,
  JMartEngineSyncDirective,
  JMartErrorNotifyDirective,
  JMartMassiveValidationService,
  JMartAutoFocusDirective
} from '@JairMartinez86/jmartinez-validator';

import { finalize, map, Observable, of, Subscription } from 'rxjs';
import { FormsModule, NgForm } from '@angular/forms';
import { Breadcrumb } from '../../../../shared/components/breadcrumb/breadcrumb';
import { CanComponentDeactivate } from '../../../../core/guards/pending-changes.guard';
import { NotificationService } from '../../../../core/services/notification.service';
import { LanguageService } from '../../../../core/services/languageService';
import { ThemeService } from '../../../../core/services/theme.service';
import { DraftFormService, DraftManagerRef } from '../../../../core/services/draft-manager-options.service';
import { EMPTY_USER_SETTING, UserSettingRequest } from '../../interface/user-setting.interface';
import { UserSettingService } from '../../services/user-setting.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AppPermissionDirective } from '../../../../core/services/app-permission.directive';
import { UserSummaryDto } from '../../services/user-list.service';

@Component({
  selector: 'app-user-setting',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    JMartAutoFocusNextDirective,
    JMartErrorNotifyDirective,
    JMartEngineSyncDirective,
    JMartAutoFocusDirective,
    Breadcrumb,
    RouterLink,
    AppPermissionDirective
  ],
  templateUrl: './user-setting.html',
  styleUrl: './user-setting.scss',
})
export class UserSettingComponent implements OnInit, AfterViewInit, OnDestroy, CanComponentDeactivate {
  public engine = inject(JMartMassiveValidationService);
  public notify = inject(NotificationService);
  private translate = inject(TranslateService);
  private langService = inject(LanguageService);
  public userSettingService = inject(UserSettingService);
  private readonly route = inject(ActivatedRoute);
  private themeService = inject(ThemeService);
  private draftService = inject(DraftFormService);

  @ViewChild('userSettingForm') userSettingForm?: NgForm;

  private langChangeSub?: Subscription;
  private draftRef?: DraftManagerRef;
  private formReady = false;
  private dataReady = false;
  selectedUserIdentifier = '';
  viewingExternalUser = false;

  currentTheme: 'light' | 'dark' = 'light';
  passwordTime = { part1: '', part2: '', anios: 0, meses: 0, dias: 0 };

  setting: UserSettingRequest = { ...EMPTY_USER_SETTING };
  copy: UserSettingRequest = { ...EMPTY_USER_SETTING };

  languages: any[] = [];

  breadcrumbs = [
    { label: '', url: '' },
    { label: '', url: '/' },
    { label: '' }
  ];

  constructor() { }

  ngOnInit(): void {
    this.languages = this.langService.getAvailableLanguages();
    this.setting.Language = this.langService.getCurrentLang();

    this.route.queryParamMap.subscribe(params => {
      this.selectedUserIdentifier = (params.get('user') || '').trim();
      this.viewingExternalUser = this.selectedUserIdentifier.length > 0;
      this.loadLoginConfig();
      this.loadUserSettings(this.selectedUserIdentifier || undefined);
    });

    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.languages = this.langService.getAvailableLanguages();
      this.reloadLoginConfig(false);
    });
  }

  ngAfterViewInit(): void {
    this.formReady = true;
    this.tryInitDraftManager();
  }

  ngOnDestroy(): void {
    this.langChangeSub?.unsubscribe();
    this.draftRef?.destroy();
  }

  private tryInitDraftManager(): void {
    if (!this.formReady || !this.dataReady || this.draftRef || !this.userSettingForm) {
      return;
    }

    this.draftRef = this.draftService.connect<UserSettingRequest>({
      form: this.userSettingForm,
      routeKey: 'user-setting',
      currentData: () => ({
        ...this.setting,
        Password: '',
        NewPassword: '',
        ConfirmPassword: ''
      }),
      savedData: () => ({
        ...this.copy,
        Password: '',
        NewPassword: '',
        ConfirmPassword: ''
      }),
      restoreData: (data) => {
        this.setting = {
          ...EMPTY_USER_SETTING,
          ...this.copy,
          ...data,
          Password: '',
          NewPassword: '',
          ConfirmPassword: ''
        };
      },
      restoreSavedData: (data) => {
        this.copy = {
          ...EMPTY_USER_SETTING,
          ...data,
          Password: '',
          NewPassword: '',
          ConfirmPassword: ''
        };
      },
      patchEngine: (data) => {
        this.engine.patchValues(data);
        this.engine.clearErrors();

        const theme = (data.Theme || 'light') as 'light' | 'dark';
        this.themeService.setTheme(theme);
        this.setting.Theme = theme;
      },
      normalize: (data) => this.normalizeSetting(data),
      warningTitleKey: 'draft.unsavedDataTitle',
      warningMessageKey: 'draft.unsavedDataRestored'
    });
  }

  private patchEngineFromSetting(): void {
    this.engine.patchValues(this.setting);
  }

  private reloadLoginConfig(resetData: boolean = false): void {
    this.engine.resetRules();
    this.engine.clearErrors();
    this.loadLoginConfig(resetData);

    this.patchEngineFromSetting();

    const tiempo = this.calcularTiempo(
      this.setting.PasswordChangedAtUtc,
      this.langService.getCurrentLang()
    );

    this.passwordTime = tiempo;
  }

  loadLoginConfig(resetData: boolean = false): void {
    this.engine.resetRules();
    this.engine.clearFieldsMeta();

    const fieldMeta = this.translate.instant('userSettings.form.fieldMeta') || {};
    const validations = this.translate.instant('userSettings.form.validations') || {};
    this.breadcrumbs = this.translate.instant('userSettings.breadcrumbs') || [];

    if (resetData) {
      this.setting = {
        ...EMPTY_USER_SETTING
      };

      this.copy = {
        ...EMPTY_USER_SETTING,
      };
    }

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
          value,
          message: String(rule?.msj ?? '').replace('{value}', value ?? ''),
          classIconSuccess: rule?.classIconSuccess ?? '',
          classIconError: rule?.classIconError ?? ''
        });
      }
    }
  }

  loadUserSettings(user?: string): void {
    this.userSettingService.getUserSettings(user)
      .pipe(finalize(() => { }))
      .subscribe({
        next: (res: any) => {
          const apiSetting = res?.data?.setting ?? {};

          this.copy = {
            identifier: apiSetting.identifier ?? '',
            FullName: apiSetting.FullName ?? apiSetting.fullName ?? '',
            Email: apiSetting.Email ?? apiSetting.email ?? '',
            Mobile: apiSetting.Cellular ?? apiSetting.mobile ?? '',
            PhoneNumber: apiSetting.PhoneNumber ?? apiSetting.phoneNumber ?? '',
            Address: apiSetting.Address ?? apiSetting.address ?? '',
            Theme: apiSetting.Theme ?? apiSetting.theme ?? '',
            Language: apiSetting.Language ?? apiSetting.language ?? '',
            DefaultLandingPage: apiSetting.DefaultLandingPage ?? apiSetting.defaultLandingPage ?? '',
            EnableTwoFactorLogin: apiSetting.EnableTwoFactorLogin ?? apiSetting.enableTwoFactorLogin ?? false,
            EnableAuditEmailNotifications: apiSetting.EnableAuditEmailNotifications ?? apiSetting.enableAuditEmailNotifications ?? false,
            SessionActive: apiSetting.sessionActive ?? 0,
            MaxSessions: apiSetting.maxSessions ?? 0,
            PasswordChangedAtUtc: apiSetting.passwordChangedAtUtc ?? '',
            Password: '',
            NewPassword: '',
            ConfirmPassword: ''
          };

          this.setting = { ...this.copy };

          this.patchEngineFromSetting();
          this.engine.clearErrors();

          const tiempo = this.calcularTiempo(
            this.setting.PasswordChangedAtUtc,
            this.langService.getCurrentLang()
          );

          this.passwordTime = tiempo;

          const theme = (this.setting.Theme || 'light') as 'light' | 'dark';
          this.themeService.setTheme(theme);
          this.setting.Theme = theme;

          this.dataReady = true;
          this.tryInitDraftManager();
        },
        error: (err: any) => {
          this.notify.showFromApiResponse(err?.error ?? err, 'Error');
        }
      });
  }

  calcularTiempo(
    fechaUtc: string | Date,
    lang: string
  ): { part1: string; part2: string; anios: number; meses: number; dias: number } {
    const fecha = typeof fechaUtc === 'string'
      ? new Date(fechaUtc.replace(' ', 'T'))
      : new Date(fechaUtc);

    const ahora = new Date();
    let diffMs = ahora.getTime() - fecha.getTime();

    if (diffMs < 0) diffMs = 0;

    const totalDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const anios = Math.floor(totalDias / 365);
    const diasRestantes = totalDias % 365;
    const meses = Math.floor(diasRestantes / 30);
    const dias = diasRestantes % 30;

    const t = lang === 'en'
      ? { year: 'year', years: 'years', month: 'month', months: 'months', day: 'day', days: 'days' }
      : { year: 'año', years: 'años', month: 'mes', months: 'meses', day: 'día', days: 'días' };

    let part1 = '';
    let part2 = '';

    if (anios > 0) {
      part1 = `${anios} ${anios === 1 ? t.year : t.years}`;
      part2 = meses > 0
        ? `${meses} ${meses === 1 ? t.month : t.months}`
        : `${dias} ${dias === 1 ? t.day : t.days}`;
    } else if (meses > 0) {
      part1 = `${meses} ${meses === 1 ? t.month : t.months}`;
      part2 = `${dias} ${dias === 1 ? t.day : t.days}`;
    } else {
      part1 = '';
      part2 = `${dias} ${dias === 1 ? t.day : t.days}`;
    }

    return { part1, part2, anios, meses, dias };
  }

  changeLanguage(lang: string, event?: Event): void {
    event?.preventDefault();

    if (lang === this.langService.getCurrentLang()) return;

    this.setting = {
      ...this.setting,
      Language: lang
    };

    this.draftRef?.saveNow();
    this.langService.changeLang(lang as any);
  }

  onCancel(): void {
    this.notify.close();
    this.draftRef?.cancel();

    const tiempo = this.calcularTiempo(
      this.setting.PasswordChangedAtUtc,
      this.langService.getCurrentLang()
    );
    this.passwordTime = tiempo;

    this.patchEngineFromSetting();
    this.engine.clearErrors();
  }

  changeTheme(theme: 'light' | 'dark'): void {
    this.setting.Theme = theme;
    this.themeService.setTheme(theme);
    this.draftRef?.saveNow();
  }

  onSave(): void {
    const ok = this.engine.validateAll();

    if (!ok) {
      this.notify.show(this.engine.getGroupedErrorsHtmlSnapshot(), '', 'warning');
      return;
    }

    this.engine.clearErrors();
    this.notify.close();

    this.userSettingService.putUserSettings(this.setting, this.selectedUserIdentifier || undefined)
      .pipe(finalize(() => { }))
      .subscribe({
        next: (res: any) => {
          this.setting = {
            ...this.setting,
            Password: '',
            NewPassword: '',
            ConfirmPassword: ''
          };

          this.copy = {
            ...this.setting,
            Password: '',
            NewPassword: '',
            ConfirmPassword: ''
          };

          this.patchEngineFromSetting();
          this.engine.clearErrors();
          this.draftRef?.clear();

          const tiempo = this.calcularTiempo(
            this.setting.PasswordChangedAtUtc,
            this.langService.getCurrentLang()
          );
          this.passwordTime = tiempo;

          this.notify.showFromApiResponse(res, 'success');
        },
        error: (err: any) => {
          this.notify.showFromApiResponse(err?.error ?? err, 'Error');
        }
      });
  }

  @HostListener('window:beforeunload', ['$event'])
  handleBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.hasUnsavedChanges()) {
      return;
    }

    this.draftRef?.saveNow();
    event.preventDefault();
    event.returnValue = '';
  }

  @HostListener('window:pagehide')
  handlePageHide(): void {
    if (this.hasUnsavedChanges()) {
      this.draftRef?.saveNow();
    }
  }

  private normalizeSetting(
    data: Partial<UserSettingRequest> | null | undefined
  ): Partial<UserSettingRequest> {
    return {
      identifier: data?.identifier ?? '',
      FullName: data?.FullName ?? '',
      Email: data?.Email ?? '',
      Mobile: data?.Mobile ?? '',
      PhoneNumber: data?.PhoneNumber ?? '',
      Address: data?.Address ?? '',
      Theme: data?.Theme ?? '',
      Language: data?.Language ?? '',
      DefaultLandingPage: data?.DefaultLandingPage ?? '',
      EnableTwoFactorLogin: !!data?.EnableTwoFactorLogin,
      EnableAuditEmailNotifications: !!data?.EnableAuditEmailNotifications,
      SessionActive: data?.SessionActive ?? 0,
      MaxSessions: data?.MaxSessions ?? 0,
      PasswordChangedAtUtc: data?.PasswordChangedAtUtc ?? '',
      Password: '',
      NewPassword: '',
      ConfirmPassword: ''
    };
  }

  private hasUnsavedChanges(): boolean {
    const current = this.normalizeSetting(this.setting);
    const saved = this.normalizeSetting(this.copy);

    return JSON.stringify(current) !== JSON.stringify(saved);
  }

 
  canDeactivate(): boolean | Observable<boolean> {
  const forceLogout = sessionStorage.getItem('force-logout') === '1';
  if (forceLogout) {
    return true;
  }

  if (!this.hasUnsavedChanges()) {
    return true;
  }

  const title =
    this.translate.instant('draft.leavePageTitle') || 'Warning';

  const message =
    this.translate.instant('draft.leavePageMessage') ||
    'You have unsaved changes. If you leave this page, they will be lost. Do you want to continue?';

  const ref = this.notify.confirm(message, title, 'warning');

  if (!ref) {
    return of(false);
  }

  return ref.pipe(
    map((result: number) => {
      if (result === 1) {
        this.draftRef?.clear();
        return true;
      }

      return false;
    })
  );
}

  formatLastActive(user: UserSummaryDto): string {
    const value = user.lastActiveAtUtc;

    if (!value) {
      return this.translate.instant('userlist.userlist.presence.never');
    }

    const date = new Date(value);
    const diffMs = Date.now() - date.getTime();

    if (diffMs < 60000) {
      return this.translate.instant('userlist.userlist.presence.justNow');
    }

    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) {
      return this.translate.instant('userlist.userlist.presence.minutesAgo', { value: diffMin });
    }

    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) {
      return this.translate.instant('userlist.userlist.presence.hoursAgo', { value: diffHours });
    }

    const diffDays = Math.floor(diffHours / 24);
    return this.translate.instant('userlist.userlist.presence.daysAgo', { value: diffDays });
  }
}