// =============================
// IMPORTACIONES
// =============================
import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
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
import { TokenStorageService } from '../../../../core/auth/token-storage';

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

  // Motor de validaciones
  public engine = inject(JMartMassiveValidationService);

  // Servicio de notificaciones
  public notify = inject(NotificationService);

  // Servicio de traducciones
  private translate = inject(TranslateService);

  // Servicio de idiomas
  private langService = inject(LanguageService);

  // Servicio API de configuración de usuario
  public userSettingService = inject(UserSettingService);

  // Ruta actual para obtener query params
  private readonly route = inject(ActivatedRoute);

  // Servicio de tema
  private themeService = inject(ThemeService);

  // Servicio de drafts
  private draftService = inject(DraftFormService);

  // Referencia al formulario template-driven
  @ViewChild('userSettingForm') userSettingForm?: NgForm;

  // Subscripción al cambio de idioma
  private langChangeSub?: Subscription;

  // Referencia al draft manager
  private draftRef?: DraftManagerRef;

  private cdr = inject(ChangeDetectorRef);

  private storage = inject(TokenStorageService);


  // Flags para saber cuándo inicializar el draft manager
  private formReady = false;
  private dataReady = false;

  // Usuario seleccionado desde query param
  selectedUserIdentifier = '';

  // Indica si se está viendo configuración de un usuario externo
  viewingExternalUser = false;

  // Tema actual
  currentTheme: 'light' | 'dark' = 'light';

  // Tiempo transcurrido desde cambio de contraseña
  passwordTime = { part1: '', part2: '', anios: 0, meses: 0, dias: 0 };

  // Modelo actual
  setting: UserSettingRequest = { ...EMPTY_USER_SETTING };

  // Copia base para detectar cambios
  copy: UserSettingRequest = { ...EMPTY_USER_SETTING };

  // Idiomas disponibles
  languages: any[] = [];

  // Breadcrumbs
  breadcrumbs = [
    { label: '', url: '' },
    { label: '', url: '/' },
    { label: '' }
  ];

  constructor() { }

  // =============================
  // CICLO DE VIDA
  // =============================
  ngOnInit(): void {
    // Carga idiomas disponibles
    this.languages = this.langService.getAvailableLanguages();

    // Idioma inicial del setting
    this.setting.Language = this.langService.getCurrentLang();

    // Escucha cambios en query params
    this.route.queryParamMap.subscribe(params => {
      this.selectedUserIdentifier = (params.get('user') || '').trim();
      this.viewingExternalUser = this.selectedUserIdentifier.length > 0;
      this.loadLoginConfig();
      this.loadUserSettings(this.selectedUserIdentifier || undefined);
    });

    // Escucha cambio de idioma
    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.languages = this.langService.getAvailableLanguages();
      this.reloadLoginConfig();
    });
  }

  ngAfterViewInit(): void {
    // Marca formulario listo e intenta iniciar draft manager
    this.formReady = true;
    this.tryInitDraftManager();
  }

  ngOnDestroy(): void {
    // Limpia subscripción y draft manager
    this.langChangeSub?.unsubscribe();
    this.draftRef?.destroy();
  }

  // =============================
  // DRAFT MANAGER
  // =============================
  private tryInitDraftManager(): void {
    // Solo inicializa si formulario y datos ya están listos
    if (!this.formReady || !this.dataReady || this.draftRef || !this.userSettingForm) {
      return;
    }

    this.draftRef = this.draftService.connect<UserSettingRequest>({
      form: this.userSettingForm,
      routeKey: 'user-setting',

      // Datos actuales para comparar
      currentData: () => ({
        ...this.setting,
        Password: '',
        NewPassword: '',
        ConfirmPassword: ''
      }),

      // Datos guardados como base
      savedData: () => ({
        ...this.copy,
        Password: '',
        NewPassword: '',
        ConfirmPassword: ''
      }),

      // Restaurar draft actual
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

      // Restaurar copia base
      restoreSavedData: (data) => {
        this.copy = {
          ...EMPTY_USER_SETTING,
          ...data,
          Password: '',
          NewPassword: '',
          ConfirmPassword: ''
        };
      },

      // Sincroniza draft restaurado con engine y tema
      patchEngine: (data) => {
        this.engine.patchValues(data);
        this.engine.clearErrors();

        const theme = (data.Theme || 'light') as 'light' | 'dark';
        this.themeService.setTheme(theme);
        this.setting.Theme = theme;
      },

      // Normalizador para comparar drafts
      normalize: (data) => this.normalizeSetting(data),

      // Claves de advertencia
      warningTitleKey: 'draft.unsavedDataTitle',
      warningMessageKey: 'draft.unsavedDataRestored'
    });
  }

  // Pasa el modelo actual al engine
  private patchEngineFromSetting(): void {
    this.engine.patchValues(this.setting);
  }

  // Recarga metadata/reglas y resincroniza valores
  private reloadLoginConfig(): void {
    this.engine.resetRules();
    this.engine.clearErrors();
    this.loadLoginConfig();

    this.patchEngineFromSetting();

    const tiempo = this.calcularTiempo(
      this.setting.PasswordChangedAtUtc,
      this.langService.getCurrentLang()
    );

    this.passwordTime = tiempo;
  }

  // =============================
  // CONFIGURACIÓN DEL ENGINE
  // =============================
  loadLoginConfig(resetData: boolean = false): void {
    this.engine.resetRules();
    this.engine.clearFieldsMeta();

    const fieldMeta = this.translate.instant('userSettings.form.fieldMeta') || {};
    const validations = this.translate.instant('userSettings.form.validations') || {};
    this.breadcrumbs = this.translate.instant('userSettings.breadcrumbs') || [];

    // Reinicia data si se solicita
    if (resetData) {
      this.setting = {
        ...EMPTY_USER_SETTING
      };

      this.copy = {
        ...EMPTY_USER_SETTING,
      };
    }

    // Agrega metadata por campo
    for (const [fieldId, meta] of Object.entries(fieldMeta as Record<string, any>)) {
      this.engine.addFieldMeta({
        id: fieldId,
        label: meta?.label ?? '',
        tooltip: meta?.tooltip ?? '',
        tooltipIconClass: meta?.tooltipIconClass ?? ''
      });
    }

    // Agrega reglas de validación
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

  // =============================
  // CARGA DE SETTINGS
  // =============================
  loadUserSettings(user?: string): void {
    this.userSettingService.getUserSettings(user)
      .pipe(finalize(() => { this.cdr.markForCheck(); }))
      .subscribe({
        next: (res: any) => {
          const apiSetting = res?.data?.setting ?? {};

          // Mapea respuesta API a la copia base
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

          // Modelo actual
          this.setting = { ...this.copy };

          // Sincroniza con engine
          this.patchEngineFromSetting();
          this.engine.clearErrors();

          // Calcula tiempo desde el cambio de contraseña
          const tiempo = this.calcularTiempo(
            this.setting.PasswordChangedAtUtc,
            this.langService.getCurrentLang()
          );

          this.passwordTime = tiempo;

          // Aplica tema
          const theme = (this.setting.Theme || 'light') as 'light' | 'dark';
          this.themeService.setTheme(theme);
          this.setting.Theme = theme;

          // Marca data lista e inicia draft manager
          this.dataReady = true;
          this.tryInitDraftManager();

        },
        error: (err: any) => {
          this.notify.showFromApiResponse(err?.error ?? err, 'Error');
        }
      });
  }

  // =============================
  // UTILIDAD DE TIEMPO
  // =============================
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

  // =============================
  // CAMBIO DE IDIOMA
  // =============================
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

  // =============================
  // CANCELAR
  // =============================
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

  // =============================
  // CAMBIO DE TEMA
  // =============================
  changeTheme(theme: 'light' | 'dark'): void {
    this.setting.Theme = theme;
    this.themeService.setTheme(theme);
    this.draftRef?.saveNow();
  }

  // =============================
  // GUARDAR
  // =============================

onSave(): void {
  const ok = this.engine.validateAll();

  if (!ok) {
    this.notify.show(
      this.engine.getGroupedErrorsHtmlSnapshot(),
      '',
      'warning'
    );
    return;
  }

  this.engine.clearErrors();
  this.notify.close();

  const data = { ...this.setting };

  const changingPassword =
    !!data.Password &&
    !!data.NewPassword &&
    !!data.ConfirmPassword;

  // ============================================================
  // IMPORTANTE:
  // No aplicar SHA256 aquí.
  // El backend recibe la contraseña original por HTTPS
  // y utiliza BCrypt para verificarla y generar el nuevo hash.
  // ============================================================

  this.userSettingService
    .putUserSettings(
      data,
      this.selectedUserIdentifier || undefined
    )
    .pipe(
      finalize(() => {
        this.cdr.markForCheck();
      })
    )
    .subscribe({
      next: (res: any) => {
        const forceLogout = res?.data?.forceLogout === true;

        // ========================================================
        // CAMBIO DE CONTRASEÑA
        // El backend revoca las sesiones y solicita logout.
        // ========================================================
        if (forceLogout && !this.viewingExternalUser) {
          this.notify.showFromApiResponse(res, 'success');

          this.draftRef?.clear();

          this.storage.performLocalLogout();

          setTimeout(() => {
            window.location.replace('/login');
          }, 1200);

          return;
        }

        // ========================================================
        // LIMPIAR CAMPOS DE CONTRASEÑA
        // ========================================================
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

        // ========================================================
        // ACTUALIZAR VALIDACIONES / ESTADO DEL FORMULARIO
        // ========================================================
        this.patchEngineFromSetting();

        this.engine.clearErrors();

        this.draftRef?.clear();

        // ========================================================
        // ACTUALIZAR INFORMACIÓN DE CAMBIO DE CONTRASEÑA
        // ========================================================
        const tiempo = this.calcularTiempo(
          this.setting.PasswordChangedAtUtc,
          this.langService.getCurrentLang()
        );

        this.passwordTime = tiempo;

        // ========================================================
        // MOSTRAR MENSAJE DE ÉXITO
        // ========================================================
        this.notify.showFromApiResponse(
          res,
          'success'
        );
      },

      error: (err: any) => {
        this.notify.showFromApiResponse(
          err?.error ?? err,
          'Error'
        );
      }
    });
}


  // =============================
  // EVENTOS DE VENTANA
  // =============================
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

  // =============================
  // NORMALIZADOR
  // =============================
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

  // Detecta cambios sin guardar
  private hasUnsavedChanges(): boolean {
    const current = this.normalizeSetting(this.setting);
    const saved = this.normalizeSetting(this.copy);

    return JSON.stringify(current) !== JSON.stringify(saved);
  }

  // =============================
  // GUARD DE NAVEGACIÓN
  // =============================
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

  // =============================
  // FORMATO DE ÚLTIMA ACTIVIDAD
  // =============================
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