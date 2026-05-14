import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  Inject,
  Injectable,
  NgZone,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  QueryList,
  ViewChild,
  ViewChildren,
  inject,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of, Subscription } from 'rxjs';
import { finalize, map } from 'rxjs/operators';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SociosService } from '../../services/socios.service';
import {
  JMartAutoFocusDirective,
  JMartAutoFocusNextDirective,
  JMartDateFormatDirective,
  JMartEngineSyncDirective,
  JMartErrorNotifyDirective,
  JMartMassiveValidationService,
  JMartNumberFormatDirective,
} from '@JairMartinez86/jmartinez-validator';
import { DraftFormService } from '../../../../core/services/draft-manager-options.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { EMPTY_SOCIO, SocioForm } from '../../interface/socio.model';
import { AppPermissionDirective } from '../../../../core/services/app-permission.directive';
import { LanguageService } from '../../../../core/services/languageService';
import { Breadcrumb } from '../../../../shared/components/breadcrumb/breadcrumb';
import { AppConfigService } from '../../../../core/services/app-config.service';
import { CatalogosService } from '../../../../shared/service/CatalogosService';
import { Banco, CatalogoItem, MunicipioItem } from '../../../../shared/interfaces/catalogo.model';
import { BeneficiarioForm, EMPTY_BENEFICIARIO } from '../../interface/beneficiario.model';
import { PermissionService } from '../../../../core/services/permission.service';
import { BeneficiarioModalComponent } from "./beneficiario/beneficiario-modal.component";
import { FileManagerComponent } from "../../../../shared/components/file-manager/file-manager.component";
import { FileManagerService } from '../../../../shared/service/FileManagerService';
import { EMPTY_OTRO_INGRESO, OtroIngresoForm } from '../../interface/otro-ingreso.model';
import { OtroIngresoModalComponent } from "./otrosIngresos/otro-ingreso-modal.component";

declare const Choices: any;


type DraftRef<T> = {
  saveNow(): void;
  clear(): void;
  cancel(): void;
};

@Component({
  selector: 'app-socios',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    JMartAutoFocusNextDirective,
    JMartErrorNotifyDirective,
    JMartEngineSyncDirective,
    JMartAutoFocusDirective,
    AppPermissionDirective,
    JMartDateFormatDirective,
    JMartNumberFormatDirective,
    Breadcrumb,
    BeneficiarioModalComponent,
    FileManagerComponent,
    OtroIngresoModalComponent
  ],
  templateUrl: './socios.html',
  styleUrl: './socios.scss',
})
export class SociosComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('socioFormRef') formRef?: NgForm;
  @ViewChild('wizardSlot') wizardSlotRef?: ElementRef<HTMLElement>;
  @ViewChild('wizardCard') wizardCardRef?: ElementRef<HTMLElement>;
  @ViewChild('wizardSteps') wizardStepsRef?: ElementRef<HTMLElement>;
  @ViewChildren('wizardStep') wizardStepRefs?: QueryList<ElementRef<HTMLElement>>;
  @ViewChild('ingresosAnuales') ingresosAnualesRef?: ElementRef<HTMLInputElement>;
  @ViewChild('ubicacionLaboral') ubicacionLaboralSelectRef?: ElementRef<HTMLSelectElement>;
  @ViewChild('area') areaSelectRef?: ElementRef<HTMLSelectElement>;
  @ViewChild('cargo') cargoSelectRef?: ElementRef<HTMLSelectElement>;


  @ViewChild('tipoIdentificacion') tipoIdentificacionSelectRef?: ElementRef<HTMLSelectElement>;
  @ViewChild('paisEmisor') paisEmisorSelectRef?: ElementRef<HTMLSelectElement>;
  @ViewChild('estadoCivil') estadoCivilSelectRef?: ElementRef<HTMLSelectElement>;
  @ViewChild('paisNacimiento') paisNacimientoSelectRef?: ElementRef<HTMLSelectElement>;
  @ViewChild('nacionalidad') nacionalidadSelectRef?: ElementRef<HTMLSelectElement>;
  @ViewChild('departamento') departamentoSelectRef?: ElementRef<HTMLSelectElement>;
  @ViewChild('municipio') municipioSelectRef?: ElementRef<HTMLSelectElement>;
  @ViewChild('sociedadLabora') sociedadLaboraSelectRef?: ElementRef<HTMLSelectElement>;
  @ViewChild('conyugeTipoIdentificacion') conyugeTipoIdentificacionSelectRef?: ElementRef<HTMLSelectElement>;
  @ViewChild('conyugePaisNacimiento') conyugePaisNacimientoSelectRef?: ElementRef<HTMLSelectElement>;
  @ViewChild('conyugeNacionalidad') conyugeNacionalidadSelectRef?: ElementRef<HTMLSelectElement>;

  private sociosService = inject(SociosService);
  private catalogosService = inject(CatalogosService);
  private translate = inject(TranslateService);
  private draftService = inject(DraftFormService);
  private engine = inject(JMartMassiveValidationService);
  public notify = inject(NotificationService);
  private langService = inject(LanguageService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public appConfigService = inject(AppConfigService);
  public readonly permissionService = inject(PermissionService)
  fileService = inject(FileManagerService);

  public bloquearSeccionAfiliacion = false;
  public bloquearAhorroCorriente = false;
  public bloquearAhorroNavidena = false;
  public bloquearSeccionAhorro = false;
  public anioNavideno: number | null = null;


  fileManagerConfig = {
    entityId: null as string | null,
    rootFolder: 'socios',
  };



  activeSection = 'datos-personales';

  readonly sections = [
    'datos-personales',
    'afiliacion',
    'ahorro',
    'actividad-economica',
    'datos-conyuge',
    'beneficiarios',
    'file-manager',
  ];



  socio: SocioForm = { ...EMPTY_SOCIO };
  copy: SocioForm = { ...EMPTY_SOCIO };

  otrosIngresosDetalle: OtroIngresoForm[] = [];
  otroIngresoModalOpen = false;
  otroIngresoSaving = false;
  otroIngresoEditing: OtroIngresoForm | null = null;
  otroIngresoDraft: OtroIngresoForm = { ...EMPTY_OTRO_INGRESO };



  breadcrumbs = [
    { label: '', url: '' },
    { label: '', url: '/' },
    { label: '' }
  ];

  paisesEmisor: CatalogoItem[] = [];
  nacionalidades: CatalogoItem[] = [];
  departamentos: CatalogoItem[] = [];
  municipios: MunicipioItem[] = [];
  bancos: Banco[] = [];
  sociedadesLaborales: any[] = [];
  ubicacionesLaborales: any[] = [];
  areasLaborales: any[] = [];
  cargosLaborales: any[] = [];


  afiliacionCuotasOptions: number[] = [];
  membresiaCuotasOptions: number[] = [];

  formReady = false;
  dataReady = false;
  loading = false;

  mode: 'create' | 'view' | 'edit' = 'create';
  socioId: string | null = null;

  draftRef?: DraftRef<SocioForm>;

  wizardAffixed = false;
  wizardPlaceholderHeight = 0;
  wizardPosition = '';
  wizardTop = '';
  wizardLeft = '';
  wizardWidth = '';
  wizardZIndex = '';

  private langChangeSub?: Subscription;
  languages: any[] = [];

  private tipoIdentificacionChoices: any;
  private paisEmisorChoices: any;
  private estadoCivilChoices: any;
  private paisNacimientoChoices: any;
  private nacionalidadChoices: any;
  private departamentoChoices: any;
  private municipioChoices: any;
  private sociedadLaboraChoices: any;
  private conyugeTipoIdentificacionChoices: any;
  private conyugePaisNacimientoChoices: any;
  private conyugeNacionalidadChoices: any;
  public FechaCreacion: any;
  private ubicacionLaboralChoices: any;
  private areaChoices: any;
  private cargoChoices: any;


  beneficiarios: BeneficiarioForm[] = [];
  beneficiarioModalOpen = false;
  beneficiarioSaving = false;
  beneficiarioEditing: BeneficiarioForm | null = null;
  beneficiarioDraft: BeneficiarioForm = { ...EMPTY_BENEFICIARIO };





  private readonly isBrowser: boolean;
  private readonly desktopBreakpoint = 1200;
  private readonly affixTopDesktop = 96;
  private readonly affixTopMobile = 8;
  private readonly scrollOffsetDesktop = 112;
  private readonly scrollOffsetMobile = 120;
  private readonly subs = new Subscription();

  private readonly onScrollBound = () => {
    this.zone.run(() => {
      this.updateActiveSectionByScroll();
      this.updateWizardAffix();
      this.syncWizardHorizontalScroll();
      this.cdr.detectChanges();
    });
  };

  private readonly onResizeBound = () => {
    this.zone.run(() => {
      this.updateActiveSectionByScroll();
      this.updateWizardAffix();
      this.syncWizardHorizontalScroll();
      this.cdr.detectChanges();
    });
  };

  private readonly onFocusInBound = (event: Event) => {
    this.zone.run(() => {
      this.updateActiveSectionFromEvent(event);
      this.syncWizardHorizontalScroll();
      this.cdr.detectChanges();
    });
  };

  private readonly onClickBound = (event: Event) => {
    this.zone.run(() => {
      this.updateActiveSectionFromEvent(event);
      this.syncWizardHorizontalScroll();
      this.cdr.detectChanges();
    });
  };

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private zone: NgZone,
    private cdr: ChangeDetectorRef,
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.engine.addControl('bloquearAhorroCorriente');
    this.engine.addControl('bloquearAhorroCorriente');

    this.engine.setControlValue(
      'bloquearAhorroCorriente',
      false
    );

    this.engine.setControlValue(
      'bloquearAhorroCorriente',
      false
    );



    this.loadBreadcrumbs();
    this.loadCatalogos();



    this.subs.add(
      this.translate.onLangChange.subscribe(() => {
        this.loadBreadcrumbs();
        this.loadSocioConfig();
        this.loadCatalogos();
        this.syncAfiliacionConfigValues();
        this.cdr.detectChanges();
      })
    );

  }

  private syncFileManagerConfig(): void {
    this.fileManagerConfig = {
      ...this.fileManagerConfig,
      entityId: this.socio?.codigoSocio ?? null,


    };
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;

    this.formReady = true;

    window.addEventListener('scroll', this.onScrollBound, { passive: true });
    window.addEventListener('resize', this.onResizeBound, { passive: true });
    window.document.addEventListener('focusin', this.onFocusInBound);
    window.document.addEventListener('click', this.onClickBound);

    this.loadSocioConfig();
    this.syncAfiliacionConfigValues();
    this.initRouteModeAndLoad();

    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.languages = this.langService.getAvailableLanguages();
      this.loadSocioConfig();
      this.syncAfiliacionConfigValues();
      this.refreshAllChoices();
    });

    setTimeout(() => {
      this.updateActiveSectionByScroll();
      this.updateWizardAffix();
      this.syncWizardHorizontalScroll();
      this.initAllChoices();
      this.reapplyChoicesValues();
      this.cdr.detectChanges();
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.isBrowser) {
      window.removeEventListener('scroll', this.onScrollBound);
      window.removeEventListener('resize', this.onResizeBound);
      window.document.removeEventListener('focusin', this.onFocusInBound);
      window.document.removeEventListener('click', this.onClickBound);
    }

    this.destroyAllChoices();
    this.langChangeSub?.unsubscribe();
    this.draftRef?.cancel();
    this.subs.unsubscribe();
  }

  private destroyAllChoices(): void {
    try { this.tipoIdentificacionChoices?.destroy(); } catch { }
    try { this.paisEmisorChoices?.destroy(); } catch { }
    try { this.estadoCivilChoices?.destroy(); } catch { }
    try { this.paisNacimientoChoices?.destroy(); } catch { }
    try { this.nacionalidadChoices?.destroy(); } catch { }
    try { this.departamentoChoices?.destroy(); } catch { }
    try { this.municipioChoices?.destroy(); } catch { }
    try { this.sociedadLaboraChoices?.destroy(); } catch { }
    try { this.conyugeTipoIdentificacionChoices?.destroy(); } catch { }
    try { this.conyugePaisNacimientoChoices?.destroy(); } catch { }
    try { this.conyugeNacionalidadChoices?.destroy(); } catch { }
    try { this.ubicacionLaboralChoices?.destroy(); } catch { }
    try { this.areaChoices?.destroy(); } catch { }
    try { this.cargoChoices?.destroy(); } catch { }

    this.tipoIdentificacionChoices = null;
    this.paisEmisorChoices = null;
    this.estadoCivilChoices = null;
    this.paisNacimientoChoices = null;
    this.nacionalidadChoices = null;
    this.departamentoChoices = null;
    this.municipioChoices = null;
    this.sociedadLaboraChoices = null;
    this.conyugeTipoIdentificacionChoices = null;
    this.conyugePaisNacimientoChoices = null;
    this.conyugeNacionalidadChoices = null;
    this.ubicacionLaboralChoices = null;
    this.areaChoices = null;
    this.cargoChoices = null;
  }

  private initAllChoices(): void {
    this.initTipoIdentificacionChoices();
    this.initPaisEmisorChoices();
    this.initEstadoCivilChoices();
    this.initPaisNacimientoChoices();
    this.initNacionalidadChoices();
    this.initDepartamentoChoices();
    this.initMunicipioChoices();
    this.initSociedadLaboraChoices();
    this.initUbicacionLaboralChoices();
    this.initAreaChoices();
    this.initCargoChoices();
    this.initConyugeTipoIdentificacionChoices();
    this.initConyugePaisNacimientoChoices();
    this.initConyugeNacionalidadChoices();
  }

  private refreshAllChoices(): void {
    if (!this.isBrowser) return;

    setTimeout(() => {
      this.initAllChoices();
      this.reapplyChoicesValues();
    }, 50);
  }

  private reapplyChoicesValues(): void {
    requestAnimationFrame(() => {
      this.setChoicesValue(this.tipoIdentificacionChoices, this.socio.tipoIdentificacion);
      this.setChoicesValue(this.paisEmisorChoices, this.socio.paisEmisor);
      this.setChoicesValue(this.estadoCivilChoices, this.socio.estadoCivil);
      this.setChoicesValue(this.paisNacimientoChoices, this.socio.paisNacimiento);
      this.setChoicesValue(this.nacionalidadChoices, this.socio.nacionalidadId);
      this.setChoicesValue(this.departamentoChoices, this.socio.departamentoId);
      this.setChoicesValue(this.municipioChoices, this.socio.municipioId);
      this.setChoicesValue(this.sociedadLaboraChoices, this.socio.sociedadLabora);
      this.setChoicesValue(this.conyugeTipoIdentificacionChoices, this.socio.conyugeTipoIdentificacion);
      this.setChoicesValue(this.conyugePaisNacimientoChoices, this.socio.conyugePaisNacimiento);
      this.setChoicesValue(this.conyugeNacionalidadChoices, this.socio.conyugeNacionalidadId);
      this.setChoicesValue(this.ubicacionLaboralChoices, this.socio.ubicacionLaboral);
      this.setChoicesValue(this.areaChoices, this.socio.area);
      this.setChoicesValue(this.cargoChoices, this.socio.cargo);
    });
  }

  private clearAllChoicesSelections(): void {
    this.clearChoicesSelection(this.tipoIdentificacionChoices);
    this.clearChoicesSelection(this.paisEmisorChoices);
    this.clearChoicesSelection(this.estadoCivilChoices);
    this.clearChoicesSelection(this.paisNacimientoChoices);
    this.clearChoicesSelection(this.nacionalidadChoices);
    this.clearChoicesSelection(this.departamentoChoices);
    this.clearChoicesSelection(this.municipioChoices);
    this.clearChoicesSelection(this.sociedadLaboraChoices);
    this.clearChoicesSelection(this.conyugeTipoIdentificacionChoices);
    this.clearChoicesSelection(this.conyugePaisNacimientoChoices);
    this.clearChoicesSelection(this.conyugeNacionalidadChoices);
    this.clearChoicesSelection(this.ubicacionLaboralChoices);
    this.clearChoicesSelection(this.areaChoices);
    this.clearChoicesSelection(this.cargoChoices);
  }

  private clearChoicesSelection(instance: any): void {
    if (!instance) return;

    try {
      instance.removeActiveItems?.();

      const passedElement = instance.passedElement?.element as HTMLSelectElement | undefined;
      if (passedElement) {
        passedElement.value = '';
        const firstOption = passedElement.querySelector('option[value=""]') as HTMLOptionElement | null;
        if (firstOption) {
          firstOption.selected = true;
        }
        passedElement.dispatchEvent(new Event('change', { bubbles: true }));
      }
    } catch { }
  }

  private resetFormAfterSuccess(response?: any): void {
    this.draftRef?.clear();
    this.draftRef?.cancel();

    this.socio = this.toSocioForm({ ...EMPTY_SOCIO });
    this.copy = this.toSocioForm({ ...EMPTY_SOCIO });
    this.syncAfiliacionConfigValues();
    this.municipios = [];
    this.activeSection = 'datos-personales';

    this.formRef?.resetForm(this.socio);
    this.syncCatalogValuesWithOptions();
    this.patchEngineFromSocio();
    this.engine.clearErrors?.();

    this.formRef?.form.markAsPristine();
    this.formRef?.form.markAsUntouched();

    this.bloquearSeccionAfiliacion = false;
    this.bloquearAhorroCorriente = false;
    this.bloquearAhorroNavidena = false;
    this.bloquearSeccionAhorro = false;
    this.anioNavideno = null;

    this.cdr.detectChanges();

    setTimeout(() => {
      this.refreshAllChoices();

      setTimeout(() => {
        this.clearAllChoicesSelections();
        this.reapplyChoicesValues();

        this.formRef?.form.markAsPristine();
        this.formRef?.form.markAsUntouched();

        this.cdr.detectChanges();

        if (response) {
          this.notify.showFromApiResponse?.(response, 'success');
        }
      }, 80);
    }, 80);
  }

  private removeOrphanChoicesWrapper(element: HTMLSelectElement): void {
    const nextSibling = element.nextElementSibling as HTMLElement | null;
    if (nextSibling?.classList.contains('choices')) {
      nextSibling.remove();
    }
  }

  private findCatalogIdByValue(
    items: Array<{ id: any; nombre?: string | null }>,
    value: any
  ): string | null {
    const raw = String(value ?? '').trim();
    if (!raw) return null;

    if (!items?.length) {
      return raw;
    }

    const byId = items.find(x => String(x.id) === raw);
    if (byId) return String(byId.id);

    const byNombre = items.find(
      x => String(x.nombre ?? '').trim().toLowerCase() === raw.toLowerCase()
    );
    if (byNombre) return String(byNombre.id);

    return raw;
  }

  private syncCatalogValuesWithOptions(): void {
    this.socio.paisEmisor = this.findCatalogIdByValue(this.paisesEmisor, this.socio.paisEmisor);
    this.copy.paisEmisor = this.findCatalogIdByValue(this.paisesEmisor, this.copy.paisEmisor);

    this.socio.paisNacimiento = this.findCatalogIdByValue(this.paisesEmisor, this.socio.paisNacimiento);
    this.copy.paisNacimiento = this.findCatalogIdByValue(this.paisesEmisor, this.copy.paisNacimiento);

    this.socio.conyugePaisNacimiento = this.findCatalogIdByValue(this.paisesEmisor, this.socio.conyugePaisNacimiento);
    this.copy.conyugePaisNacimiento = this.findCatalogIdByValue(this.paisesEmisor, this.copy.conyugePaisNacimiento);

    this.socio.nacionalidadId = this.findCatalogIdByValue(this.nacionalidades, this.socio.nacionalidadId);
    this.copy.nacionalidadId = this.findCatalogIdByValue(this.nacionalidades, this.copy.nacionalidadId);

    this.socio.conyugeNacionalidadId = this.findCatalogIdByValue(this.nacionalidades, this.socio.conyugeNacionalidadId);
    this.copy.conyugeNacionalidadId = this.findCatalogIdByValue(this.nacionalidades, this.copy.conyugeNacionalidadId);
  }

  private loadBreadcrumbs(): void {
    const url = this.router.url.toLowerCase();

    if (url.endsWith('/new')) {
      this.breadcrumbs = this.translate.instant('socios.breadcrumbs.new') || [];
      return;
    }

    if (url.endsWith('/edit')) {
      this.breadcrumbs = this.translate.instant('socios.breadcrumbs.edit') || [];
      return;
    }

    this.breadcrumbs = this.translate.instant('socios.breadcrumbs.list') || [];
  }

  private initRouteModeAndLoad(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const url = this.router.url.toLowerCase();

    this.bloquearSeccionAfiliacion = false;
    this.bloquearAhorroCorriente = false;
    this.bloquearAhorroNavidena = false;
    this.bloquearSeccionAhorro = false;
    this.anioNavideno = null;

    this.socioId = id;
    this.loadBreadcrumbs();

    if (url.endsWith('/new')) {
      this.mode = 'create';
      this.socio = { ...EMPTY_SOCIO };
      this.copy = { ...EMPTY_SOCIO };
      this.syncAfiliacionConfigValues();
      this.patchEngineFromSocio();
      this.dataReady = true;
      this.tryInitDraftManager();
      this.refreshAllChoices();
      return;
    }

    this.mode = url.endsWith('/edit') ? 'edit' : 'view';

    if (!id) {
      this.notify.show?.(
        this.translate.instant('socios.messages.missingId'),
        '',
        'warning'
      );
      this.router.navigate(['/socios']);
      return;
    }

    this.loadSocioById(id);
  }

  private loadSocioById(id: string): void {
    this.loading = true;



    this.engine.setControlValue(
      'bloquearAhorroCorriente',
      false
    );

    this.engine.setControlValue(
      'bloquearAhorroCorriente',
      false
    );


    this.sociosService
      .getById(id)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res: any) => {
          const socioApi = res?.data?.socio ?? null;


          this.engine.setControlValue(
            'bloquearAhorroCorriente',
            socioApi.bloquearAhorroCorriente
          );

          this.engine.setControlValue(
            'bloquearAhorroCorriente',
            socioApi.bloquearAhorroNavidena
          );





          socioApi.fechaEmision = this.appConfigService.formatDate(socioApi.fechaEmision);
          socioApi.fechaVencimiento = this.appConfigService.formatDate(socioApi.fechaVencimiento);
          socioApi.fechaNacimiento = this.appConfigService.formatDate(socioApi.fechaNacimiento);
          socioApi.fechaIngreso = this.appConfigService.formatDate(socioApi.fechaIngreso);
          socioApi.cuentaCorrienteFechaInicioDeduccion = this.appConfigService.formatDate(socioApi.cuentaCorrienteFechaInicioDeduccion);
          socioApi.cuentaNavidenaFechaInicioDeduccion = this.appConfigService.formatDate(socioApi.cuentaNavidenaFechaInicioDeduccion);

          this.bloquearSeccionAfiliacion = !!socioApi?.bloquearSeccionAfiliacion;
          this.bloquearAhorroCorriente = !!socioApi?.bloquearAhorroCorriente;
          this.bloquearAhorroNavidena = !!socioApi?.bloquearAhorroNavidena;
          this.bloquearSeccionAhorro = !!socioApi?.bloquearSeccionAhorro;
          this.anioNavideno = socioApi?.anioNavideno != null
            ? Number(socioApi.anioNavideno)
            : null;


          this.FechaCreacion = socioApi.createdAtUtc;


          if (!socioApi) {
            this.notify.show?.(
              this.translate.instant('socios.messages.notFound'),
              '',
              'warning'
            );
            this.router.navigate(['/socios']);
            return;
          }

          const socioMapped = this.toSocioForm(socioApi);

          const paisEmisorId = this.findCatalogIdByValue(
            this.paisesEmisor,
            socioApi?.paisEmisorId ?? socioApi?.paisEmisor ?? socioMapped.paisEmisor
          );

          const paisNacimientoId = this.findCatalogIdByValue(
            this.paisesEmisor,
            socioApi?.paisNacimientoId ?? socioApi?.paisNacimiento ?? socioMapped.paisNacimiento
          );

          const nacionalidadId = this.findCatalogIdByValue(
            this.nacionalidades,
            socioApi?.nacionalidadId ?? socioApi?.nacionalidad ?? socioMapped.nacionalidadId
          );

          const conyugePaisNacimientoId = this.findCatalogIdByValue(
            this.paisesEmisor,
            socioApi?.conyugePaisNacimientoId ?? socioApi?.conyugePaisNacimiento
          );

          const conyugeNacionalidadId = this.findCatalogIdByValue(
            this.nacionalidades,
            socioApi?.conyugeNacionalidadId ?? socioApi?.conyugeNacionalidad
          );

          this.socio = {
            ...socioMapped,
            paisEmisor: paisEmisorId,
            paisNacimiento: paisNacimientoId,
            nacionalidadId,
            conyugePaisNacimiento: conyugePaisNacimientoId,
            conyugeNacionalidadId
          };

          this.copy = {
            ...socioMapped,
            paisEmisor: paisEmisorId,
            paisNacimiento: paisNacimientoId,
            nacionalidadId,
            conyugePaisNacimiento: conyugePaisNacimientoId,
            conyugeNacionalidadId
          };


          this.syncFileManagerConfig();

          this.syncAfiliacionConfigValues();

          this.loadBeneficiarios(id);
          this.loadOtrosIngresos(id);


          this.patchEngineFromSocio();
          this.engine.clearErrors?.();

          this.loadMunicipiosIfNeeded(this.socio.municipioId, () => {
            this.copy.municipioId = this.socio.municipioId;

            this.dataReady = true;
            this.tryInitDraftManager();

            this.cdr.detectChanges();
            this.refreshAllChoices();

            setTimeout(() => {
              this.reapplyChoicesValues();
              this.setChoicesValue(this.municipioChoices, this.socio.municipioId);
              this.formRef?.form.markAsPristine();
              this.formRef?.form.markAsUntouched();
              this.cdr.detectChanges();
            }, 100);
          });
        },
        error: (err: any) => {
          this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
          this.router.navigate(['/socios']);
        }
      });
  }

  loadSocioConfig(): void {
    this.engine.resetRules?.();
    this.engine.clearFieldsMeta?.();

    const fieldMeta = this.translate.instant('socios.form.fieldMeta') || {};
    const validations = this.translate.instant('socios.form.validations') || {};

    for (const [fieldId, meta] of Object.entries(fieldMeta as Record<string, any>)) {
      this.engine.addFieldMeta?.({
        id: fieldId,
        label: meta?.label ?? '',
        tooltip: meta?.tooltip ?? '',
        tooltipIconClass: meta?.tooltipIconClass ?? '',
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
          classIconError: rule?.classIconError ?? '',
        });
      }
    }

    // Registrar fecha servidor
    this.engine.addControl('FechaServidor');

    this.engine.setControlValue(
      'FechaServidor',
      this.appConfigService.getCurrentSettings().fechaServidor
    );

    this.engine.validateAll?.();
    this.engine.clearErrors?.();

  }

  private loadCatalogos(): void {

    this.sociosService.getCatalogosEmpleo().subscribe({
      next: (res: any) => {
        this.sociedadesLaborales = [...(res?.data?.sociedades ?? [])];
        this.ubicacionesLaborales = [...(res?.data?.ubicaciones ?? [])];
        this.areasLaborales = [...(res?.data?.areas ?? [])];
        this.cargosLaborales = [...(res?.data?.cargos ?? [])];

        this.patchEngineFromSocio();
        this.cdr.detectChanges();
        this.refreshAllChoices();
      },
      error: () => {
        this.sociedadesLaborales = [];
        this.ubicacionesLaborales = [];
        this.areasLaborales = [];
        this.cargosLaborales = [];

        this.refreshAllChoices();
      }
    });


    this.catalogosService.getPaises().subscribe({
      next: (res: any) => {
        this.paisesEmisor = [...(res?.data?.paises ?? [])];
        this.syncCatalogValuesWithOptions();
        this.patchEngineFromSocio();
        this.cdr.detectChanges();
        this.refreshAllChoices();
      },
      error: () => {
        this.paisesEmisor = [];
        this.refreshAllChoices();
      }
    });

    this.catalogosService.getNacionalidades().subscribe({
      next: (res: any) => {
        this.nacionalidades = [...(res?.data?.nacionalidades ?? [])];
        this.syncCatalogValuesWithOptions();
        this.patchEngineFromSocio();
        this.cdr.detectChanges();
        this.refreshAllChoices();
      },
      error: () => {
        this.nacionalidades = [];
        this.refreshAllChoices();
      }
    });

    this.catalogosService.getDepartamentos().subscribe({
      next: (res: any) => {
        this.departamentos = [...(res?.data?.departamentos ?? [])];
        this.cdr.detectChanges();
        this.refreshAllChoices();
      },
      error: () => {
        this.departamentos = [];
        this.refreshAllChoices();
      }
    });

    this.catalogosService.getBancos().subscribe({
      next: (res: any) => {
        this.bancos = [...(res?.data?.bancos ?? [])];
        this.cdr.detectChanges();
      },
      error: () => {
        this.bancos = [];
        this.cdr.detectChanges();
      }
    });
  }

  onDepartamentoChange(departamentoId: string): void {
    this.socio.departamentoId = departamentoId || null;
    this.socio.municipioId = null;
    this.municipios = [];

    this.patchEngineFromSocio();
    this.cdr.detectChanges();
    this.refreshAllChoices();

    if (!this.socio.departamentoId) {
      return;
    }

    this.catalogosService.getMunicipios(this.socio.departamentoId).subscribe({
      next: (res: any) => {
        this.municipios = [...(res?.data?.municipios ?? [])];
        this.patchEngineFromSocio();
        this.cdr.detectChanges();

        setTimeout(() => {
          this.refreshAllChoices();
          setTimeout(() => {
            this.setChoicesValue(this.departamentoChoices, this.socio.departamentoId);
            this.setChoicesValue(this.municipioChoices, this.socio.municipioId);
            this.cdr.detectChanges();
          }, 80);
        }, 50);
      },
      error: () => {
        this.municipios = [];
        this.cdr.detectChanges();
        this.refreshAllChoices();
      }
    });
  }


  private loadMunicipiosIfNeeded(
    municipioIdToKeep?: string | null,
    done?: () => void
  ): void {
    const municipioTarget = municipioIdToKeep ?? this.socio.municipioId ?? null;

    if (!this.socio.departamentoId) {
      this.municipios = [];
      this.cdr.detectChanges();
      this.refreshAllChoices();
      done?.();
      return;
    }

    this.catalogosService.getMunicipios(this.socio.departamentoId).subscribe({
      next: (res: any) => {
        this.municipios = [...(res?.data?.municipios ?? [])];

        const exists = this.municipios.some(
          m => String(m.id) === String(municipioTarget)
        );

        if (exists) {
          this.socio.municipioId = municipioTarget;
        }

        this.cdr.detectChanges();

        setTimeout(() => {
          this.initMunicipioChoices();
          this.setChoicesValue(this.municipioChoices, this.socio.municipioId);
          this.cdr.detectChanges();
          done?.();
        }, 80);
      },
      error: () => {
        this.municipios = [];
        this.cdr.detectChanges();
        this.refreshAllChoices();
        done?.();
      }
    });
  }

  private tryInitDraftManager(): void {
    if (!this.formReady || !this.dataReady || !this.formRef || this.draftRef) {
      return;
    }

    queueMicrotask(() => {
      this.draftRef = this.draftService.connect<SocioForm>({
        form: this.formRef!,
        routeKey: `socios-edit-${this.socio.id ?? 'new'}`,

        currentData: () => ({
          ...this.socio,
          beneficiarios: this.mapBeneficiarios(this.beneficiarios),
          otrosIngresosDetalle: this.mapOtrosIngresos(this.otrosIngresosDetalle)
        }),

        savedData: () => ({
          ...this.copy,
          beneficiarios: this.mapBeneficiarios(this.copy.beneficiarios),
          otrosIngresosDetalle: this.mapOtrosIngresos(this.copy.otrosIngresosDetalle)
        }),

        restoreData: (data: Partial<SocioForm> | null | undefined) => {
          this.socio = this.toSocioForm({
            ...this.copy,
            ...(data ?? {}),
          });

          this.beneficiarios = this.mapBeneficiarios(data?.beneficiarios);
          this.socio.beneficiarios = [...this.beneficiarios];

          this.otrosIngresosDetalle = this.mapOtrosIngresos(data?.otrosIngresosDetalle);
          this.socio.otrosIngresosDetalle = [...this.otrosIngresosDetalle];
          this.socio.otrosIngresos = this.totalOtrosIngresos;
          this.calcularIngresosAnuales();


          this.syncAfiliacionConfigValues();
          this.patchEngineFromSocio();
          this.loadMunicipiosIfNeeded(this.socio.municipioId, () => {
            this.cdr.detectChanges();

            setTimeout(() => {
              this.syncCatalogValuesWithOptions();
              this.patchEngineFromSocio();
              this.refreshAllChoices();
              this.reapplyChoicesValues();
              this.cdr.detectChanges();
            }, 100);
          });
        },

        restoreSavedData: (data: Partial<SocioForm> | null | undefined) => {
          this.copy = this.toSocioForm(data);
          this.copy.beneficiarios = this.mapBeneficiarios(data?.beneficiarios);
          this.copy.otrosIngresosDetalle = this.mapOtrosIngresos(data?.otrosIngresosDetalle);

          const totalOtros = this.copy.otrosIngresosDetalle
            .filter(x => !x.isDeleted)
            .reduce((sum, item) => sum + Number(item.ingresoMensual ?? 0), 0);

          const mensual = this.toNumber(this.copy.ingresosMensuales);
          const nuevoAnual = (!mensual && !totalOtros)
            ? null
            : Number(((mensual + totalOtros) * 12).toFixed(2));

          this.copy.otrosIngresos = totalOtros;
          this.copy.ingresosAnuales = nuevoAnual;

          this.syncAfiliacionConfigValues();
          this.syncCatalogValuesWithOptions();
        },

        patchEngine: (data: Partial<SocioForm> | null | undefined) => {
          this.engine.patchValues?.(data ?? {});
          this.engine.clearErrors?.();
        },

        normalize: (data: Partial<SocioForm> | null | undefined) => this.normalize(data),

        warningTitleKey: 'draft.unsavedDataTitle',
        warningMessageKey: 'draft.unsavedDataRestored'
      });
    });
  }





  private normalize(
    data: Partial<SocioForm> | null | undefined
  ): Partial<SocioForm> {
    return {
      ...data,
      id: data?.id ?? null,

      paisEmisor: this.normalizeEmpty(data?.paisEmisor),
      paisNacimiento: this.normalizeEmpty(data?.paisNacimiento),
      nacionalidadId: this.normalizeEmpty(data?.nacionalidadId),
      departamentoId: this.normalizeEmpty(data?.departamentoId),
      municipioId: this.normalizeEmpty(data?.municipioId),
      conyugePaisNacimiento: this.normalizeEmpty(data?.conyugePaisNacimiento),
      conyugeNacionalidadId: this.normalizeEmpty(data?.conyugeNacionalidadId),

      fechaEmision: this.normalizeEmpty(data?.fechaEmision),
      fechaIngreso: this.normalizeEmpty(data?.fechaIngreso),
      fechaNacimiento: this.normalizeEmpty(data?.fechaNacimiento),
      fechaVencimiento: this.normalizeEmpty(data?.fechaVencimiento),
      cuentaCorrienteFechaInicioDeduccion: this.normalizeEmpty(data?.cuentaCorrienteFechaInicioDeduccion),
      cuentaNavidenaFechaInicioDeduccion: this.normalizeEmpty(data?.cuentaNavidenaFechaInicioDeduccion),

      ingresosMensuales:
        data?.ingresosMensuales == null ? null : Number(data.ingresosMensuales),
      otrosIngresos:
        data?.otrosIngresos == null ? null : Number(data.otrosIngresos),
      ingresosAnuales:
        data?.ingresosAnuales == null ? null : Number(data.ingresosAnuales),

      afiliacionCuotas:
        data?.afiliacionCuotas == null ? null : Number(data.afiliacionCuotas),
      afiliacionCostoTotal:
        data?.afiliacionCostoTotal == null ? null : Number(data.afiliacionCostoTotal),

      membresiaCuotas:
        data?.membresiaCuotas == null ? null : Number(data.membresiaCuotas),
      membresiaCostoTotal:
        data?.membresiaCostoTotal == null ? null : Number(data.membresiaCostoTotal),

      cuentaCorrienteMontoCuota:
        data?.cuentaCorrienteMontoCuota == null ? null : Number(data.cuentaCorrienteMontoCuota),
      cuentaNavidenaMontoCuota:
        data?.cuentaNavidenaMontoCuota == null ? null : Number(data.cuentaNavidenaMontoCuota),

      beneficiarios: this.mapBeneficiarios(data?.beneficiarios).filter(x => !x.isDeleted),
      otrosIngresosDetalle: this.mapOtrosIngresos(data?.otrosIngresosDetalle).filter(x => !x.isDeleted),
    };
  }



  private toSocioForm(
    data: Partial<SocioForm> | null | undefined
  ): SocioForm {
    return {
      ...EMPTY_SOCIO,
      ...this.normalize(data),
      id: data?.id ?? null,
    };
  }

  private patchEngineFromSocio(): void {
    this.engine.patchValues?.(this.socio);
  }

  hasUnsavedChanges(): boolean {
    const current = this.normalize({
      ...this.socio,
      beneficiarios: this.mapBeneficiarios(this.beneficiarios),
      otrosIngresosDetalle: this.mapOtrosIngresos(this.otrosIngresosDetalle),
      otrosIngresos: this.totalOtrosIngresos,
      ingresosAnuales: this.socio.ingresosAnuales
    });

    const saved = this.normalize({
      ...this.copy,
      beneficiarios: this.mapBeneficiarios(this.copy.beneficiarios),
      otrosIngresosDetalle: this.mapOtrosIngresos(this.copy.otrosIngresosDetalle),
      otrosIngresos: this.copy.otrosIngresos,
      ingresosAnuales: this.copy.ingresosAnuales
    });

    return JSON.stringify(current) !== JSON.stringify(saved);
  }

  private normalizeDate(value: string | null): string | null {
    if (!value) return null;

    // ya viene yyyy-MM-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    // viene dd/MM/yyyy
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) {
      const [, dd, mm, yyyy] = match;
      return `${yyyy}-${mm}-${dd}`;
    }

    return value;
  }



  onCuentaCorrienteToggle(): void {
    if (!this.socio.cuentaCorrienteActiva) {
      this.socio.cuentaCorrienteFechaInicioDeduccion = null;
      this.socio.cuentaCorrienteMontoCuota = null;
    }
  }

  onCuentaNavidenaToggle(): void {
    if (!this.socio.cuentaNavidenaActiva) {
      this.socio.cuentaNavidenaFechaInicioDeduccion = null;
      this.socio.cuentaNavidenaMontoCuota = null;
    }
  }

  onSave(): void {
    if (this.mode === 'view') {
      return;
    }



    this.engine.patchValues?.({
      ...this.socio,
      beneficiarioPorcentaje: this.beneficiariosTotalPorcentaje
    });


    const ok = this.engine.validateAll?.();

    if (!ok) {
      this.notify.show?.(this.engine.getGroupedErrorsHtmlSnapshot?.(), '', 'warning');
      return;
    }

    this.engine.clearErrors?.();
    this.notify.close?.();

    const payload = this.toSocioForm(this.socio);
    payload.fechaEmision = this.normalizeDate(this.socio.fechaEmision);
    payload.fechaIngreso = this.normalizeDate(this.socio.fechaIngreso);
    payload.fechaNacimiento = this.normalizeDate(this.socio.fechaNacimiento);
    payload.fechaVencimiento = this.normalizeDate(this.socio.fechaVencimiento);
    payload.cuentaCorrienteFechaInicioDeduccion = this.normalizeDate(this.socio.cuentaCorrienteFechaInicioDeduccion);
    payload.cuentaNavidenaFechaInicioDeduccion = this.normalizeDate(this.socio.cuentaNavidenaFechaInicioDeduccion);




    this.sociosService
      .save(payload)
      .pipe(finalize(() => { }))
      .subscribe({
        next: (res: any) => {
          if (this.mode === 'edit') {
            const savedId = res?.data?.socio?.id ?? this.socio.id;

            this.draftRef?.clear();
            this.draftRef?.cancel();
            this.notify.showFromApiResponse?.(res, 'success');

            if (savedId) {
              this.draftRef = undefined;
              this.dataReady = false;
              this.loadSocioById(savedId);
            }

            return;
          }

          this.resetFormAfterSuccess(res);
        },
        error: (err: any) => {
          this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
        },
      });
  }
  onCancel(): void {
    this.notify.close?.();
    this.draftRef?.cancel();

    this.beneficiarios = this.mapBeneficiarios(this.copy.beneficiarios);
    this.socio.beneficiarios = [...this.beneficiarios];

    this.otrosIngresosDetalle = this.mapOtrosIngresos(this.copy.otrosIngresosDetalle);
    this.socio.otrosIngresosDetalle = [...this.otrosIngresosDetalle];
    this.socio.otrosIngresos = this.totalOtrosIngresos;
    this.calcularIngresosAnuales();

    this.syncAfiliacionConfigValues();
    this.syncCatalogValuesWithOptions();
    this.patchEngineFromSocio();
    this.engine.clearErrors?.();

    this.cdr.detectChanges();

    setTimeout(() => {
      this.refreshAllChoices();

      setTimeout(() => {
        this.reapplyChoicesValues();
        this.cdr.detectChanges();
      }, 80);
    }, 80);
  }
  @HostListener('window:beforeunload', ['$event'])
  handleBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.formRef?.form.dirty || !this.hasUnsavedChanges()) {
      return;
    }

    this.draftRef?.saveNow();
    event.preventDefault();
    event.returnValue = '';
  }

  @HostListener('window:pagehide')
  handlePageHide(): void {
    if (!this.formRef?.form.dirty) {
      return;
    }

    if (this.hasUnsavedChanges()) {
      this.draftRef?.saveNow();
    }
  }

  canDeactivate(): boolean | Observable<boolean> {
    const forceLogout = sessionStorage.getItem('force-logout') === '1';
    if (forceLogout) return true;

    if (!this.formRef?.form.dirty || !this.hasUnsavedChanges()) {
      this.draftRef?.clear();
      return true;
    }

    const title =
      this.translate.instant('socios.draft.leavePageTitle') || 'Advertencia';

    const message =
      this.translate.instant('socios.draft.leavePageMessage') ||
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
      }),
    );
  }

  scrollToSection(sectionId: string): void {
    if (!this.isBrowser) return;

    this.activeSection = sectionId;
    this.syncWizardHorizontalScroll();
    this.cdr.detectChanges();

    const section = window.document.getElementById(sectionId);
    if (!section) return;

    const isDesktop = window.innerWidth >= this.desktopBreakpoint;
    const offset = isDesktop
      ? this.scrollOffsetDesktop
      : this.scrollOffsetMobile;

    const top =
      section.getBoundingClientRect().top +
      window.scrollY -
      offset;

    window.scrollTo({
      top,
      behavior: 'smooth',
    });
  }
  isCompleted(sectionId: string): boolean {
    return this.sections.indexOf(sectionId) < this.sections.indexOf(this.activeSection);
  }

  private updateActiveSectionByScroll(): void {
    if (!this.isBrowser) return;

    // ✅ mientras el formulario/modal de beneficiario está abierto,
    // el wizard debe quedarse en beneficiarios
    if (this.beneficiarioModalOpen) {
      this.activeSection = 'beneficiarios';
      return;
    }

    const isDesktop = window.innerWidth >= this.desktopBreakpoint;
    const offset = isDesktop ? this.scrollOffsetDesktop : this.scrollOffsetMobile;
    const probeY = window.scrollY + offset;

    let current = this.sections[0];

    for (let i = 0; i < this.sections.length; i++) {
      const currentId = this.sections[i];
      const nextId = this.sections[i + 1];

      const currentEl = window.document.getElementById(currentId);
      if (!currentEl) continue;

      const currentTop = currentEl.getBoundingClientRect().top + window.scrollY;
      const nextEl = nextId ? window.document.getElementById(nextId) : null;
      const nextTop = nextEl
        ? nextEl.getBoundingClientRect().top + window.scrollY
        : Number.POSITIVE_INFINITY;

      if (probeY >= currentTop && probeY < nextTop) {
        current = currentId;
        break;
      }
    }

    this.activeSection = current;
  }

  private updateActiveSectionFromEvent(event: Event): void {
    if (!this.isBrowser) return;

    const target = event.target as HTMLElement | null;
    if (!target) return;

    // Si está abierto el modal de beneficiarios y el evento fue dentro del modal,
    // mantener beneficiarios activo
    const modal =
      target.closest('.beneficiario-modal') ||
      target.closest('.modal') ||
      target.closest('[data-beneficiario-modal="true"]');

    if (this.beneficiarioModalOpen && modal) {
      this.activeSection = 'beneficiarios';
      return;
    }

    // Caso especial: cualquier interacción dentro del file manager
    const fileManagerRoot =
      target.closest('#file-manager') ||
      target.closest('[data-section-root="file-manager"]') ||
      target.closest('.fm-shell');

    if (fileManagerRoot) {
      this.activeSection = 'file-manager';
      return;
    }

    // Para el resto de secciones, aceptar clicks/focus sobre casi cualquier elemento interactivo
    const interactive = target.closest(
      'input, select, textarea, button, a, label, .form-check, .form-switch, .choices, .choices__inner, .choices__item, .choices__list, .card, .card-body, .card-header'
    );

    if (!interactive) return;

    const section = target.closest('.socio-scroll-section') as HTMLElement | null;
    if (!section?.id) return;

    if (this.sections.includes(section.id)) {
      this.activeSection = section.id;
    }
  }

  private updateWizardAffix(): void {
    if (!this.isBrowser || !this.wizardSlotRef || !this.wizardCardRef) return;

    const slot = this.wizardSlotRef.nativeElement;
    const card = this.wizardCardRef.nativeElement;

    const isDesktop = window.innerWidth >= this.desktopBreakpoint;
    const affixTop = isDesktop ? this.affixTopDesktop : this.affixTopMobile;

    this.wizardPlaceholderHeight = card.offsetHeight;

    const slotRect = slot.getBoundingClientRect();
    const slotTopAbsolute = slotRect.top + window.scrollY;
    const shouldAffix = window.scrollY + affixTop >= slotTopAbsolute;

    if (!shouldAffix) {
      this.resetWizardAffix();
      return;
    }

    this.wizardAffixed = true;
    this.wizardPosition = 'fixed';
    this.wizardTop = `${affixTop}px`;
    this.wizardLeft = `${slotRect.left}px`;
    this.wizardWidth = `${slotRect.width}px`;
    this.wizardZIndex = '30';
  }

  private resetWizardAffix(): void {
    this.wizardAffixed = false;
    this.wizardPlaceholderHeight = 0;
    this.wizardPosition = '';
    this.wizardTop = '';
    this.wizardLeft = '';
    this.wizardWidth = '';
    this.wizardZIndex = '';
  }

  private syncWizardHorizontalScroll(): void {
    if (!this.isBrowser) return;
    if (window.innerWidth >= this.desktopBreakpoint) return;
    if (!this.wizardStepsRef || !this.wizardStepRefs?.length) return;

    const container = this.wizardStepsRef.nativeElement;
    const activeStep = this.wizardStepRefs
      .map(ref => ref.nativeElement)
      .find(el => el.dataset['section'] === this.activeSection);

    if (!activeStep) return;

    const targetLeft = Math.max(0, activeStep.offsetLeft - 12);
    container.scrollTo({ left: targetLeft, behavior: 'smooth' });
  }

  private initChoicesFromDom(
    elementRef: ElementRef<HTMLSelectElement> | undefined,
    currentValue: string | null | undefined,
    assignInstance: (instance: any) => void,
    previousInstance?: any,
    searchResultLimit?: number
  ): void {
    const element = elementRef?.nativeElement;
    if (!element) return;

    try {
      previousInstance?.destroy();
    } catch { }

    this.removeOrphanChoicesWrapper(element);

    const instance = new Choices(element, {
      searchEnabled: true,
      searchChoices: true,
      searchFloor: 0,
      searchResultLimit: searchResultLimit ?? 9999,
      shouldSort: false,
      allowHTML: false,
      itemSelectText: '',
      placeholder: true,
      placeholderValue: this.translate.instant('socios.common.selectOption'),
      searchPlaceholderValue: this.translate.instant('socios.choices.searchPlaceholder') || 'Buscar...',
      noResultsText: this.translate.instant('socios.choices.noResults') || 'No se encontraron resultados',
      noChoicesText: this.translate.instant('socios.choices.noChoices') || 'No hay opciones disponibles',
      searchFields: ['label', 'value'],
      position: 'bottom',
      renderChoiceLimit: -1
    });

    assignInstance(instance);

    if (currentValue != null && currentValue !== '') {
      requestAnimationFrame(() => {
        this.setChoicesValue(instance, currentValue);
      });
    }
  }

  private initTipoIdentificacionChoices(): void {
    this.initChoicesFromDom(
      this.tipoIdentificacionSelectRef,
      this.socio.tipoIdentificacion,
      (instance) => (this.tipoIdentificacionChoices = instance),
      this.tipoIdentificacionChoices,
      10
    );
  }

  private initPaisEmisorChoices(): void {
    this.initChoicesFromDom(
      this.paisEmisorSelectRef,
      this.socio.paisEmisor,
      (instance) => (this.paisEmisorChoices = instance),
      this.paisEmisorChoices,
      9999
    );
  }
  private initEstadoCivilChoices(): void {
    this.initChoicesFromDom(
      this.estadoCivilSelectRef,
      this.socio.estadoCivil,
      (instance) => (this.estadoCivilChoices = instance),
      this.estadoCivilChoices,
      10
    );
  }


  private initPaisNacimientoChoices(): void {
    this.initChoicesFromDom(
      this.paisNacimientoSelectRef,
      this.socio.paisNacimiento,
      (instance) => (this.paisNacimientoChoices = instance),
      this.paisNacimientoChoices,
      9999
    );
  }

  private initNacionalidadChoices(): void {
    this.initChoicesFromDom(
      this.nacionalidadSelectRef,
      this.socio.nacionalidadId,
      (instance) => (this.nacionalidadChoices = instance),
      this.nacionalidadChoices,
      9999
    );
  }

  private initDepartamentoChoices(): void {
    const element = this.departamentoSelectRef?.nativeElement;
    if (!element) return;

    try {
      this.departamentoChoices?.destroy();
    } catch { }

    this.removeOrphanChoicesWrapper(element);

    this.departamentoChoices = new Choices(element, {
      searchEnabled: true,
      searchChoices: true,
      searchFloor: 0,
      searchResultLimit: 9999,
      itemSelectText: '',
      shouldSort: false,
      allowHTML: false,
      placeholder: true,
      placeholderValue: this.translate.instant('socios.common.selectOption'),
      searchPlaceholderValue: this.translate.instant('socios.choices.searchPlaceholder') || 'Buscar...',
      noResultsText: this.translate.instant('socios.choices.noResults') || 'No se encontraron resultados',
      noChoicesText: this.translate.instant('socios.choices.noChoices') || 'No hay opciones disponibles',
      position: 'bottom'
    });

    this.setChoicesValue(this.departamentoChoices, this.socio.departamentoId);
  }

  private initMunicipioChoices(): void {
    const element = this.municipioSelectRef?.nativeElement;
    if (!element) return;

    try {
      this.municipioChoices?.destroy();
    } catch { }

    this.removeOrphanChoicesWrapper(element);

    //  element.disabled = !this.socio.departamentoId;

    this.municipioChoices = new Choices(element, {
      searchEnabled: true,
      searchChoices: true,
      searchFloor: 0,
      searchResultLimit: 9999,
      itemSelectText: '',
      shouldSort: false,
      allowHTML: false,
      placeholder: true,
      placeholderValue: this.translate.instant('socios.common.selectOption'),
      searchPlaceholderValue: this.translate.instant('socios.choices.searchPlaceholder') || 'Buscar...',
      noResultsText: this.translate.instant('socios.choices.noResults') || 'No se encontraron resultados',
      noChoicesText: this.translate.instant('socios.choices.noChoices') || 'No hay opciones disponibles',
      position: 'bottom'
    });

    this.setChoicesValue(this.municipioChoices, this.socio.municipioId);

    const wrapper = element.closest('.choices');
    if (!this.socio.departamentoId) {
      //wrapper?.classList.add('is-disabled');
    } else {
      //wrapper?.classList.remove('is-disabled');
    }
  }

  private initSociedadLaboraChoices(): void {
    this.initChoicesFromDom(
      this.sociedadLaboraSelectRef,
      this.socio.sociedadLabora,
      (instance) => (this.sociedadLaboraChoices = instance),
      this.sociedadLaboraChoices,
      10
    );
  }

  private initConyugeTipoIdentificacionChoices(): void {
    this.initChoicesFromDom(
      this.conyugeTipoIdentificacionSelectRef,
      this.socio.conyugeTipoIdentificacion,
      (instance) => (this.conyugeTipoIdentificacionChoices = instance),
      this.conyugeTipoIdentificacionChoices,
      10
    );
  }

  private initConyugePaisNacimientoChoices(): void {
    this.initChoicesFromDom(
      this.conyugePaisNacimientoSelectRef,
      this.socio.conyugePaisNacimiento,
      (instance) => (this.conyugePaisNacimientoChoices = instance),
      this.conyugePaisNacimientoChoices,
      9999
    );
  }

  private initConyugeNacionalidadChoices(): void {
    this.initChoicesFromDom(
      this.conyugeNacionalidadSelectRef,
      this.socio.conyugeNacionalidadId,
      (instance) => (this.conyugeNacionalidadChoices = instance),
      this.conyugeNacionalidadChoices,
      9999
    );
  }

  private setChoicesValue(instance: any, value: string | null | undefined): void {
    if (!instance) return;

    try {
      if (value == null || value === '') {
        instance.removeActiveItems?.();

        const passedElement = instance.passedElement?.element as HTMLSelectElement | undefined;
        if (passedElement) {
          passedElement.value = '';
        }
        return;
      }

      const choices = instance?._store?.choices ?? [];
      const exists = choices.some((c: any) => String(c.value) === String(value));

      if (!exists) {
        instance.removeActiveItems?.();
        return;
      }

      instance.removeActiveItems?.();
      instance.setChoiceByValue(String(value));
    } catch { }
  }



  formatMoneyValue(value: number | null | undefined): string {
    const numericValue = Number(value ?? 0);

    const decimalSeparator =
      this.appConfigService.getCurrentSettings().decimalSeparator || '.';

    const thousandSeparator =
      this.appConfigService.getCurrentSettings().thousandSeparator || ',';

    const fixed = numericValue.toFixed(2);
    const parts = fixed.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1] ?? '00';

    const formattedInteger = integerPart.replace(
      /\B(?=(\d{3})+(?!\d))/g,
      thousandSeparator
    );

    return `${formattedInteger}${decimalSeparator}${decimalPart}`;
  }

  formatIngresosAnuales(): string {
    const value = Number(this.socio.ingresosAnuales ?? 0);

    const decimalSeparator =
      this.appConfigService.getCurrentSettings().decimalSeparator || '.';

    const thousandSeparator =
      this.appConfigService.getCurrentSettings().thousandSeparator || ',';

    const fixed = value.toFixed(2);
    const parts = fixed.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1] ?? '00';

    const formattedInteger = integerPart.replace(
      /\B(?=(\d{3})+(?!\d))/g,
      thousandSeparator
    );

    return `${formattedInteger}${decimalSeparator}${decimalPart}`;
  }

  private toNumber(value: any): number {
    if (value === null || value === undefined || value === '') return 0;

    const decimalSeparator =
      this.appConfigService.getCurrentSettings().decimalSeparator || '.';

    const thousandSeparator =
      this.appConfigService.getCurrentSettings().thousandSeparator || ',';

    let text = String(value).trim();

    if (thousandSeparator) {
      text = text.split(thousandSeparator).join('');
    }

    if (decimalSeparator && decimalSeparator !== '.') {
      text = text.replace(decimalSeparator, '.');
    }

    const result = Number(text);
    return isNaN(result) ? 0 : result;
  }

  calcularIngresosAnuales(): void {
    const mensual = this.toNumber(this.socio.ingresosMensuales);
    const otros = this.totalOtrosIngresos;

    const ambosVacios = !mensual && !otros;

    const nuevoTotal = ambosVacios
      ? null
      : Number(((mensual + otros) * 12).toFixed(2));

    this.socio.otrosIngresos = otros;
    this.socio.ingresosAnuales = nuevoTotal;

    this.engine?.patchValues?.({
      otrosIngresos: otros,
      ingresosAnuales: nuevoTotal
    });
  }


  onIngresosChange(): void {
    this.calcularIngresosAnuales();
  }





  get beneficiariosTotalPorcentaje(): number {
    return this.beneficiarios
      .filter(x => !x.isDeleted)
      .reduce((sum, item) => sum + Number(item.porcentaje ?? 0), 0);
  }

  private mapBeneficiarios(items: any[] | null | undefined): BeneficiarioForm[] {
    return (items ?? []).map((item: any) => ({
      id: item?.id ?? null,
      socioId: item?.socioId ?? this.socio?.id ?? null,
      benefnombre: item?.benefnombre ?? null,
      porcentaje: item?.porcentaje == null ? null : Number(item.porcentaje),
      parentesco: item?.parentesco ?? null,
      cedula: item?.cedula ?? null,
      activo: item?.activo ?? true,
      createdAtUtc: item?.createdAtUtc ?? null,
      updatedAtUtc: item?.updatedAtUtc ?? null,
      isNew: false,
      isDeleted: false,
    }));
  }

  private mapOtrosIngresos(items: any[] | null | undefined): OtroIngresoForm[] {
    return (items ?? []).map((item: any) => ({
      id: item?.id ?? null,
      socioId: item?.socioId ?? this.socio?.id ?? null,
      origen: item?.origen ?? null,
      ingresoMensual: item?.ingresoMensual == null ? null : Number(item.ingresoMensual),
      observaciones: item?.observaciones ?? null,
      activo: item?.activo ?? true,
      createdAtUtc: item?.createdAtUtc ?? null,
      updatedAtUtc: item?.updatedAtUtc ?? null,
      isNew: false,
      isDeleted: false,
    }));
  }






  openBeneficiarioModal(item?: BeneficiarioForm | null): void {
    this.activeSection = 'beneficiarios';
    this.syncWizardHorizontalScroll();
    this.cdr.detectChanges();

    this.notify.close?.();
    this.beneficiarioEditing = item ? { ...item } : null;
    this.beneficiarioModalOpen = true;
  }
  closeBeneficiarioModal(): void {
    this.beneficiarioModalOpen = false;
    this.beneficiarioEditing = null;
    this.beneficiarioDraft = { ...EMPTY_BENEFICIARIO };

    this.updateActiveSectionByScroll();
    this.syncWizardHorizontalScroll();
    this.cdr.detectChanges();
  }




  removeBeneficiario(item: BeneficiarioForm): void {

    this.beneficiarioModalOpen = false;
    this.beneficiarioEditing = null;
    this.beneficiarioDraft = { ...EMPTY_BENEFICIARIO };


    const title = this.translate.instant('socios.beneficiariosTable.deleteTitle');
    const message = this.translate.instant('socios.beneficiariosTable.deleteMessage', { nombre: item.benefnombre || '' });
    const ref = this.notify.confirm?.(message, title, 'warning');

    ref?.subscribe((result: number) => {
      if (result !== 1) return;

      // MODO NUEVO: solo quita de la tabla
      if (this.mode === 'create' || !this.socio.id || !item.id || item.isNew) {
        this.beneficiarios = this.beneficiarios.filter(x => x.id !== item.id);
        this.socio.beneficiarios = [...this.beneficiarios];
        this.formRef?.form.markAsDirty();
        return;
      }

      // MODO EDICIÓN: borra inmediatamente en BD
      this.sociosService.deleteBeneficiario(this.socio.id, item.id).subscribe({
        next: (res: any) => {
          this.beneficiarios = this.beneficiarios.filter(x => x.id !== item.id);
          this.socio.beneficiarios = [...this.beneficiarios];
          this.copy.beneficiarios = [...this.socio.beneficiarios];
          this.formRef?.form.markAsPristine();
          this.notify.showFromApiResponse?.(res, 'success');
        },
        error: (err: any) => {
          this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
        }
      });
    });
  }


  private loadBeneficiarios(socioId: string): void {
    this.sociosService.getBeneficiarios(socioId).subscribe({
      next: (res: any) => {
        const items = res?.data?.beneficiarios ?? [];
        this.beneficiarios = this.mapBeneficiarios(items);
        this.socio.beneficiarios = [...this.beneficiarios];
        this.copy.beneficiarios = [...this.beneficiarios];
        this.cdr.detectChanges();
      },
      error: () => {
        this.beneficiarios = [];
        this.socio.beneficiarios = [];
        this.copy.beneficiarios = [];
        this.cdr.detectChanges();
      }
    });
  }

  private loadOtrosIngresos(socioId: string): void {
    this.sociosService.getOtrosIngresos(socioId).subscribe({
      next: (res: any) => {
        const items = res?.data?.otrosIngresos ?? [];

        this.otrosIngresosDetalle = this.mapOtrosIngresos(items);

        this.socio.otrosIngresosDetalle = [...this.otrosIngresosDetalle];
        this.copy.otrosIngresosDetalle = [...this.otrosIngresosDetalle];

        const totalOtros = this.totalOtrosIngresos;
        const mensual = this.toNumber(this.socio.ingresosMensuales);
        const nuevoAnual = (!mensual && !totalOtros)
          ? null
          : Number(((mensual + totalOtros) * 12).toFixed(2));

        // current
        this.socio.otrosIngresos = totalOtros;
        this.socio.ingresosAnuales = nuevoAnual;

        // saved
        this.copy.otrosIngresos = totalOtros;
        this.copy.ingresosAnuales = nuevoAnual;

        this.engine?.patchValues?.({
          otrosIngresos: totalOtros,
          ingresosAnuales: nuevoAnual
        });

        this.cdr.detectChanges();

        setTimeout(() => {
          this.formRef?.form.markAsPristine();
          this.formRef?.form.markAsUntouched();
        }, 0);
      },
      error: () => {
        this.otrosIngresosDetalle = [];

        this.socio.otrosIngresosDetalle = [];
        this.copy.otrosIngresosDetalle = [];

        const mensual = this.toNumber(this.socio.ingresosMensuales);
        const nuevoAnual = !mensual ? null : Number((mensual * 12).toFixed(2));

        // current
        this.socio.otrosIngresos = 0;
        this.socio.ingresosAnuales = nuevoAnual;

        // saved
        this.copy.otrosIngresos = 0;
        this.copy.ingresosAnuales = nuevoAnual;

        this.engine?.patchValues?.({
          otrosIngresos: 0,
          ingresosAnuales: nuevoAnual
        });

        this.cdr.detectChanges();

        setTimeout(() => {
          this.formRef?.form.markAsPristine();
          this.formRef?.form.markAsUntouched();
        }, 0);
      }
    });
  }


  onBeneficiarioModalSaved(payload: BeneficiarioForm): void {
    if (this.mode === 'create' || !this.socio.id) {
      if (payload.id) {
        this.beneficiarios = this.beneficiarios.map(x =>
          x.id === payload.id ? { ...payload, isNew: true } : x
        );
      } else {
        this.beneficiarios = [
          ...this.beneficiarios,
          { ...payload, id: crypto.randomUUID(), isNew: true, isDeleted: false },
        ];
      }

      this.socio.beneficiarios = [...this.beneficiarios.filter(x => !x.isDeleted)];
      this.formRef?.form.markAsDirty();
      this.closeBeneficiarioModal();
      return;
    }

    this.beneficiarioSaving = true;

    const request$ = payload.id
      ? this.sociosService.updateBeneficiario(this.socio.id, payload.id, payload)
      : this.sociosService.createBeneficiario(this.socio.id, payload);

    request$.subscribe({
      next: (res: any) => {
        const saved = res?.data?.beneficiario ?? payload;

        if (payload.id) {
          this.beneficiarios = this.beneficiarios.map(x =>
            x.id === saved.id ? { ...saved, isNew: false, isDeleted: false } : x
          );
        } else {
          this.beneficiarios = [
            ...this.beneficiarios,
            { ...saved, isNew: false, isDeleted: false }
          ];
        }

        this.socio.beneficiarios = [...this.beneficiarios.filter(x => !x.isDeleted)];
        this.copy.beneficiarios = [...this.socio.beneficiarios];
        this.formRef?.form.markAsPristine();

        this.notify.showFromApiResponse?.(res, 'success');
        this.beneficiarioSaving = false;
        this.closeBeneficiarioModal();
      },
      error: (err: any) => {
        this.beneficiarioSaving = false;
        this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
      }
    });
  }






  private syncAfiliacionConfigValues(): void {
    const settings = this.appConfigService.getCurrentSettings();

    const afiliacionMonto = Number(settings?.afiliacion?.total ?? 0);
    const afiliacionCuentaMax = Number(settings?.afiliacion?.cuotaMax ?? 0);

    const membresiaMonto = Number(settings?.membresia?.total ?? 0);
    const membresiaCuentaMax = Number(settings?.membresia?.cuotaMax ?? 0);

    // Solo usa la configuración actual cuando estás creando
    if (this.mode === 'create') {
      this.socio.afiliacionCostoTotal = afiliacionMonto;
      this.socio.membresiaCostoTotal = membresiaMonto;

      this.copy.afiliacionCostoTotal = afiliacionMonto;
      this.copy.membresiaCostoTotal = membresiaMonto;
    }

    this.afiliacionCuotasOptions = Array.from(
      { length: afiliacionCuentaMax },
      (_, i) => i + 1
    );

    this.membresiaCuotasOptions = Array.from(
      { length: membresiaCuentaMax },
      (_, i) => i + 1
    );

    this.patchEngineFromSocio();
  }


  private normalizeEmpty(value: any): any {
    return value === '' ? null : value;
  }


  private parseLocalDate(value: string): Date | null {
    if (!value) return null;

    const raw = String(value).trim();
    const systemFormat = (this.appConfigService.getCurrentSettings().dateFormat || 'dd/MM/yyyy').trim();

    const isoDateTime = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
    if (isoDateTime) {
      const [, yyyy, MM, dd] = isoDateTime;
      return new Date(Number(yyyy), Number(MM) - 1, Number(dd));
    }

    if (systemFormat === 'dd/MM/yyyy') {
      const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (match) {
        const [, dd, MM, yyyy] = match;
        return new Date(Number(yyyy), Number(MM) - 1, Number(dd));
      }
    }

    if (systemFormat === 'MM/dd/yyyy') {
      const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (match) {
        const [, MM, dd, yyyy] = match;
        return new Date(Number(yyyy), Number(MM) - 1, Number(dd));
      }
    }

    if (systemFormat === 'yyyy-MM-dd') {
      const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (match) {
        const [, yyyy, MM, dd] = match;
        return new Date(Number(yyyy), Number(MM) - 1, Number(dd));
      }
    }

    const es = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (es) {
      const [, dd, MM, yyyy] = es;
      return new Date(Number(yyyy), Number(MM) - 1, Number(dd));
    }

    const us = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (us) {
      const [, MM, dd, yyyy] = us;
      return new Date(Number(yyyy), Number(MM) - 1, Number(dd));
    }

    return null;
  }

  esFechaVencida(value: any): boolean {
    const fecha = this.parseLocalDate(value);
    const hoy = this.parseLocalDate(this.appConfigService.getCurrentSettings().fechaServidor);

    if (!fecha || !hoy) return false;

    fecha.setHours(0, 0, 0, 0);
    hoy.setHours(0, 0, 0, 0);

    return fecha < hoy;
  }

  esFechaPorVencer(value: any): boolean {
    const fecha = this.parseLocalDate(value);
    const hoy = this.parseLocalDate(this.appConfigService.getCurrentSettings().fechaServidor);

    if (!fecha || !hoy) return false;

    const limite = new Date(hoy);
    limite.setDate(limite.getDate() + 30);

    return fecha >= hoy && fecha <= limite;
  }




  get totalOtrosIngresos(): number {
    return this.otrosIngresosDetalle
      .filter(x => !x.isDeleted)
      .reduce((sum, item) => sum + Number(item.ingresoMensual ?? 0), 0);
  }








  openOtroIngresoModal(item?: OtroIngresoForm | null): void {
    this.activeSection = 'actividad-economica';
    this.syncWizardHorizontalScroll();
    this.cdr.detectChanges();

    this.notify.close?.();
    this.otroIngresoEditing = item ? { ...item } : null;
    this.otroIngresoDraft = item ? { ...item } : { ...EMPTY_OTRO_INGRESO };
    this.otroIngresoModalOpen = true;
  }

  closeOtroIngresoModal(): void {
    this.otroIngresoModalOpen = false;
    this.otroIngresoEditing = null;
    this.otroIngresoDraft = { ...EMPTY_OTRO_INGRESO };
    this.cdr.detectChanges();
  }

  onOtroIngresoModalSaved(payload: OtroIngresoForm): void {
    if (this.mode === 'create' || !this.socio.id) {
      if (payload.id) {
        this.otrosIngresosDetalle = this.otrosIngresosDetalle.map(x =>
          x.id === payload.id ? { ...payload, isNew: true, isDeleted: false } : x
        );
      } else {
        this.otrosIngresosDetalle = [
          ...this.otrosIngresosDetalle,
          {
            ...payload,
            id: crypto.randomUUID(),
            socioId: null,
            activo: true,
            isNew: true,
            isDeleted: false
          }
        ];
      }

      this.socio.otrosIngresosDetalle = [...this.otrosIngresosDetalle.filter(x => !x.isDeleted)];
      this.socio.otrosIngresos = this.totalOtrosIngresos;
      this.calcularIngresosAnuales();
      this.formRef?.form.markAsDirty();
      this.closeOtroIngresoModal();
      return;
    }

    this.otroIngresoSaving = true;

    const request$ = payload.id
      ? this.sociosService.updateOtroIngreso(this.socio.id, payload.id, payload)
      : this.sociosService.createOtroIngreso(this.socio.id, payload);

    request$.subscribe({
      next: (res: any) => {
        const saved = res?.data?.otroIngreso ?? payload;

        if (payload.id) {
          this.otrosIngresosDetalle = this.otrosIngresosDetalle.map(x =>
            x.id === saved.id ? { ...saved, isNew: false, isDeleted: false } : x
          );
        } else {
          this.otrosIngresosDetalle = [
            ...this.otrosIngresosDetalle,
            { ...saved, isNew: false, isDeleted: false }
          ];
        }

        this.socio.otrosIngresosDetalle = [...this.otrosIngresosDetalle.filter(x => !x.isDeleted)];
        this.copy.otrosIngresosDetalle = [...this.socio.otrosIngresosDetalle];
        this.socio.otrosIngresos = this.totalOtrosIngresos;
        this.calcularIngresosAnuales();

        this.formRef?.form.markAsPristine();
        this.notify.showFromApiResponse?.(res, 'success');

        this.otroIngresoSaving = false;
        this.closeOtroIngresoModal();
      },
      error: (err: any) => {
        this.otroIngresoSaving = false;
        this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
      }
    });
  }


  removeOtroIngreso(item: OtroIngresoForm): void {
    this.otroIngresoModalOpen = false;
    this.otroIngresoEditing = null;
    this.otroIngresoDraft = { ...EMPTY_OTRO_INGRESO };

    const title = this.translate.instant('socios.otrosIngresosTable.deleteTitle');
    const message = this.translate.instant(
      'socios.otrosIngresosTable.deleteMessage',
      { origen: item.origen || '' }
    );

    const ref = this.notify.confirm?.(message, title, 'warning');

    ref?.subscribe((result: number) => {
      if (result !== 1) return;

      if (this.mode === 'create' || !this.socio.id || !item.id || item.isNew) {
        this.otrosIngresosDetalle = this.otrosIngresosDetalle.filter(x => x.id !== item.id);
        this.socio.otrosIngresosDetalle = [...this.otrosIngresosDetalle];
        this.socio.otrosIngresos = this.totalOtrosIngresos;
        this.calcularIngresosAnuales();
        this.formRef?.form.markAsDirty();
        return;
      }

      this.sociosService.deleteOtroIngreso(this.socio.id, item.id).subscribe({
        next: (res: any) => {
          this.otrosIngresosDetalle = this.otrosIngresosDetalle.filter(x => x.id !== item.id);
          this.socio.otrosIngresosDetalle = [...this.otrosIngresosDetalle];
          this.copy.otrosIngresosDetalle = [...this.socio.otrosIngresosDetalle];
          this.socio.otrosIngresos = this.totalOtrosIngresos;
          this.calcularIngresosAnuales();
          this.formRef?.form.markAsPristine();
          this.notify.showFromApiResponse?.(res, 'success');
        },
        error: (err: any) => {
          this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
        }
      });
    });
  }


  private initUbicacionLaboralChoices(): void {
    if (!this.isBrowser || !this.ubicacionLaboralSelectRef?.nativeElement) return;

    try { this.ubicacionLaboralChoices?.destroy(); } catch { }

    const element = this.ubicacionLaboralSelectRef.nativeElement;
    this.removeOrphanChoicesWrapper(element);

    this.ubicacionLaboralChoices = new Choices(element, {
      searchEnabled: true,
      shouldSort: false,
      itemSelectText: '',
      placeholder: true,
      searchPlaceholderValue: this.translate.instant('socios.common.searchOption')
    });
  }

  private initAreaChoices(): void {
    if (!this.isBrowser || !this.areaSelectRef?.nativeElement) return;

    try { this.areaChoices?.destroy(); } catch { }

    const element = this.areaSelectRef.nativeElement;
    this.removeOrphanChoicesWrapper(element);

    this.areaChoices = new Choices(element, {
      searchEnabled: true,
      shouldSort: false,
      itemSelectText: '',
      placeholder: true,
      searchPlaceholderValue: this.translate.instant('socios.common.searchOption')
    });
  }

  private initCargoChoices(): void {
    if (!this.isBrowser || !this.cargoSelectRef?.nativeElement) return;

    try { this.cargoChoices?.destroy(); } catch { }

    const element = this.cargoSelectRef.nativeElement;
    this.removeOrphanChoicesWrapper(element);

    this.cargoChoices = new Choices(element, {
      searchEnabled: true,
      shouldSort: false,
      itemSelectText: '',
      placeholder: true,
      searchPlaceholderValue: this.translate.instant('socios.common.searchOption')
    });
  }

}