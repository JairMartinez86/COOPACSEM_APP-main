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
  PLATFORM_ID,
  QueryList,
  ViewChild,
  ViewChildren,
  inject,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Observable, of, Subscription } from 'rxjs';
import { finalize, map } from 'rxjs/operators';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SociosService } from '../../services/socios.service';
import { JMartAutoFocusDirective, JMartAutoFocusNextDirective, JMartEngineSyncDirective, JMartErrorNotifyDirective, JMartMassiveValidationService } from '@JairMartinez86/jmartinez-validator';
import { DraftFormService } from '../../../../core/services/draft-manager-options.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { EMPTY_SOCIO, SocioForm } from '../../interface/socio.model';
import { Breadcrumb } from '../../../../shared/components/breadcrumb/breadcrumb';
import { AppPermissionDirective } from '../../../../core/services/app-permission.directive';
import { LanguageService } from '../../../../core/services/languageService';


type DraftRef<T> = {
  saveNow(): void;
  clear(): void;
  cancel(): void;
};

@Component({
  selector: 'app-socios',
  standalone: true,
  imports: [CommonModule,
    FormsModule,
    TranslateModule,
    JMartAutoFocusNextDirective,
    JMartErrorNotifyDirective,
    JMartEngineSyncDirective,
    JMartAutoFocusDirective,
    AppPermissionDirective],
  templateUrl: './socios.html',
  styleUrl: './socios.scss',
})
export class SociosComponent  implements AfterViewInit, OnDestroy {
  @ViewChild('socioFormRef') formRef?: NgForm;
  @ViewChild('wizardSlot') wizardSlotRef?: ElementRef<HTMLElement>;
  @ViewChild('wizardCard') wizardCardRef?: ElementRef<HTMLElement>;
  @ViewChild('wizardSteps') wizardStepsRef?: ElementRef<HTMLElement>;
  @ViewChildren('wizardStep') wizardStepRefs?: QueryList<ElementRef<HTMLElement>>;

  private sociosService = inject(SociosService);
  private translate = inject(TranslateService);
  private draftService = inject(DraftFormService);
  private engine = inject(JMartMassiveValidationService);
  public notify = inject(NotificationService);
  private langService = inject(LanguageService);

  activeSection = 'datos-personales';

  readonly sections = [
    'datos-personales',
    'actividad-economica',
    'datos-conyuge',
    'beneficiarios',
  ];

  socio: SocioForm = { ...EMPTY_SOCIO };
  copy: SocioForm = { ...EMPTY_SOCIO };

  breadcrumbs: any[] = [];
  formReady = false;
  dataReady = false;
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


  private readonly isBrowser: boolean;
  private readonly desktopBreakpoint = 1200;
  private readonly affixTopDesktop = 96;
  private readonly affixTopMobile = 8;
  private readonly scrollOffsetDesktop = 112;
  private readonly scrollOffsetMobile = 120;

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




  ngAfterViewInit(): void {
    if (!this.isBrowser) return;

    this.formReady = true;

    window.addEventListener('scroll', this.onScrollBound, { passive: true });
    window.addEventListener('resize', this.onResizeBound, { passive: true });
    window.document.addEventListener('focusin', this.onFocusInBound);
    window.document.addEventListener('click', this.onClickBound);

    this.loadSocioConfig();
    this.patchEngineFromSocio();

    this.dataReady = true;
    this.tryInitDraftManager();

     this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.languages = this.langService.getAvailableLanguages();
      this.loadSocioConfig();
    });


    setTimeout(() => {
      this.updateActiveSectionByScroll();
      this.updateWizardAffix();
      this.syncWizardHorizontalScroll();
      this.cdr.detectChanges();
    }, 0);
  }

  ngOnDestroy(): void {
    if (!this.isBrowser) return;

    window.removeEventListener('scroll', this.onScrollBound);
    window.removeEventListener('resize', this.onResizeBound);
    window.document.removeEventListener('focusin', this.onFocusInBound);
    window.document.removeEventListener('click', this.onClickBound);

    this.draftRef?.cancel();
  }
  loadSocioConfig(): void {
    this.engine.resetRules?.();
    this.engine.clearFieldsMeta?.();

    const fieldMeta = this.translate.instant('socios.form.fieldMeta') || {};
    const validations = this.translate.instant('socios.form.validations') || {};
    this.breadcrumbs = this.translate.instant('socios.breadcrumbs') || [];



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
  }


  private tryInitDraftManager(): void {

    if (!this.formReady || !this.dataReady || !this.formRef || this.draftRef) {
      return;
    }

    queueMicrotask(() => {
      this.draftRef = this.draftService.connect<SocioForm>({
        form: this.formRef!,
        routeKey: `socios-edit-${this.socio.id ?? 'new'}`,

        currentData: () => ({ ...this.socio }),
        savedData: () => ({ ...this.copy }),

        restoreData: (data: Partial<SocioForm> | null | undefined) => {
          this.socio = this.toSocioForm({
            ...this.copy,
            ...(data ?? {}),
          });
        },

        restoreSavedData: (data: Partial<SocioForm> | null | undefined) => {
          this.copy = this.toSocioForm(data);
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
      ingresosMensuales:
        data?.ingresosMensuales == null ? null : Number(data.ingresosMensuales),
      otrosIngresos:
        data?.otrosIngresos == null ? null : Number(data.otrosIngresos),
      ingresosAnuales:
        data?.ingresosAnuales == null ? null : Number(data.ingresosAnuales),
      beneficiario1Porcentaje:
        data?.beneficiario1Porcentaje == null ? null : Number(data.beneficiario1Porcentaje),
      beneficiario2Porcentaje:
        data?.beneficiario2Porcentaje == null ? null : Number(data.beneficiario2Porcentaje),
      beneficiario3Porcentaje:
        data?.beneficiario3Porcentaje == null ? null : Number(data.beneficiario3Porcentaje),
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
    return JSON.stringify(this.toSocioForm(this.socio)) !== JSON.stringify(this.toSocioForm(this.copy));
  }

  onSave(): void {
    const ok = this.engine.validateAll?.();

    if (!ok) {
      this.notify.show?.(this.engine.getGroupedErrorsHtmlSnapshot?.(), '', 'warning');
      return;
    }

    this.engine.clearErrors?.();
    this.notify.close?.();

    const payload = this.toSocioForm(this.socio);

    this.sociosService
      .save(payload)
      .pipe(finalize(() => { }))
      .subscribe({
        next: (res: any) => {
          const savedSocio = this.toSocioForm(res?.data?.socio ?? payload);

          this.socio = { ...savedSocio };
          this.copy = { ...savedSocio };

          this.patchEngineFromSocio();
          this.engine.clearErrors?.();
          this.draftRef?.clear();

          this.notify.showFromApiResponse?.(res, 'success');
        },
        error: (err: any) => {
          this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
        },
      });
  }

  onCancel(): void {
    this.notify.close?.();
    this.draftRef?.cancel();

    this.socio = { ...this.copy };
    this.patchEngineFromSocio();
    this.engine.clearErrors?.();
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
    if (forceLogout) {
      return true;
    }

    if (!this.hasUnsavedChanges()) {
      return true;
    }

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
    const offset = isDesktop ? this.scrollOffsetDesktop : this.scrollOffsetMobile;
    const top = section.getBoundingClientRect().top + window.scrollY - offset;

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

    const field = target.closest('input, select, textarea');
    if (!field) return;

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
}