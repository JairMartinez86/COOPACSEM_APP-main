import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, Inject, NgZone, OnDestroy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize, Subscription } from 'rxjs';

import { Breadcrumb } from '../../../../shared/components/breadcrumb/breadcrumb';
import { AppConfigService } from '../../../../core/services/app-config.service';
import { NotificationService } from '../../../../core/services/notification.service';

import {
  JMartAutoFocusDirective,
  JMartAutoFocusNextDirective,
  JMartDateFormatDirective,
  JMartEngineSyncDirective,
  JMartErrorNotifyDirective,
  JMartMassiveValidationService,
  JMartNumberFormatDirective
} from '@JairMartinez86/jmartinez-validator';

import { AppPermissionDirective } from '../../../../core/services/app-permission.directive';

import { SocioAfiliacioPagoService } from '../../services/socio-afiliacion-pago.service';
import { SocioAhorroService } from '../../services/socio-ahorro.service';

import {
  AfiliacionMembresiaPagoRow,
  SocioAfiliacionPagoResumen
} from '../../interface/socio-afiliacion-pago.model';

import { AfiliacionMembresiaTableComponent } from "./tablas/afiliacion-membresia-table.component";


// =============================
// INTERFACES
// =============================
interface BancoOption {
  codigo: string;
  nombreBanco: string;
  cuentaContable?: string | null;
  activo: boolean;
}

interface SocioAfiliacionPagoForm {
  socioId: string;
  monto: number | null;
  bancoCodigo: string;
  noDeposito: string;
  fechaDeposito: string;
  observacion: string;
}


@Component({
  selector: 'app-socio-afiliacion-pago',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    Breadcrumb,
    JMartAutoFocusNextDirective,
    JMartErrorNotifyDirective,
    JMartEngineSyncDirective,
    JMartAutoFocusDirective,
    AppPermissionDirective,
    JMartDateFormatDirective,
    JMartNumberFormatDirective,
    AfiliacionMembresiaTableComponent
  ],
  templateUrl: './socio-afiliacion.component.html',
  styleUrl: './socio-afiliacion.component.scss',
  providers: [JMartMassiveValidationService] // 🔥 IMPORTANTE
})
export class SocioAfiliacionPagoComponent implements OnInit, OnDestroy {

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly socioAfiliacionService = inject(SocioAfiliacioPagoService);
  private readonly socioAhorroService = inject(SocioAhorroService);
  private readonly engine = inject(JMartMassiveValidationService);
  private readonly cd = inject(ChangeDetectorRef);
private readonly zone = inject(NgZone);

  public notify = inject(NotificationService);
  public appConfigService = inject(AppConfigService);

  private readonly subs = new Subscription();
  private readonly isBrowser: boolean;
  originalAfiliacionRows: AfiliacionMembresiaPagoRow[] = [];
originalMembresiaRows: AfiliacionMembresiaPagoRow[] = [];
excedenteAhorro = 0;

  // =============================
  // VARIABLES
  // =============================
  breadcrumbs: any[] = [];

  socioId = '';
  loading = false;
  loadingBanks = false;

  socio: SocioAfiliacionPagoResumen | null = null;
  afiliacionRows: AfiliacionMembresiaPagoRow[] = [];
  membresiaRows: AfiliacionMembresiaPagoRow[] = [];

  bancos: BancoOption[] = []; // 🔥 FIX PRINCIPAL

  pago: SocioAfiliacionPagoForm = this.createEmptyForm();

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  // =============================
  // INIT
  // =============================
  ngOnInit(): void {

    this.breadcrumbs = this.translate.instant('socioAfiliacionPago.breadcrumbs') || [];

    this.subs.add(
      this.translate.onLangChange.subscribe(() => {
        this.breadcrumbs = this.translate.instant('socioAfiliacionPago.breadcrumbs') || [];
        this.loadConfig();
      })
    );

    this.socioId = this.route.snapshot.paramMap.get('socioId') ?? '';
    this.pago.socioId = this.socioId;

    if (!this.socioId) {
      this.onCancel();
      return;
    }

    this.engine.addControl('FechaServidor');
    this.engine.setControlValue(
      'FechaServidor',
      this.appConfigService.getCurrentSettings().fechaServidor
    );

    this.loadConfig();
    this.loadDetail(this.socioId);
    this.loadBancos(); 
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  // =============================
  // FORM
  // =============================
  private createEmptyForm(): SocioAfiliacionPagoForm {
    return {
      socioId: '',
      monto: null,
      bancoCodigo: '',
      noDeposito: '',
      fechaDeposito: '',
      observacion: ''
    };
  }

  // =============================
  // BANCOS
  // =============================
  loadBancos(): void {
    this.loadingBanks = true;

    this.socioAhorroService.getBancos()
      .pipe(finalize(() => (this.loadingBanks = false)))
      .subscribe({
        next: (res: any) => {

          const items = res?.data?.bancos ?? res?.data ?? res ?? [];

          this.bancos = Array.isArray(items)
            ? items.map((x: any) => ({
                codigo: String(x?.codigo ?? ''),
                nombreBanco: String(x?.nombreBanco ?? x?.nombre ?? ''),
                cuentaContable: x?.cuentaContable ?? null,
                activo: Boolean(x?.activo ?? true)
              }))
            : [];
        },
        error: (err) => {
          this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
          this.bancos = [];
        }
      });
  }

  // =============================
  // CONFIG VALIDACIONES
  // =============================
  loadConfig(): void {
    this.engine.resetRules?.();
    this.engine.clearFieldsMeta?.();

    const fieldMeta = this.translate.instant('socioAfiliacionPago.form.fieldMeta') || {};
    const validations = this.translate.instant('socioAfiliacionPago.form.validations') || {};

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
        this.engine.addRule?.({
          id: fieldId,
          condition: String(rule?.rule ?? '').trim(),
          when: String(rule?.when ?? '').trim(),
          value: rule?.value ?? '',
          message: String(rule?.msj ?? ''),
        });
      }
    }

    this.engine.validateAll?.();
    this.engine.clearErrors?.();
  }

  // =============================
  // DATA
  // =============================
loadDetail(socioId: string): void {
  this.loading = true;

  this.socioAfiliacionService.getDetail(socioId, true)
    .pipe(finalize(() => {
      this.zone.run(() => {
        this.loading = false;
        this.cd.detectChanges();
      });
    }))
    .subscribe({
      next: (res: any) => {
        this.zone.run(() => {
          const data = res?.data ?? {};

          this.socio = data?.socio ?? null;

          this.originalAfiliacionRows = [...(data?.detail?.afiliacion ?? [])]
            .map((x: AfiliacionMembresiaPagoRow) => ({ ...x }));

          this.originalMembresiaRows = [...(data?.detail?.membresia ?? [])]
            .map((x: AfiliacionMembresiaPagoRow) => ({ ...x }));

          this.rebuildPreviewTables();

          this.afiliacionRows = [...this.afiliacionRows];
          this.membresiaRows = [...this.membresiaRows];

          this.cd.detectChanges();
        });
      },
      error: (err) => {
        this.zone.run(() => {
          this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
          this.socio = null;
          this.originalAfiliacionRows = [];
          this.originalMembresiaRows = [];
          this.afiliacionRows = [];
          this.membresiaRows = [];
          this.excedenteAhorro = 0;
          this.cd.detectChanges();
        });
      }
    });
}


private rebuildPreviewTables(): void {
  const montoIngresado = Number(this.pago.monto ?? 0);

  const membresiaBase = this.originalMembresiaRows.map(x => ({ ...x }));
  const afiliacionBase = this.originalAfiliacionRows.map(x => ({ ...x }));

  let restante = montoIngresado > 0 ? montoIngresado : 0;

  // Primero Membresía
  const membresiaPreview = membresiaBase.map(row => {
    const result = this.applyPreviewPaymentToRow(row, restante);
    restante = result.restante;
    return result.row;
  });

  // Luego Afiliación
  const afiliacionPreview = afiliacionBase.map(row => {
    const result = this.applyPreviewPaymentToRow(row, restante);
    restante = result.restante;
    return result.row;
  });

  this.membresiaRows = membresiaPreview;
  this.afiliacionRows = afiliacionPreview;

  // 🔥 sobrante para ahorro corriente
  this.excedenteAhorro = Number(restante.toFixed(2));
}
private applyPreviewPaymentToRow(
  row: AfiliacionMembresiaPagoRow,
  restanteDisponible: number
): { row: AfiliacionMembresiaPagoRow; restante: number } {

  const cuota = Number(row.monto ?? 0);
  const pagadoActual = Number(row.montoPagado ?? 0);
  const saldoActual = Number(row.saldo ?? 0);

  // Si ya está pagada, no tocar
  if (saldoActual <= 0 || pagadoActual >= cuota) {
    return {
      row: {
        ...row,
        montoPagado: cuota,
        saldo: 0,
        estado: 'Pagada',
        estadoKey: 'ahorro.status.paid'
      },
      restante: restanteDisponible
    };
  }

  if (restanteDisponible <= 0) {
    return {
      row: {
        ...row,
        montoPagado: pagadoActual,
        saldo: saldoActual,
        estado: saldoActual <= 0 ? 'Pagada' : 'Pendiente',
        estadoKey: saldoActual <= 0 ? 'ahorro.status.paid' : 'ahorro.status.pending'
      },
      restante: restanteDisponible
    };
  }

  const faltante = saldoActual;
  const abono = Math.min(restanteDisponible, faltante);

  const nuevoMontoPagado = pagadoActual + abono;
  const nuevoSaldo = Math.max(0, cuota - nuevoMontoPagado);

  const nuevoEstado: 'Pagada' | 'Pendiente' =
    nuevoSaldo <= 0 ? 'Pagada' : 'Pendiente';

  const nuevoEstadoKey =
    nuevoSaldo <= 0 ? 'ahorro.status.paid' : 'ahorro.status.pending';

  return {
    row: {
      ...row,
      montoPagado: Number(nuevoMontoPagado.toFixed(2)),
      saldo: Number(nuevoSaldo.toFixed(2)),
      estado: nuevoEstado,
      estadoKey: nuevoEstadoKey
    },
    restante: Number((restanteDisponible - abono).toFixed(2))
  };
}

onMontoChange(): void {
  this.rebuildPreviewTables();
}


  // =============================
  // SAVE
  // =============================
  onSave(): void {

    const ok = this.engine.validateAll?.();

    if (!ok) {
      this.notify.show?.(this.engine.getGroupedErrorsHtmlSnapshot?.(), '', 'warning');
      return;
    }

    const payload = {
      socioId: this.pago.socioId,
      monto: Number(this.pago.monto),
      bancoCodigo: this.pago.bancoCodigo,
      noDeposito: this.pago.noDeposito,
      fechaDeposito: this.normalizeDate(this.pago.fechaDeposito),
      observacion: this.pago.observacion,
      excedenteAhorro : this.excedenteAhorro
    };

    this.socioAfiliacionService.createPago(payload).subscribe({
      next: (res: any) => {
        this.excedenteAhorro = 0;

        this.pago = {
          ...this.createEmptyForm(),
          socioId: this.socioId
        };

        this.loadDetail(this.socioId);

        this.notify.showFromApiResponse?.(res, 'success');
      },
      error: (err) => {
        this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
      }
    });
  }

  // =============================
  // NAV
  // =============================
  onCancel(): void {
    this.router.navigate(['/socios']);
  }

  // =============================
  // UTILS
  // =============================
  private normalizeDate(value: string | null): string | null {
    if (!value) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) {
      const [, dd, mm, yyyy] = match;
      return `${yyyy}-${mm}-${dd}`;
    }

    return value;
  }

  formatCurrency(value?: number | null): string {
    const amount = Number(value ?? 0);
    const settings = this.appConfigService.getCurrentSettings();

    const decimalSeparator = settings.decimalSeparator || '.';
    const thousandSeparator = settings.thousandSeparator || ',';

    const fixed = amount.toFixed(2);
    const parts = fixed.split('.');
    let integerPart = parts[0];
    const decimalPart = parts[1];

    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator);

    return `${integerPart}${decimalSeparator}${decimalPart}`;
  }

  formatDate(value?: string | null): string {
    if (!value) return this.translate.instant('common.noDate');

    const date = new Date(value);
    if (isNaN(date.getTime())) return value;

    return date.toLocaleDateString('es-NI', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    });
  }
}