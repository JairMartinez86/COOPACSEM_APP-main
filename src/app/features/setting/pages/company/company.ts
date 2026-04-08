// =============================
// IMPORTACIONES
// =============================
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
import { FormsModule, NgForm } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize, map, Observable, of, Subscription } from 'rxjs';

// Servicios principales
import { NotificationService } from '../../../../core/services/notification.service';
import { CompanyRequest, EMPTY_COMPANY } from '../../interface/company.interface';
import { LanguageService } from '../../../../core/services/languageService';
import { Breadcrumb } from '../../../../shared/components/breadcrumb/breadcrumb';

// Librería de validaciones
import {
  JMartAutoFocusDirective,
  JMartAutoFocusNextDirective,
  JMartEngineSyncDirective,
  JMartErrorNotifyDirective,
  JMartMassiveValidationService,
  JMartNumberFormatDirective
} from '@JairMartinez86/jmartinez-validator';

// Draft manager (guardado automático)
import {
  DraftFormService,
  DraftManagerRef
} from '../../../../core/services/draft-manager-options.service';

// Otros servicios
import { CompanyService } from '../../services/company.service';
import { AppPermissionDirective } from '../../../../core/services/app-permission.directive';
import { CanComponentDeactivate } from '../../../../core/guards/pending-changes.guard';
import { ApiConfigService } from '../../../../core/services/ApiConfigService ';
import { AppConfigService } from '../../../../core/services/app-config.service';


@Component({
  selector: 'app-company',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    JMartAutoFocusNextDirective,
    JMartErrorNotifyDirective,
    JMartEngineSyncDirective,
    JMartAutoFocusDirective,
    JMartNumberFormatDirective,
    Breadcrumb,
    AppPermissionDirective
  ],
  templateUrl: './company.html',
  styleUrl: './company.scss'
})
export class CompanyComponent implements OnInit, AfterViewInit, OnDestroy, CanComponentDeactivate {

  // =============================
  // INYECCIÓN DE DEPENDENCIAS
  // =============================
  public notify = inject(NotificationService); // Manejo de notificaciones
  private companyService = inject(CompanyService); // Servicio API company
  private translate = inject(TranslateService); // Traducciones
  private langService = inject(LanguageService); // Idiomas
  private engine = inject(JMartMassiveValidationService); // Motor validaciones
  private draftService = inject(DraftFormService); // Manejo de draft
  private api = inject(ApiConfigService); // Configuración API base

  // Referencia al formulario template
  @ViewChild('companyForm') companyForm?: NgForm;

  private langChangeSub?: Subscription; // Subscripción idioma
  private draftRef?: DraftManagerRef; // Referencia draft
  private formReady = false; // Flag formulario listo
  private dataReady = false; // Flag datos cargados

  // Modelos
  company: CompanyRequest = { ...EMPTY_COMPANY }; // Modelo actual
  copy: CompanyRequest = { ...EMPTY_COMPANY }; // Copia para detectar cambios

  // Logo
  logoPreview: string | null = null;
  uploadingLogo = false;

  // Idiomas
  languages: any[] = [];

  // Breadcrumbs
  breadcrumbs = [
    { label: '', url: '' },
    { label: '', url: '/' },
    { label: '' }
  ];

  // =============================
  // INICIALIZACIÓN
  // =============================
  ngOnInit(): void {

    // Carga idiomas disponibles
    this.languages = this.langService.getAvailableLanguages();

    // Carga configuración y datos
    this.loadCompanyConfig();
    this.loadCompany();

    // Escucha cambio de idioma
    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.languages = this.langService.getAvailableLanguages();
      this.reloadCompanyConfig(false);
    });
  }

  // =============================
  // AFTER VIEW INIT
  // =============================
  ngAfterViewInit(): void {
    this.formReady = true; // Marca formulario listo
    this.tryInitDraftManager(); // Intenta iniciar draft
  }

  // =============================
  // DESTROY
  // =============================
  ngOnDestroy(): void {
    this.langChangeSub?.unsubscribe(); // Limpia subscripción
    this.draftRef?.destroy(); // Limpia draft
  }

  // =============================
  // INICIALIZAR DRAFT
  // =============================
  private tryInitDraftManager(): void {

    // Validación para evitar inicialización prematura
    if (!this.formReady || !this.dataReady || this.draftRef || !this.companyForm) {
      return;
    }

    // Conecta draft manager
    this.draftRef = this.draftService.connect<CompanyRequest>({
      form: this.companyForm,
      routeKey: 'company',

      currentData: () => this.normalizeCompany(this.company) as CompanyRequest,
      savedData: () => this.normalizeCompany(this.copy) as CompanyRequest,

      // Restaurar datos del draft
      restoreData: (data) => {
        this.company = {
          ...EMPTY_COMPANY,
          ...this.copy,
          ...data,
          LogoUrl: this.copy.LogoUrl,
          LogoFileName: this.copy.LogoFileName
        };

        this.logoPreview = this.buildLogoUrl(this.company.LogoUrl);
      },

      // Restaurar copia guardada
      restoreSavedData: (data) => {
        this.copy = {
          ...EMPTY_COMPANY,
          ...data,
          LogoUrl: this.copy.LogoUrl,
          LogoFileName: this.copy.LogoFileName
        };
      },

      // Sincronizar con motor validaciones
      patchEngine: (data) => {
        this.engine.patchValues(data);
        this.engine.clearErrors();
        this.logoPreview = this.buildLogoUrl(this.company.LogoUrl);
      },

      normalize: (data) => this.normalizeCompany(data),
      warningTitleKey: 'draft.unsavedDataTitle',
      warningMessageKey: 'draft.unsavedDataRestored'
    });
  }

  // Sincroniza modelo con motor validación
  private patchEngineFromCompany(): void {
    this.engine.patchValues(this.company);
  }

  // Recarga configuración
  private reloadCompanyConfig(resetData: boolean = false): void {
    this.engine.resetRules();
    this.engine.clearErrors();
    this.loadCompanyConfig(resetData);
    this.patchEngineFromCompany();
  }

  // =============================
  // CONFIGURACIÓN VALIDACIONES
  // =============================
  loadCompanyConfig(resetData: boolean = false): void {

    this.engine.resetRules();
    this.engine.clearFieldsMeta();

    const fieldMeta = this.translate.instant('company.form.fieldMeta') || {};
    const validations = this.translate.instant('company.form.validations') || {};
    this.breadcrumbs = this.translate.instant('company.breadcrumbs') || this.breadcrumbs;

    // Reset de datos
    if (resetData) {
      this.company = {
        ...EMPTY_COMPANY
      };

      this.copy = {
        ...EMPTY_COMPANY
      };
    }

    // Metadata campos
    for (const [fieldId, meta] of Object.entries(fieldMeta as Record<string, any>)) {
      this.engine.addFieldMeta({
        id: fieldId,
        label: meta?.label ?? '',
        tooltip: meta?.tooltip ?? '',
        tooltipIconClass: meta?.tooltipIconClass ?? ''
      });
    }

    // Reglas validación
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
  // UTILIDADES
  // =============================

  // Construye URL completa del logo
  private buildLogoUrl(path?: string | null): string | null {
    if (!path || !String(path).trim()) return null;

    const cleanPath = String(path).trim();

    if (
      cleanPath.startsWith('http://') ||
      cleanPath.startsWith('https://') ||
      cleanPath.startsWith('data:')
    ) {
      return cleanPath;
    }

    const normalizedPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;

    try {
      return new URL(normalizedPath, this.api.baseUrl).toString();
    } catch {
      return normalizedPath;
    }
  }

  // Normaliza objeto company (evita nulls)
  private normalizeCompany(
    data: Partial<CompanyRequest> | null | undefined
  ): Partial<CompanyRequest> {
    return {
      CompanyName: data?.CompanyName ?? '',
      TradeName: data?.TradeName ?? '',
      Ruc: data?.Ruc ?? '',
      BusinessType: data?.BusinessType ?? '',
      Status: data?.Status ?? 'Active',
      Description: data?.Description ?? '',
      Email: data?.Email ?? '',
      Phone: data?.Phone ?? '',
      Mobile: data?.Mobile ?? '',
      Website: data?.Website ?? '',
      Address: data?.Address ?? '',
      Country: data?.Country ?? '',
      City: data?.City ?? '',
      DateFormat: data?.DateFormat ?? 'dd/MM/yyyy',
      Currency: data?.Currency ?? 'NIO',
      DecimalSeparator: data?.DecimalSeparator ?? '.',
      ThousandSeparator: data?.ThousandSeparator ?? ',',
      AffiliationCost: data?.AffiliationCost ?? 0,
      OrdinaryCapitalPercentage: data?.OrdinaryCapitalPercentage ?? 0,
      OtherDeferredIncomePercentage: data?.OtherDeferredIncomePercentage ?? 0,
      AffiliationAccount: data?.AffiliationAccount ?? '',
      CurrentAccount: data?.CurrentAccount ?? '',
       ChristmasAccount: data?.ChristmasAccount ?? '',
      OrdinaryCapitalAccount: data?.OrdinaryCapitalAccount ?? '',
      OtherDeferredIncomeAccount: data?.OtherDeferredIncomeAccount ?? '',
      SmtpHost: data?.SmtpHost ?? '',
      SmtpPort: data?.SmtpPort ?? 0,
      SmtpUsername: data?.SmtpUsername ?? '',
      SmtpPassword: data?.SmtpPassword ?? '',
      SmtpFrom: data?.SmtpFrom ?? '',
      TwoFactorCodeExpirationMinutes: data?.TwoFactorCodeExpirationMinutes ?? 5,
      PasswordResetExpirationMinutes: data?.PasswordResetExpirationMinutes ?? 30,
      TrustedDeviceExpirationDays: data?.TrustedDeviceExpirationDays ?? 30,
      LoginLockMinutes: data?.LoginLockMinutes ?? 10,
      JwtExpiresMinutes: data?.JwtExpiresMinutes ?? 60,
      RefreshExpiresMinutes: data?.RefreshExpiresMinutes ?? 1440
    };
  }

  // Detecta cambios sin guardar
  private hasUnsavedChanges(): boolean {
    const current = this.normalizeCompany(this.company);
    const saved = this.normalizeCompany(this.copy);

    return JSON.stringify(current) !== JSON.stringify(saved);
  }

  // =============================
  // API
  // =============================
  loadCompany(): void {
    this.companyService.getCompany()
      .pipe(finalize(() => { }))
      .subscribe({
        next: (res: any) => {
          const apiCompany = res?.data?.company ?? {};
  
          // Mapeo de datos API → modelo
          this.copy = {
            CompanyName: apiCompany.CompanyName ?? apiCompany.companyName ?? '',
            TradeName: apiCompany.TradeName ?? apiCompany.tradeName ?? '',
            Ruc: apiCompany.Ruc ?? apiCompany.ruc ?? '',
            BusinessType: apiCompany.BusinessType ?? apiCompany.businessType ?? '',
            Status: apiCompany.Status ?? apiCompany.status ?? 'Active',
            Description: apiCompany.Description ?? apiCompany.description ?? '',
            LogoUrl: apiCompany.LogoUrl ?? apiCompany.logoUrl ?? '',
            LogoFileName: apiCompany.LogoFileName ?? apiCompany.logoFileName ?? '',
            Email: apiCompany.Email ?? apiCompany.email ?? '',
            Phone: apiCompany.Phone ?? apiCompany.phone ?? '',
            Mobile: apiCompany.Mobile ?? apiCompany.mobile ?? '',
            Website: apiCompany.Website ?? apiCompany.website ?? '',
            Address: apiCompany.Address ?? apiCompany.address ?? '',
            Country: apiCompany.Country ?? apiCompany.country ?? '',
            City: apiCompany.City ?? apiCompany.city ?? '',
            DateFormat: apiCompany.DateFormat ?? apiCompany.dateFormat ?? 'dd/MM/yyyy',
            Currency: apiCompany.Currency ?? apiCompany.currency ?? 'NIO',
            DecimalSeparator: apiCompany.DecimalSeparator ?? apiCompany.decimalSeparator ?? '.',
            ThousandSeparator: apiCompany.ThousandSeparator ?? apiCompany.thousandSeparator ?? ',', 
            AffiliationAccount: apiCompany.affiliationAccount ?? apiCompany.affiliationAccount ?? '',
            CurrentAccount: apiCompany.currentAccount ?? apiCompany.currentAccount ?? '',
            ChristmasAccount: apiCompany.christmasAccount ?? apiCompany.christmasAccount ?? '',
            OrdinaryCapitalAccount: apiCompany.ordinaryCapitalAccount ?? apiCompany.ordinaryCapitalAccount ?? '',
            OtherDeferredIncomeAccount: apiCompany.otherDeferredIncomeAccount ?? apiCompany.otherDeferredIncomeAccount ?? '',
            SmtpHost: apiCompany.SmtpHost ?? apiCompany.smtpHost ?? '',
            SmtpPort: apiCompany.SmtpPort ?? apiCompany.smtpPort ?? 0,
            SmtpUsername: apiCompany.SmtpUsername ?? apiCompany.smtpUsername ?? '',
            SmtpPassword: apiCompany.SmtpPassword ?? apiCompany.smtpPassword ?? '',
            SmtpFrom: apiCompany.SmtpFrom ?? apiCompany.smtpFrom ?? '',
            TwoFactorCodeExpirationMinutes:
              apiCompany.TwoFactorCodeExpirationMinutes ??
              apiCompany.twoFactorCodeExpirationMinutes ??
              5,
            PasswordResetExpirationMinutes:
              apiCompany.PasswordResetExpirationMinutes ??
              apiCompany.passwordResetExpirationMinutes ??
              30,
            TrustedDeviceExpirationDays:
              apiCompany.TrustedDeviceExpirationDays ??
              apiCompany.trustedDeviceExpirationDays ??
              30,
            LoginLockMinutes:
              apiCompany.LoginLockMinutes ??
              apiCompany.loginLockMinutes ??
              10,
            JwtExpiresMinutes:
              apiCompany.JwtExpiresMinutes ??
              apiCompany.jwtExpiresMinutes ??
              60,
            RefreshExpiresMinutes:
              apiCompany.RefreshExpiresMinutes ??
              apiCompany.refreshExpiresMinutes ??
              1440,

            AffiliationCost:
              apiCompany.AffiliationCost ??
              apiCompany.affiliationCost ??
              0,

            OrdinaryCapitalPercentage:
              apiCompany.OrdinaryCapitalPercentage ??
              apiCompany.ordinaryCapitalPercentage ??
              0,

            OtherDeferredIncomePercentage:
              apiCompany.OtherDeferredIncomePercentage ??
              apiCompany.otherDeferredIncomePercentage ??
              0
          };

          this.company = { ...this.copy };
          this.logoPreview = this.buildLogoUrl(this.company.LogoUrl);

          this.patchEngineFromCompany();
          this.engine.clearErrors();

          this.dataReady = true;
          this.tryInitDraftManager();
        },
        error: (err: any) => {
          this.notify.showFromApiResponse(err?.error ?? err, 'Error');
        }
      });
  }

  // Cancelar cambios
  onCancel(): void {
    this.notify.close();
    this.draftRef?.cancel();
    this.logoPreview = this.buildLogoUrl(this.company.LogoUrl);
    this.patchEngineFromCompany();
    this.engine.clearErrors();
  }

  // Guardar datos
  onSave(): void {
    this.notify.close();

    const ok = this.engine.validateAll();
    if (!ok) {
      this.notify.show(this.engine.getGroupedErrorsHtmlSnapshot(), '', 'warning');
      return;
    }

    const body: CompanyRequest = {
      ...this.company,
      CompanyName: this.company.CompanyName?.trim() ?? '',
      TradeName: this.company.TradeName?.trim() ?? '',
      Ruc: this.company.Ruc?.trim() ?? '',
      BusinessType: this.company.BusinessType?.trim() ?? '',
      Status: this.company.Status?.trim() ?? 'Active',
      Description: this.company.Description?.trim() ?? '',
      LogoUrl: this.company.LogoUrl?.trim() ?? '',
      LogoFileName: this.company.LogoFileName?.trim() ?? '',
      Email: this.company.Email?.trim() ?? '',
      Phone: this.company.Phone?.trim() ?? '',
      Mobile: this.company.Mobile?.trim() ?? '',
      Website: this.company.Website?.trim() ?? '',
      Address: this.company.Address?.trim() ?? '',
      Country: this.company.Country?.trim() ?? '',
      City: this.company.City?.trim() ?? '',
      DateFormat: this.company.DateFormat?.trim() ?? 'dd/MM/yyyy',
      Currency: this.company.Currency?.trim() ?? 'NIO',
      DecimalSeparator: this.company.DecimalSeparator?.trim() ?? '.',
      ThousandSeparator: this.company.ThousandSeparator?.trim() ?? ',',
      SmtpHost: this.company.SmtpHost?.trim() ?? '',
      SmtpPort: this.company.SmtpPort ?? 0,
      SmtpUsername: this.company.SmtpUsername?.trim() ?? '',
      SmtpPassword: this.company.SmtpPassword?.trim() ?? '',
      SmtpFrom: this.company.SmtpFrom?.trim() ?? '',
      TwoFactorCodeExpirationMinutes: this.company.TwoFactorCodeExpirationMinutes ?? 5,
      PasswordResetExpirationMinutes: this.company.PasswordResetExpirationMinutes ?? 30,
      TrustedDeviceExpirationDays: this.company.TrustedDeviceExpirationDays ?? 30,
      LoginLockMinutes: this.company.LoginLockMinutes ?? 10,
      JwtExpiresMinutes: this.company.JwtExpiresMinutes ?? 60,
      RefreshExpiresMinutes: this.company.RefreshExpiresMinutes ?? 1440
    };

    this.companyService.putCompany(body)
      .pipe(finalize(() => { }))
      .subscribe({
        next: (res: any) => {
          this.copy = { ...body };
          this.company = { ...body };
          this.logoPreview = this.buildLogoUrl(this.company.LogoUrl);

          this.patchEngineFromCompany();
          this.engine.clearErrors();
          this.draftRef?.clear();

          this.notify.showFromApiResponse(res, 'success');
        },
        error: (err: any) => {
          this.notify.showFromApiResponse(err?.error ?? err, 'Error');
        }
      });
  }

  // Selección de logo
  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    this.uploadingLogo = true;

    this.companyService.uploadLogo(file)
      .pipe(finalize(() => {
        this.uploadingLogo = false;
      }))
      .subscribe({
        next: (res: any) => {
          const data = res?.data ?? {};

          this.company.LogoUrl = data.logoUrl ?? '';
          this.company.LogoFileName = data.logoFileName ?? file.name;
          this.logoPreview = this.buildLogoUrl(this.company.LogoUrl);

          this.notify.showFromApiResponse(res, 'success');
        },
        error: (err: any) => {
          this.notify.showFromApiResponse(err?.error ?? err, 'Error');
        }
      });
  }

  // Guard de navegación
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

  // Evento cerrar ventana
  @HostListener('window:beforeunload', ['$event'])
  handleBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.hasUnsavedChanges()) {
      return;
    }

    this.draftRef?.saveNow();
    event.preventDefault();
    event.returnValue = '';
  }

  // Evento ocultar página
  @HostListener('window:pagehide')
  handlePageHide(): void {
    if (this.hasUnsavedChanges()) {
      this.draftRef?.saveNow();
    }
  }
}