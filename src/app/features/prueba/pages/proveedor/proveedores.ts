import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  Inject,
  NgZone,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  inject
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of, Subscription, forkJoin } from 'rxjs';
import { finalize, map } from 'rxjs/operators';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import {
  JMartAutoFocusDirective,
  JMartAutoFocusNextDirective,
  JMartEngineSyncDirective,
  JMartErrorNotifyDirective,
  JMartMassiveValidationService
} from '@JairMartinez86/jmartinez-validator';

import { DraftFormService } from '../../../../core/services/draft-manager-options.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AppPermissionDirective } from '../../../../core/services/app-permission.directive';
import { Breadcrumb } from '../../../../shared/components/breadcrumb/breadcrumb';

import { CatalogosService } from '../../../../shared/service/CatalogosService';
import { ProveedoresService } from '../../services/proveedores.service';
import { EMPTY_PROVEEDOR, ProveedorForm } from '../../interface/proveedor.model';
import { LanguageService } from '../../../../core/services/languageService';

declare const Choices: any;

type DraftRef<T> = {
  saveNow(): void;
  clear(): void;
  cancel(): void;
};

@Component({
  selector: 'app-proveedores',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    JMartAutoFocusNextDirective,
    JMartErrorNotifyDirective,
    JMartEngineSyncDirective,
    AppPermissionDirective,
    Breadcrumb,
    JMartAutoFocusDirective,
],
  templateUrl: './proveedores.html',
  styleUrls: ['./proveedores.scss']
})
export class ProveedoresComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('proveedorFormRef') formRef?: NgForm;

  @ViewChild('empresaSelect') empresaSelectRef?: ElementRef<HTMLSelectElement>;
  @ViewChild('tratamientoSelect') tratamientoSelectRef?: ElementRef<HTMLSelectElement>;
  @ViewChild('sectorSelect') sectorSelectRef?: ElementRef<HTMLSelectElement>;
  @ViewChild('tipoIdentificacionSelect') tipoIdentificacionSelectRef?: ElementRef<HTMLSelectElement>;
  @ViewChild('paisSelect') paisSelectRef?: ElementRef<HTMLSelectElement>;

  private readonly proveedoresService = inject(ProveedoresService);
  private readonly catalogosService = inject(CatalogosService);
  private readonly translate = inject(TranslateService);
  private readonly draftService = inject(DraftFormService);
  private readonly engine = inject(JMartMassiveValidationService);
  public readonly notify = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private langService = inject(LanguageService);

  proveedor: ProveedorForm = { ...EMPTY_PROVEEDOR };
  copy: ProveedorForm = { ...EMPTY_PROVEEDOR };

  breadcrumbs = [
    { label: '', url: '' },
    { label: '', url: '/' },
    { label: '' }
  ];

  empresas: any[] = [];
  paises: any[] = [];
  tratamientos: any[] = [];
  sectores: any[] = [];

  formReady = false;
  dataReady = false;
  loading = false;

  mode: 'create' | 'view' | 'edit' = 'create';
  proveedorId: string | null = null;

  draftRef?: DraftRef<ProveedorForm>;

  private readonly subs = new Subscription();
  private readonly isBrowser: boolean;

  private empresaChoices: any;
  private tratamientoChoices: any;
  private sectorChoices: any;
  private tipoIdentificacionChoices: any;
  private paisChoices: any;

  private langChangeSub?: Subscription;
  languages: any[] = [];

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.loadBreadcrumbs();
    this.loadProveedorConfig();
    this.loadCatalogos();

    this.subs.add(
      this.translate.onLangChange.subscribe(() => {
        this.loadBreadcrumbs();
        this.loadProveedorConfig();
        this.loadCatalogos();
        this.cdr.detectChanges();
      })
    );
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;

    this.formReady = true;

    this.initRouteModeAndLoad();

    setTimeout(() => {
      this.initAllChoices();
      this.reapplyChoicesValues();
      this.cdr.detectChanges();
    }, 100);


    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.languages = this.langService.getAvailableLanguages();
      this.loadProveedorConfig();
      this.refreshAllChoices();
    });
  }





  ngOnDestroy(): void {
    this.destroyAllChoices();
    this.draftRef?.cancel();
    this.subs.unsubscribe();
  }

  private loadBreadcrumbs(): void {
    const url = this.router.url.toLowerCase();

    if (url.endsWith('/new')) {
      this.breadcrumbs = this.translate.instant('proveedores.breadcrumbs.new') || [];
      return;
    }

    if (url.endsWith('/edit')) {
      this.breadcrumbs = this.translate.instant('proveedores.breadcrumbs.edit') || [];
      return;
    }

    this.breadcrumbs = this.translate.instant('proveedores.breadcrumbs.list') || [];
  }

  private initRouteModeAndLoad(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const url = this.router.url.toLowerCase();

    this.proveedorId = id;
    this.loadBreadcrumbs();

    if (url.endsWith('/new')) {
      this.mode = 'create';
      this.proveedor = { ...EMPTY_PROVEEDOR };
      this.copy = { ...EMPTY_PROVEEDOR };
      this.patchEngineFromProveedor();
      this.dataReady = true;
      this.tryInitDraftManager();
      this.refreshAllChoices();
      return;
    }

    this.mode = url.endsWith('/edit') ? 'edit' : 'view';

    if (!id) {
      this.notify.show?.(
        this.translate.instant('proveedores.messages.missingId'),
        '',
        'warning'
      );
      this.router.navigate(['/proveedores']);
      return;
    }

    this.loadProveedorById(id);
  }

  loadProveedorConfig(): void {
    this.engine.resetRules?.();
    this.engine.clearFieldsMeta?.();

    const fieldMeta = this.translate.instant('proveedores.form.fieldMeta') || {};
    const validations = this.translate.instant('proveedores.form.validations') || {};

    for (const [fieldId, meta] of Object.entries(fieldMeta as Record<string, any>)) {
      this.engine.addFieldMeta?.({
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

        this.engine.addRule?.({
          id: fieldId,
          condition: String(rule?.rule ?? '').trim(),
          when: String(rule?.when ?? '').trim(),
          value,
          message: String(rule?.msj ?? '').replace('{value}', String(value ?? '')),
          classIconSuccess: rule?.classIconSuccess ?? '',
          classIconError: rule?.classIconError ?? ''
        });
      }
    }

    this.engine.validateAll?.();
    this.engine.clearErrors?.();
  }

  private loadCatalogos(): void {
    forkJoin({
      empresas: this.catalogosService.getEmpresas(),
      paises: this.catalogosService.getPaises(),
      tratamientos: this.catalogosService.getTratamientosProveedor(),
      sectores: this.catalogosService.getSectoresProveedor()
    }).subscribe({
      next: (res: any) => {
        this.empresas = [...(res?.empresas?.data?.empresas ?? res?.empresas?.data?.empresas ?? [])];
        this.paises = [...(res?.paises?.data?.paises ?? [])];
        this.tratamientos = [...(res?.tratamientos?.data?.tratamientos ?? [])];
        this.sectores = [...(res?.sectores?.data?.sectores ?? [])];

        if (!this.proveedor.idCompany && this.empresas.length === 1) {
          this.proveedor.idCompany = this.empresas[0].id;
          this.copy.idCompany = this.empresas[0].id;
        }

        this.patchEngineFromProveedor();
        this.cdr.detectChanges();
        this.refreshAllChoices();
      },
      error: () => {
        this.empresas = [];
        this.paises = [];
        this.tratamientos = [];
        this.sectores = [];
        this.refreshAllChoices();
      }
    });
  }

  private loadProveedorById(id: string): void {
    this.loading = true;

    this.proveedoresService.getById(id)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res: any) => {
          const proveedorApi = res?.data?.proveedor ?? null;

          if (!proveedorApi) {
            this.notify.show?.(
              this.translate.instant('proveedores.messages.notFound'),
              '',
              'warning'
            );
            this.router.navigate(['/proveedores']);
            return;
          }

          const proveedorMapped = this.toProveedorForm(proveedorApi);

          this.proveedor = { ...proveedorMapped };
          this.copy = { ...proveedorMapped };

          this.patchEngineFromProveedor();
          this.engine.clearErrors?.();

          this.dataReady = true;
          this.tryInitDraftManager();

          this.cdr.detectChanges();
          this.refreshAllChoices();
        },
        error: (err: any) => {
          this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
          this.router.navigate(['/proveedores']);
        }
      });
  }

  private tryInitDraftManager(): void {
    if (!this.formReady || !this.dataReady || !this.formRef || this.draftRef) {
      return;
    }

    queueMicrotask(() => {
      this.draftRef = this.draftService.connect<ProveedorForm>({
        form: this.formRef!,
        routeKey: `proveedores-edit-${this.proveedor.id ?? 'new'}`,

        currentData: () => ({ ...this.proveedor }),
        savedData: () => ({ ...this.copy }),

        restoreData: (data: Partial<ProveedorForm> | null | undefined) => {
          this.proveedor = this.toProveedorForm({
            ...this.copy,
            ...(data ?? {})
          });

          this.patchEngineFromProveedor();
          this.cdr.detectChanges();

          setTimeout(() => {
            this.refreshAllChoices();
            this.reapplyChoicesValues();
            this.cdr.detectChanges();
          }, 100);
        },

        restoreSavedData: (data: Partial<ProveedorForm> | null | undefined) => {
          this.copy = this.toProveedorForm(data);
        },

        patchEngine: (data: Partial<ProveedorForm> | null | undefined) => {
          this.engine.patchValues?.(data ?? {});
          this.engine.clearErrors?.();
        },

        normalize: (data: Partial<ProveedorForm> | null | undefined) => this.normalize(data),

        warningTitleKey: 'draft.unsavedDataTitle',
        warningMessageKey: 'draft.unsavedDataRestored'
      });
    });
  }

  private normalize(data: Partial<ProveedorForm> | null | undefined): Partial<ProveedorForm> {
    return {
      ...data,
      id: data?.id ?? null,
      idCompany: data?.idCompany ?? null,
      paisId: data?.paisId ?? null,
      planCuentaId: data?.planCuentaId ?? null,
      cuentaContableId: data?.cuentaContableId ?? null,
      activo: data?.activo ?? true
    };
  }

  private toProveedorForm(data: Partial<ProveedorForm> | null | undefined): ProveedorForm {
    return {
      ...EMPTY_PROVEEDOR,
      ...this.normalize(data),
      id: data?.id ?? null
    };
  }

  private patchEngineFromProveedor(): void {
    this.engine.patchValues?.(this.proveedor);
  }

  hasUnsavedChanges(): boolean {
    return JSON.stringify(this.toProveedorForm(this.proveedor)) !== JSON.stringify(this.toProveedorForm(this.copy));
  }

  onSave(): void {
    if (this.mode === 'view') {
      return;
    }

    const ok = this.engine.validateAll?.();

    if (!ok) {
      this.notify.show?.(this.engine.getGroupedErrorsHtmlSnapshot?.(), '', 'warning');
      return;
    }

    this.engine.clearErrors?.();
    this.notify.close?.();

    const payload = this.toProveedorForm(this.proveedor);

    this.proveedoresService.save(payload).subscribe({
      next: (res: any) => {
        const savedProveedor = this.toProveedorForm(res?.data?.proveedor ?? payload);

        this.notify.showFromApiResponse?.(res, 'success');

        if (this.mode === 'edit') {
          this.proveedor = { ...savedProveedor };
          this.copy = { ...savedProveedor };

          this.draftRef?.clear();


          this.patchEngineFromProveedor();
          this.engine.clearErrors?.();

          this.formRef?.form.markAsPristine();
          this.formRef?.form.markAsUntouched();

          this.cdr.detectChanges();

          setTimeout(() => {
            this.refreshAllChoices();
            this.reapplyChoicesValues();

            this.formRef?.form.markAsPristine();
            this.formRef?.form.markAsUntouched();

            this.cdr.detectChanges();
            this.resetFormAfterSuccess();
          }, 50);

          return;
        }


        this.resetFormAfterSuccess();
      },
      error: (err: any) => {
        this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
      }
    });
  }

  onCancel(): void {
    this.notify.close?.();
    this.draftRef?.cancel();

    this.proveedor = { ...this.copy };
    this.patchEngineFromProveedor();
    this.engine.clearErrors?.();
    this.refreshAllChoices();
  }

  private resetFormAfterSuccess(): void {
    this.draftRef?.clear();
    this.formRef?.resetForm();

    const defaultCompanyId = this.empresas.length === 1 ? this.empresas[0].id : null;

    this.proveedor = {
      ...EMPTY_PROVEEDOR,
      idCompany: defaultCompanyId
    };

    this.copy = {
      ...EMPTY_PROVEEDOR,
      idCompany: defaultCompanyId
    };

    this.patchEngineFromProveedor();
    this.engine.clearErrors?.();

    this.formRef?.form.markAsPristine();
    this.formRef?.form.markAsUntouched();

    this.cdr.detectChanges();

    setTimeout(() => {
      this.refreshAllChoices();
      this.reapplyChoicesValues();

      this.formRef?.form.markAsPristine();
      this.formRef?.form.markAsUntouched();

      this.cdr.detectChanges();
    }, 50);
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

  canDeactivate(): boolean | Observable<boolean> {
    const forceLogout = sessionStorage.getItem('force-logout') === '1';
    if (forceLogout) return true;

    if (!this.hasUnsavedChanges()) return true;

    const title =
      this.translate.instant('draft.leavePageTitle') || 'Advertencia';

    const message =
      this.translate.instant('draft.leavePageMessage') ||
      'Tienes cambios sin guardar. Si sales de esta página se perderán. ¿Deseas continuar?';

    const ref = this.notify.confirm?.(message, title, 'warning');

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

  private destroyAllChoices(): void {
    try { this.empresaChoices?.destroy(); } catch { }
    try { this.tratamientoChoices?.destroy(); } catch { }
    try { this.sectorChoices?.destroy(); } catch { }
    try { this.tipoIdentificacionChoices?.destroy(); } catch { }
    try { this.paisChoices?.destroy(); } catch { }

    this.empresaChoices = null;
    this.tratamientoChoices = null;
    this.sectorChoices = null;
    this.tipoIdentificacionChoices = null;
    this.paisChoices = null;
  }

  private refreshAllChoices(): void {
    if (!this.isBrowser) return;

    setTimeout(() => {
      this.initAllChoices();
      this.reapplyChoicesValues();
    }, 50);
  }

  private initAllChoices(): void {
    this.initEmpresaChoices();
    this.initTratamientoChoices();
    this.initSectorChoices();
    this.initTipoIdentificacionChoices();
    this.initPaisChoices();
  }

  private reapplyChoicesValues(): void {
    requestAnimationFrame(() => {
      this.setChoicesValue(this.empresaChoices, this.proveedor.idCompany);
      this.setChoicesValue(this.tratamientoChoices, this.proveedor.tratamiento);
      this.setChoicesValue(this.sectorChoices, this.proveedor.sector);
      this.setChoicesValue(this.tipoIdentificacionChoices, this.proveedor.tipoIdentificacion);
      this.setChoicesValue(this.paisChoices, this.proveedor.paisId);
    });
  }

  private removeOrphanChoicesWrapper(element: HTMLSelectElement): void {
    const nextSibling = element.nextElementSibling as HTMLElement | null;
    if (nextSibling?.classList.contains('choices')) {
      nextSibling.remove();
    }
  }

  private createChoicesInstance(
    ref: ElementRef<HTMLSelectElement> | undefined,
    current: any
  ): any {
    if (!this.isBrowser || !ref?.nativeElement) return null;

    const element = ref.nativeElement;

    try {
      this.removeOrphanChoicesWrapper(element);
      const previous = (element as any).__choicesInstance;
      previous?.destroy?.();
    } catch { }

    const instance = new Choices(element, {
      searchEnabled: true,
      itemSelectText: '',
      shouldSort: false,
      allowHTML: false,
      placeholder: true,
      searchPlaceholderValue: this.translate.instant('common.search') || 'Buscar...'
    });

    (element as any).__choicesInstance = instance;

    if (current !== null && current !== undefined && current !== '') {
      setTimeout(() => this.setChoicesValue(instance, current), 0);
    }

    return instance;
  }

  private setChoicesValue(instance: any, value: any): void {
    if (!instance || value === undefined || value === null || value === '') return;

    try {
      instance.setChoiceByValue(String(value));
    } catch { }
  }

  private initEmpresaChoices(): void {
    this.empresaChoices = this.createChoicesInstance(this.empresaSelectRef, this.proveedor.idCompany);
  }

  private initTratamientoChoices(): void {
    this.tratamientoChoices = this.createChoicesInstance(this.tratamientoSelectRef, this.proveedor.tratamiento);
  }

  private initSectorChoices(): void {
    this.sectorChoices = this.createChoicesInstance(this.sectorSelectRef, this.proveedor.sector);
  }

  private initTipoIdentificacionChoices(): void {
    this.tipoIdentificacionChoices = this.createChoicesInstance(this.tipoIdentificacionSelectRef, this.proveedor.tipoIdentificacion);
  }

  private initPaisChoices(): void {
    this.paisChoices = this.createChoicesInstance(this.paisSelectRef, this.proveedor.paisId);
  }


}