import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  EventEmitter,
  Injectable,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  PLATFORM_ID,
  SimpleChanges,
  inject
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  JMartAutoFocusDirective,
  JMartAutoFocusNextDirective,
  JMartEngineSyncDirective,
  JMartErrorNotifyDirective,
  JMartMassiveValidationService,
  JMartNumberFormatDirective
} from '@JairMartinez86/jmartinez-validator';
import { AppPermissionDirective } from '../../../../../core/services/app-permission.directive';
import { NotificationService } from '../../../../../core/services/notification.service';
import { OtroIngresoForm, EMPTY_OTRO_INGRESO } from '../../../interface/otro-ingreso.model';
import { AppConfigService } from '../../../../../core/services/app-config.service';

@Injectable()
export class OtroIngresoValidationEngine extends JMartMassiveValidationService {}

@Component({
  selector: 'app-otro-ingreso-modal',
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
    JMartNumberFormatDirective
  ],
  providers: [
    OtroIngresoValidationEngine,
    {
      provide: JMartMassiveValidationService,
      useExisting: OtroIngresoValidationEngine
    }
  ],
  templateUrl: './otro-ingreso-modal.component.html'
})
export class OtroIngresoModalComponent implements OnChanges, OnDestroy {
  public appConfigService = inject(AppConfigService);
  private platformId = inject(PLATFORM_ID);
  private translate = inject(TranslateService);
  private engine = inject(OtroIngresoValidationEngine);
  public notify = inject(NotificationService);

  @Input() open = false;
  @Input() saving = false;
  @Input() model: OtroIngresoForm | null = null;
  @Input() socioId: string | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<OtroIngresoForm>();

  draft: OtroIngresoForm = { ...EMPTY_OTRO_INGRESO };

  private scrollY = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] || changes['model'] || changes['socioId']) {
      if (this.open) {
        this.initModalState();
        if (isPlatformBrowser(this.platformId)) {
          this.lockScroll();
        }
      } else {
        if (isPlatformBrowser(this.platformId)) {
          this.unlockScroll();
        }
      }
    }
  }

  ngOnDestroy(): void {
    this.notify.close?.();
    this.engine.clearErrors?.();

    if (isPlatformBrowser(this.platformId)) {
      this.unlockScroll();
    }
  }

  private initModalState(): void {
    this.notify.close?.();

    this.draft = this.model
      ? { ...this.model }
      : { ...EMPTY_OTRO_INGRESO, socioId: this.socioId };

    this.engine.resetRules?.();
    this.engine.clearFieldsMeta?.();
    this.engine.clearErrors?.();

    const fieldMeta = this.translate.instant('socios.tableOtrosIngresos.fieldMeta') || {};
    const validations = this.translate.instant('socios.tableOtrosIngresos.validations') || {};

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
        this.engine.addRule?.({
          id: fieldId,
          condition: String(rule?.rule ?? '').trim(),
          when: String(rule?.when ?? '').trim(),
          value: String(rule?.value ?? ''),
          message: String(rule?.msj ?? ''),
          classIconSuccess: rule?.classIconSuccess ?? '',
          classIconError: rule?.classIconError ?? ''
        });
      }
    }

    this.engine.patchValues?.(this.draft);
  }

  close(): void {
    if (this.saving) return;

    this.notify.close?.();
    this.engine.clearErrors?.();

    if (isPlatformBrowser(this.platformId)) {
      this.unlockScroll();
    }

    this.closed.emit();
  }

  submit(): void {
    this.engine.patchValues?.(this.draft);

    const ok = this.engine.validateAll?.();

    if (!ok) {
      this.notify.show?.(
        this.engine.getGroupedErrorsHtmlSnapshot?.(),
        '',
        'warning'
      );
      return;
    }

    this.engine.clearErrors?.();
    this.notify.close?.();

    const payload: OtroIngresoForm = {
      ...this.draft,
      socioId: this.draft.socioId ?? this.socioId,
      origen: this.draft.origen?.trim() ?? null,
      observaciones: this.draft.observaciones?.trim() ?? null,
      ingresoMensual: this.draft.ingresoMensual == null
        ? null
        : Number(this.draft.ingresoMensual),
      activo: this.draft.activo ?? true
    };

    if (isPlatformBrowser(this.platformId)) {
      this.unlockScroll();
    }

    this.saved.emit(payload);
  }

  private lockScroll(): void {
    this.scrollY = window.scrollY || window.pageYOffset || 0;

    document.documentElement.classList.add('modal-open');
    document.body.classList.add('modal-open');

    document.body.style.position = 'fixed';
    document.body.style.top = `-${this.scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';

    const main = document.querySelector('.main') as HTMLElement | null;
    if (main) {
      main.classList.add('modal-open');
    }
  }

  private unlockScroll(): void {
    document.documentElement.classList.remove('modal-open');
    document.body.classList.remove('modal-open');

    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';

    const main = document.querySelector('.main') as HTMLElement | null;
    if (main) {
      main.classList.remove('modal-open');
    }

    window.scrollTo(0, this.scrollY || 0);
  }
}