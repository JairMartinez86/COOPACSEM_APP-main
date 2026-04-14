import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Injectable, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  JMartAutoFocusNextDirective,
  JMartEngineSyncDirective,
  JMartErrorNotifyDirective,
  JMartMassiveValidationService,
  JMartNumberFormatDirective,
} from '@JairMartinez86/jmartinez-validator';
import { NotificationService } from '../../../../../core/services/notification.service';
import { BeneficiarioForm, EMPTY_BENEFICIARIO } from '../../../interface/beneficiario.model';
import { AppPermissionDirective } from '../../../../../core/services/app-permission.directive';


@Injectable()
export class BeneficiarioValidationEngine extends JMartMassiveValidationService { }

@Component({
  selector: 'app-beneficiario-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    JMartEngineSyncDirective,
    JMartErrorNotifyDirective,
    JMartAutoFocusNextDirective,
    JMartNumberFormatDirective,
    AppPermissionDirective
  ],
  providers: [
    BeneficiarioValidationEngine,
    {
      provide: JMartMassiveValidationService,
      useExisting: BeneficiarioValidationEngine
    }
  ],
  templateUrl: './beneficiario-modal.component.html'
})
export class BeneficiarioModalComponent implements OnChanges {
  private translate = inject(TranslateService);
  private engine = inject(BeneficiarioValidationEngine);
  public notify = inject(NotificationService);

  @Input() open = false;
  @Input() item: BeneficiarioForm | null = null;
  @Input() socioId: string | null = null;
  @Input() saving = false;
  @Input() PorcMax: number = 100;
  @Input() Porc: number = 0;


  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<BeneficiarioForm>();

  draft: BeneficiarioForm = { ...EMPTY_BENEFICIARIO };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] || changes['item'] || changes['socioId'] || changes['Porc']) {
      if (this.open) {
        this.initModalState();
      }
    }
  }

  private initModalState(): void {
    this.notify.close?.();

   

    if(this.item != null){
      this.Porc -= this.item.porcentaje || 0;
      console.log(this.Porc);
    }
    
 
    this.draft = this.item
      ? { ...this.item }
      : { ...EMPTY_BENEFICIARIO, socioId: this.socioId };

    this.engine.resetRules?.();
    this.engine.clearFieldsMeta?.();
    this.engine.clearErrors?.();

    const fieldMeta = this.translate.instant('socios.table.fieldMeta') || {};
    const validations = this.translate.instant('socios.table.validations') || {};

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
          value : String(rule?.value ?? '').replace('{value}', Math.round(this.PorcMax - this.Porc).toString()),
          message: String(rule?.msj ?? '').replace('{value}', Math.round(this.PorcMax - this.Porc).toString()),
          classIconSuccess: rule?.classIconSuccess ?? '',
          classIconError: rule?.classIconError ?? '',
        });
      }
    }

    this.engine.patchValues?.(this.draft);
  }

  onClose(): void {
    this.notify.close?.();
    this.engine.clearErrors?.();
    this.closed.emit();
  }

  onSave(): void {
    this.engine.patchValues?.(this.draft);



    const ok = this.engine.validateAll?.();

    if (!ok) {
      this.notify.show?.(this.engine.getGroupedErrorsHtmlSnapshot?.(), '', 'warning');
      return;
    }

    this.engine.clearErrors?.();
    this.notify.close?.();

    const payload: BeneficiarioForm = {
      ...this.draft,
      socioId: this.draft.socioId ?? this.socioId,
      benefnombre: this.draft.benefnombre?.trim() ?? null,
      parentesco: this.draft.parentesco?.trim() ?? null,
      cedula: this.draft.cedula?.trim() ?? null,
      porcentaje: this.draft.porcentaje == null ? null : Number(this.draft.porcentaje),
      activo: this.draft.activo ?? true,
    };










    this.saved.emit(payload);
  }
}