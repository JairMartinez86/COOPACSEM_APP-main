import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize, Subscription } from 'rxjs';

import { Breadcrumb } from '../../../../shared/components/breadcrumb/breadcrumb';
import { AppConfigService } from '../../../../core/services/app-config.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AppPermissionDirective } from '../../../../core/services/app-permission.directive';


import { SocioRetiroService } from '../../services/socio-retiro.service';

import {
  JMartAutoFocusDirective,
  JMartAutoFocusNextDirective,
  JMartEngineSyncDirective,
  JMartErrorNotifyDirective,
  JMartMassiveValidationService,
  JMartNumberFormatDirective
} from '@JairMartinez86/jmartinez-validator';

interface SocioResumen {
  id: string;
  codigoSocio: string;
  nombreCompleto: string;
  numeroIdentificacion?: string;
  salarioMensual?: number;
  porcentajeAhorro?: number;
  cuotaActual?: number;
  totalAhorrado?: number;
  totalRetirado?: number;
  saldoActual?: number;
  indemnizacionEstimada?: number;
  totalNumAhorro?: number;
  totalNumRetiros?: number;
  activo?: boolean;
}

interface DisponibleRetiro {
  ahorro: number;
  dividendos: number;
  obligacionesPendientes: number;
}

interface SocioRetiroForm {
  socioId: string;
  serie: string;
  noSolicitud: string;
  fechaSolicitud: string;
  tipoSolicitud: string;
  tipoCuenta: string;
  monto: number | null;
  concepto: string;
  comentario: string;
  estado : string;
}

interface AutorizacionRetiro {
  codigo: string;
  titulo: string;
  nombreUsuario: string;
  estadoKey: string;
  fecha: string;
  orden?: number;
}

@Component({
  selector: 'app-socio-retiro',
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
    JMartNumberFormatDirective,
    AppPermissionDirective
  ],
  templateUrl: './socio-retiro.component.html',
  styleUrl: './socio-retiro.component.scss'
})
export class SocioRetiroComponent implements OnInit, OnDestroy {

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly socioRetiroService = inject(SocioRetiroService);
  private readonly engine = inject(JMartMassiveValidationService);

  public readonly notify = inject(NotificationService);
  public readonly appConfigService = inject(AppConfigService);

  private readonly subs = new Subscription();
  private readonly isBrowser: boolean;

  breadcrumbs: any[] = [];
  socioId = '';

  loading = false;
  saving = false;

  socio: SocioResumen | null = null;

  disponible: DisponibleRetiro = {
    ahorro: 0,
    dividendos: 0,
    obligacionesPendientes: 0
  };

  retiro: SocioRetiroForm = this.createEmptyForm();

  tiposSolicitud = [
    {
      value: 'RETIRO_AHORRO',
      labelKey: 'socioRetiro.tiposSolicitud.retiroAhorro'
    },
    {
      value: 'RETIRO_ABONO_CREDITO',
      labelKey: 'socioRetiro.tiposSolicitud.retiroAbonoCredito'
    },
    {
      value: 'TRASLADO_NAVIDENA',
      labelKey: 'socioRetiro.tiposSolicitud.trasladoNavidena'
    },
    {
      value: 'RETIRO_PARCIAL',
      labelKey: 'socioRetiro.tiposSolicitud.retiroParcial'
    },
    {
      value: 'REEMBOLSO_DEDUCCION',
      labelKey: 'socioRetiro.tiposSolicitud.reembolsoDeduccion'
    },
    {
      value: 'TRASLADO_CORRIENTE',
      labelKey: 'socioRetiro.tiposSolicitud.trasladoCorriente'
    },
    {
      value: 'TRASLADO_APORTE_SOLIDARIO',
      labelKey: 'socioRetiro.tiposSolicitud.trasladoAporteSolidario'
    }
  ];


  autorizaciones: AutorizacionRetiro[] = [];

  mode: 'create' | 'view' | 'edit' = 'create';
  solicitudId = '';
  soscioId = '';

  get isNew(): boolean {
    return this.mode === 'create';
  }

  get isView(): boolean {
    return this.mode === 'view';
  }

  get isEdit(): boolean {
    return this.mode === 'edit';
  }



  get settings(): any {
    return this.appConfigService.getCurrentSettings();
  }

  get currency(): string {
    return this.settings?.currency || 'C$';
  }

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.breadcrumbs = this.translate.instant('socioRetiro.breadcrumbs') || [];

    this.subs.add(
      this.translate.onLangChange.subscribe(() => {
        this.breadcrumbs = this.translate.instant('socioRetiro.breadcrumbs') || [];
        this.loadEngineConfig();
      })
    );

    const url = this.router.url.toLowerCase();

    this.mode = url.includes('/new')
      ? 'create'
      : url.includes('/edit')
        ? 'edit'
        : 'view';

    this.socioId =
      this.route.snapshot.paramMap.get('socioId') ??
      this.route.snapshot.paramMap.get('id') ??
      '';

    this.solicitudId =
      this.route.snapshot.paramMap.get('solicitudId') ??
      '';

    this.socioId =
      this.route.snapshot.paramMap.get('socioId') ??
      '';

    this.retiro = {
      ...this.createEmptyForm(),
      socioId: this.socioId
    };

    this.loadEngineConfig();

    if (this.isNew && this.socioId) {
      this.loadRetiroNuevo();
      return;
    }

    if ((this.isView || this.isEdit) && this.solicitudId) {
      this.loadSolicitud();
    }
  }



  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private createEmptyForm(): SocioRetiroForm {
    return {
      socioId: '',
      serie: 'RT',
      noSolicitud: '',
      fechaSolicitud: '',
      tipoSolicitud: '',
      tipoCuenta: 'Corriente',
      monto: null,
      concepto: '',
      comentario: '',
      estado : ''
    };
  }

  private loadRetiroNuevo(): void {
    this.loading = true;


    // Registrar fecha servidor
    this.engine.addControl('FechaServidor');

    this.engine.setControlValue(
      'FechaServidor',
      this.appConfigService.getCurrentSettings().fechaServidor
    );


    this.socioRetiroService.getNuevo(this.socioId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res: any) => {
          const data = res?.data ?? res;
          const socio = data?.socio ?? {};

          this.socio = {
            id: String(socio?.id ?? ''),
            codigoSocio: String(socio?.codigoSocio ?? ''),
            nombreCompleto: String(socio?.nombreCompleto ?? ''),
            numeroIdentificacion: String(socio?.numeroIdentificacion ?? ''),
            salarioMensual: Number(socio?.salarioMensual ?? 0),
            porcentajeAhorro: Number(socio?.porcentajeAhorro ?? 0),
            cuotaActual: Number(socio?.cuotaActual ?? 0),
            totalAhorrado: Number(socio?.totalAhorrado ?? 0),
            totalRetirado: Number(socio?.totalRetirado ?? 0),
            saldoActual: Number(socio?.saldoActual ?? 0),
            indemnizacionEstimada: Number(socio?.indemnizacionEstimada ?? 0),
            totalNumAhorro: Number(socio?.totalNumAhorro ?? 0),
            totalNumRetiros: Number(socio?.totalNumRetiros ?? 0),
            activo: Boolean(socio?.activo ?? true)
          };

          this.engine.addControl('Ahorro');



          this.engine.setControlValue(
            'Ahorro',
            this.socio.totalAhorrado
          );



          this.autorizaciones = (data?.autorizaciones ?? []).map((x: any) => ({
            codigo: x?.codigo ?? '',
            titulo: x?.titulo ?? '',
            nombreUsuario: x?.nombreUsuario ?? '',
            estadoKey: x?.fecha
              ? 'socioRetiro.status.approved'
              : 'socioRetiro.status.pending',
            fecha: x?.fecha ? this.formatDate(x.fecha) : ''
          }));



          this.disponible = {
            ahorro: Number(data?.disponible?.ahorro ?? this.socio.saldoActual ?? 0),
            dividendos: Number(data?.disponible?.dividendos ?? 0),
            obligacionesPendientes: Number(data?.disponible?.obligacionesPendientes ?? 0)
          };

          this.retiro.serie = data?.consecutivo?.serie ?? 'RT';
          this.retiro.noSolicitud = data?.consecutivo?.noSolicitud ?? '';


          this.retiro.fechaSolicitud = this.formatDate(
            data?.fechaServidor ?? this.appConfigService.getCurrentSettings().fechaServidor
          );

          this.engine.addControl("FechaSolicitud");
          this.engine.addControl("noSolicitud");

          this.engine.setControlValue('FechaSolicitud', this.retiro.fechaSolicitud);
          this.engine.setControlValue('noSolicitud', this.retiro.noSolicitud);

          this.patchEngine();
        },
        error: (err: any) => {
          this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
        }
      });
  }


  private loadSolicitud(): void {
    this.loading = true;

    this.socioRetiroService.getSolicitud(this.socioId, this.solicitudId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res: any) => {
          const root = res?.data ?? res;
          const solicitud = root?.solicitud ?? {};
          const socio = root?.socio ?? {};
          const disponible = root?.disponible ?? {};

          this.socioId = String(solicitud?.socioId ?? this.socioId);

          this.retiro = {
            socioId: this.socioId,
            serie: String(solicitud?.serie ?? ''),
            noSolicitud: String(solicitud?.noSolicitud ?? ''),
            fechaSolicitud: this.formatDate(solicitud?.fechaSolicitud),
            tipoSolicitud: String(solicitud?.tipoSolicitud ?? ''),
            tipoCuenta: String(solicitud?.tipoCuenta ?? 'Corriente'),
            monto: Number(solicitud?.monto ?? 0),
            concepto: String(solicitud?.concepto ?? ''),
            comentario: String(solicitud?.comentario ?? ''),
            estado: String(solicitud?.estado ?? '')
          };

          this.socio = {
            id: String(socio?.id ?? this.socioId),
            codigoSocio: String(socio?.codigoSocio ?? ''),
            nombreCompleto: String(socio?.nombreCompleto ?? ''),
            numeroIdentificacion: String(socio?.numeroIdentificacion ?? ''),
            salarioMensual: Number(socio?.salarioMensual ?? 0),
            porcentajeAhorro: Number(socio?.porcentajeAhorro ?? 0),
            cuotaActual: Number(socio?.cuotaActual ?? 0),
            totalAhorrado: Number(socio?.totalAhorrado ?? 0),
            totalRetirado: Number(socio?.totalRetirado ?? 0),
            saldoActual: Number(socio?.saldoActual ?? 0),
            indemnizacionEstimada: Number(socio?.indemnizacionEstimada ?? 0),
            totalNumAhorro: Number(socio?.totalNumAhorro ?? 0),
            totalNumRetiros: Number(socio?.totalNumRetiros ?? 0),
            activo: Boolean(socio?.activo ?? true)
          };

          this.disponible = {
            ahorro: Number(disponible?.ahorro ?? 0),
            dividendos: Number(disponible?.dividendos ?? 0),
            obligacionesPendientes: Number(disponible?.obligacionesPendientes ?? 0)
          };



          this.autorizaciones = (root?.autorizaciones ?? []).map((x: any) => ({
            codigo: x?.codigo ?? '',
            titulo: x?.titulo ?? '',
            nombreUsuario: x?.nombreUsuario ?? '',
            estadoKey: x?.fecha
              ? 'socioRetiro.status.approved'
              : 'socioRetiro.status.pending',
            fecha: x?.fecha ? this.formatDate(x.fecha) : '',
            orden: Number(x?.orden ?? 0)
          }));

          this.engine.addControl('Ahorro');
          this.engine.addControl('FechaServidor');

          this.engine.setControlValue(
            'FechaServidor',
            this.retiro.fechaSolicitud
          );


          this.engine.setControlValue(
            'Ahorro',
            this.socio.totalAhorrado
          );



          this.patchEngine();
        },
        error: (err: any) => {
          this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
        }
      });
  }

  private loadEngineConfig(): void {
    this.engine.resetRules();
    this.engine.clearFieldsMeta();

    const fieldMeta = this.translate.instant('socioRetiro.form.fieldMeta') || {};
    const validations = this.translate.instant('socioRetiro.form.validations') || {};

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

    this.patchEngine();
  }

  private patchEngine(): void {
    this.engine.patchValues({
      FechaSolicitud: this.retiro.fechaSolicitud,
      NoSolicitud: this.retiro.noSolicitud,
      TipoSolicitud: this.retiro.tipoSolicitud,
      TipoCuenta: this.retiro.tipoCuenta,
      Monto: this.retiro.monto,
      Concepto: this.retiro.concepto,
      Comentario: this.retiro.comentario
    });
  }

  onSave(): void {
    this.patchEngine();

    const ok = this.engine.validateAll();

    if (!ok) {
      this.notify.show(this.engine.getGroupedErrorsHtmlSnapshot(), '', 'warning');
      return;
    }

    this.engine.clearErrors();
    this.notify.close();

    const payload = {
      socioId: this.retiro.socioId,
      noSolicitud: this.retiro.noSolicitud,
      tipoSolicitud: this.retiro.tipoSolicitud,
      tipoCuenta: this.retiro.tipoCuenta,
      destino: this.retiro.tipoSolicitud,
      monto: Number(this.retiro.monto ?? 0),
      fechaRetiro: this.toIsoDateFromFormatted(this.retiro.fechaSolicitud),
      fechaSolicitud: this.toIsoDateFromFormatted(this.retiro.fechaSolicitud),
      concepto: this.retiro.concepto?.trim() ?? '',
      comentario: this.retiro.comentario?.trim() ?? ''
    };

    this.saving = true;

    const request$ = this.isEdit
      ? this.socioRetiroService.updateSolicitud(this.socioId, this.solicitudId, payload)
      : this.socioRetiroService.createSolicitud(payload);

    request$
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (res: any) => {
          this.notify.showFromApiResponse?.(res, 'success');

          if (this.isEdit) {
            this.loadSolicitud();
          } else {
            this.loadRetiroNuevo();
          }
        },
        error: (err: any) => {
          this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
        }
      });
  }

  onCancel(): void {
    this.router.navigate(['/socios']);
  }

  onPrint(): void {
    if (!this.isBrowser) return;
    window.print();
  }

  formatDate(value: any): string {
    if (!value) return '';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat('es-NI', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  formatCurrency(value: number | null | undefined): string {
    const n = Number(value ?? 0);

    return n.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  private toIsoDateFromFormatted(value: string): string {
    if (!value) return '';

    const parts = value.split('/');

    if (parts.length !== 3) {
      return '';
    }

    const day = parts[0]?.padStart(2, '0');
    const month = parts[1]?.padStart(2, '0');
    const year = parts[2];

    return `${year}-${month}-${day}`;
  }





}