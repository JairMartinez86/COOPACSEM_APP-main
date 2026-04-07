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

import {
  JMartAutoFocusDirective,
  JMartAutoFocusNextDirective,
  JMartDateFormatDirective,
  JMartEngineSyncDirective,
  JMartErrorNotifyDirective,
  JMartMassiveValidationService,
  JMartNumberFormatDirective
} from '@JairMartinez86/jmartinez-validator';

import {
  ApexChart,
  ApexDataLabels,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexResponsive,
  ChartComponent
} from 'ng-apexcharts';

import { SocioCambioCuotaService } from '../../services/socio-cambio-cuota.service';
import { SocioCambioCuota } from '../../interface/socio.cambio.cuota';
import { TableFilterService } from '../../../../core/services/table-filter.service';

interface SocioResumen {
  id: string;
  codigoSocio: string;
  nombreCompleto: string;
  numeroIdentificacion: string;
  sociedadLabora?: string;
  fechaIngreso?: string | null;
}

interface AutorizacionItem {
  id: string;
  fecha: string;
  codigoSocio: string;
  tipoCuenta: 'corriente' | 'navideno' | string;
  tipoMovimiento: 'incremento' | 'disminucion' | string;
  cuotaActual: number;
  nuevaCuota: number;
  diferencia: number;
  vigencia: string;
  aplicaDesde: 'inmediato' | 'quincena' | string;
  estado: number;
  estadoDescripcion: string;
  fechaRegistro?: string;
  usuarioRegistra?: string;
  usuarioAprueba?: string | null;
  fechaAprobacion?: string | null;
}

interface HistorialItem {
  id: string;
  fecha: string;
  tipo: string;
  cuotaActual: number;
  nuevaCuota: number;
  diferencia: number;
  estado: string;
  estadoRaw: number;
}

@Component({
  selector: 'app-socio-movimiento-cuota',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    Breadcrumb,
    AppPermissionDirective,
    JMartAutoFocusNextDirective,
    JMartErrorNotifyDirective,
    JMartEngineSyncDirective,
    JMartDateFormatDirective,
    JMartNumberFormatDirective,
    ChartComponent,
    JMartAutoFocusDirective
  ],
  templateUrl: './socio-cambio-cuota.html',
  styleUrl: './socio-cambio-cuota.scss'
})
export class SocioCambioCuotaComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly service = inject(SocioCambioCuotaService);
  private readonly filterSvc = inject(TableFilterService);

  public appConfigService = inject(AppConfigService);
  public notify = inject(NotificationService);
  private engine = inject(JMartMassiveValidationService);

  private readonly isBrowser: boolean;
  private readonly subs = new Subscription();
  private readonly filterKey = 'socio-cambio-cuota';
  mode: 'create' | 'view' | 'edit' = 'create';

  tipoMovimiento: 'incremento' | 'disminucion' = 'incremento';
  socioId = '';
  loading = false;
  saving = false;
  approvingId: string | null = null;

  socio: SocioResumen | null = null;

  cuotas: { corriente: number; navideno: number } = {
    corriente: 0,
    navideno: 0
  };

  chartTotals = {
    ahorro: 0,
    retiro: 0,
    intereses: 0
  };

  dashboard = {
    ahorro: 0,
    deposito: 0,
    intereses: 0
  }

  historialCurrentPage = 1;
  historialPageSize = 5;
  historialCurrentTerm = '';
  historial: HistorialItem[] = [];
  historialAll: HistorialItem[] = [];

  autorizaciones: AutorizacionItem[] = [];

  form: SocioCambioCuota = {
    socioId: '',
    FechaServidor: '',
    tipoCuenta: 'corriente',
    tipoMovimiento: 'incremento',
    cuotaActual: 0,
    nuevaCuota: null,
    vigencia: '',
    aplicaDesde: 'quincena',
    observacion: ''
  };

  breadcrumbs: any[] = [
    { label: '', url: '/' },
    { label: '', url: '' },
    { label: '' }
  ];

  public pieSeries: ApexNonAxisChartSeries = [0, 0, 0];
  public pieChart: ApexChart = {
    type: 'pie',
    height: 300
  };

  public pieOptions = {
    tooltip: {
      y: {
        formatter: (value: number) => {
          const currency = this.appConfigService.getCurrentSettings().currency;
          return `${currency} ${this.formatCurrency(value)}`;
        }
      }
    }
  };

  public pieLabels: string[] = [];
  public pieLegend: ApexLegend = {
    position: 'bottom'
  };

  public pieDataLabels: ApexDataLabels = {
    enabled: true,
    formatter: (_val: number, opts?: any) => {
      const value = opts?.w?.config?.series?.[opts.seriesIndex] ?? 0;
      const currency = this.appConfigService.getCurrentSettings().currency;

      return `${currency} ${this.formatCurrency(value)}`;
    }
  };

  public pieResponsive: ApexResponsive[] = [
    {
      breakpoint: 576,
      options: {
        chart: { height: 250 },
        legend: { position: 'bottom' }
      }
    }
  ];
  constructor(
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }




  ngOnInit(): void {
    this.breadcrumbs = this.translate.instant('socioCambioCuota.breadcrumbs') || this.breadcrumbs;

    this.subs.add(
      this.filterSvc.query$(this.filterKey).subscribe(query => {
        this.historialCurrentTerm = (query || '').trim().toLowerCase();
        this.applyFilter();
      })
    );

    this.subs.add(
      this.translate.onLangChange.subscribe(() => {
        this.breadcrumbs = this.translate.instant('socioCambioCuota.breadcrumbs') || [];
        this.loadConfig();
      })
    );

    this.loadConfig();

    this.engine.addControl('FechaServidor');
    this.engine.setControlValue(
      'FechaServidor',
      this.appConfigService.getCurrentSettings().fechaServidor
    );

    (this.form as any).FechaServidor = this.appConfigService.getCurrentSettings().fechaServidor;
    (this.form as any).tipoMovimiento = this.tipoMovimiento;

    this.subs.add(
      this.route.paramMap.subscribe(params => {
        this.socioId = params.get('socioId') ?? '';

        const routeTipo = params.get('tipoMovimiento');
        this.tipoMovimiento = routeTipo === 'disminucion' ? 'disminucion' : 'incremento';

        this.form.socioId = this.socioId;
        this.form.tipoMovimiento = this.tipoMovimiento;

        if (!this.socioId) {
          this.onCancel();
          return;
        }

        this.loadData();
      })
    );
  }
  ngAfterViewInit(): void {
    if (!this.isBrowser) return;

    this.loadConfig();
    this.initRouteModeAndLoad();

  }


  private initRouteModeAndLoad(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const url = this.router.url.toLowerCase();
    this.mode = 'view';
    if (url.includes('/new')) {
      this.mode = 'create';
    }

  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  loadConfig(): void {
    this.engine.resetRules?.();
    this.engine.clearFieldsMeta?.();

    const fieldMeta = this.translate.instant('socioCambioCuota.form.fieldMeta') || {};
    const validations = this.translate.instant('socioCambioCuota.form.validations') || {};

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

    this.engine.clearErrors?.();
  }

  loadData(): void {
    this.loading = true;

    this.service.getData(this.socioId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res: any) => {
          const data = res?.data ?? {};

          this.socio = data?.socio ?? null;


          this.cuotas = {
            corriente: Number(data?.cuotas?.corriente ?? 0),
            navideno: Number(data?.cuotas?.navideno ?? 0)
          };

          this.autorizaciones = Array.isArray(data?.autorizaciones)
            ? data.autorizaciones
            : [];

          this.historialAll = this.autorizaciones.map((x: any) => ({
            id: String(x?.id ?? ''),
            fecha: String(x?.fecha ?? ''),
            tipo: String(x?.tipoMovimiento ?? ''),
            cuotaActual: Number(x?.cuotaActual ?? 0),
            nuevaCuota: Number(x?.nuevaCuota ?? 0),
            diferencia: Number(x?.diferencia ?? 0),
            estado: String(x?.estadoDescripcion ?? ''),
            estadoRaw: Number(x?.estado ?? 0)
          }));

          this.applyFilter();

          this.pieLabels = Array.isArray(data?.chart?.labels)
            ? data.chart.labels
            : [
              this.translate.instant('socioCambioCuota.chart.ahorro'),
              this.translate.instant('socioCambioCuota.chart.retiro'),
              this.translate.instant('socioCambioCuota.chart.intereses')
            ];


          const seriesObj = data?.chart?.series;

          const s = data?.chart?.series ?? {};

          this.pieSeries = [
            Number(s.ahorro ?? 0),
            Number(s.retiro ?? 0),
            Number(s.intereses ?? 0)
          ];



          this.dashboard = {
            ahorro: Number(s.ahorro ?? 0),
            deposito: Number(s.deposito ?? 0),
            intereses: Number(s.intereses ?? 0)
          };



          this.chartTotals = {
            ahorro: Number(this.pieSeries[0] ?? 0),
            retiro: Number(this.pieSeries[1] ?? 0),
            intereses: Number(this.pieSeries[2] ?? 0)
          };


          if (!this.form.tipoCuenta) {
            this.form.tipoCuenta = 'corriente';
          }

          this.updateCuotaActual();
        },
        error: (err: any) => {
          this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
        }
      });
  }

  updateCuotaActual(): void {
    this.form.cuotaActual = this.form.tipoCuenta === 'corriente'
      ? Number(this.cuotas.corriente ?? 0)
      : Number(this.cuotas.navideno ?? 0);
  }

  getDiferencia(): number {
    const cuotaActual = Number(this.form.cuotaActual ?? 0);
    const nuevaCuota = Number(this.form.nuevaCuota ?? 0);
    return Math.abs(nuevaCuota - cuotaActual);
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
    if (!value) {
      return this.translate.instant('common.noDate');
    }

    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return this.translate.instant('common.noDate');
    }

    return date.toLocaleDateString('es-NI', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    });
  }

  onSave(): void {
    const ok = this.engine.validateAll?.();

    if (!ok) {
      this.notify.show?.(this.engine.getGroupedErrorsHtmlSnapshot?.(), '', 'warning');
      return;
    }

    const payload: SocioCambioCuota = {
      socioId: this.socioId,
      FechaServidor: this.form.FechaServidor,
      tipoCuenta: this.form.tipoCuenta,
      tipoMovimiento: this.form.tipoMovimiento,
      cuotaActual: Number(this.form.cuotaActual ?? 0),
      nuevaCuota: Number(this.form.nuevaCuota ?? 0),
      vigencia: this.normalizeDate(this.form.vigencia) ?? '',
      aplicaDesde: this.form.aplicaDesde,
      observacion: this.form.observacion
    };

    this.saving = true;

    this.service.create(this.socioId, payload)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (res: any) => {
          this.form = {
            socioId: this.socioId,
            FechaServidor: '',
            tipoCuenta: 'corriente',
            tipoMovimiento: this.tipoMovimiento,
            cuotaActual: this.cuotas.corriente ?? 0,
            nuevaCuota: null,
            vigencia: '',
            aplicaDesde: 'quincena',
            observacion: ''
          };

          this.engine.clearErrors?.();
          this.loadData();
          this.notify.showFromApiResponse?.(res, 'success');
        },
        error: (err: any) => {
          this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
        }
      });
  }

  aprobar(id: string): void {
    if (!id) return;

    this.approvingId = id;

    this.service.approve(this.socioId, id)
      .pipe(finalize(() => (this.approvingId = null)))
      .subscribe({
        next: (res: any) => {
          this.loadData();
          this.notify.showFromApiResponse?.(res, 'success');
        },
        error: (err: any) => {
          this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
        }
      });
  }

  onCancel(): void {
    this.router.navigate(['/socios']);
  }

  private normalizeDate(value: string | null): string | null {
    if (!value) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) {
      const [, dd, mm, yyyy] = match;
      return `${yyyy}-${mm}-${dd}`;
    }

    return value;
  }

  public applyFilter(): void {
    const term = this.historialCurrentTerm;

    this.historial = !term
      ? [...this.historialAll]
      : this.historialAll.filter((item) =>
        [
          item.fecha ?? '',
          item.tipo ?? '',
          String(item.cuotaActual ?? ''),
          String(item.nuevaCuota ?? ''),
          String(item.diferencia ?? ''),
          item.estado ?? ''
        ]
          .join(' ')
          .toLowerCase()
          .includes(term)
      );

    this.historialCurrentPage = 1;
  }

  get historialTotalPages(): number {
    return Math.max(1, Math.ceil(this.historial.length / this.historialPageSize));
  }

  get pagedHistorial(): HistorialItem[] {
    const start = (this.historialCurrentPage - 1) * this.historialPageSize;
    return this.historial.slice(start, start + this.historialPageSize);
  }

  get historialVisibleStart(): number {
    if (this.historial.length === 0) return 0;
    return (this.historialCurrentPage - 1) * this.historialPageSize + 1;
  }

  get historialVisibleEnd(): number {
    return Math.min(this.historialCurrentPage * this.historialPageSize, this.historial.length);
  }

  get historialPageNumbers(): (number | string)[] {
    const total = this.historialTotalPages;
    const current = this.historialCurrentPage;

    if (total <= 5) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    if (current <= 3) {
      return [1, 2, 3, '...', total];
    }

    if (current >= total - 2) {
      return [1, '...', total - 2, total - 1, total];
    }

    return [1, '...', current - 1, current, current + 1, '...', total];
  }

  goToHistorialPage(page: number): void {
    if (page < 1 || page > this.historialTotalPages) return;
    this.historialCurrentPage = page;
  }


  getTipoLabel(tipo: string): string {
    const t = (tipo || '').toLowerCase();

    if (t === 'incremento') {
      return this.translate.instant('socioCambioCuota.options.incremento');
    }

    if (t === 'disminucion') {
      return this.translate.instant('socioCambioCuota.options.disminucion');
    }

    if (t === 'afiliacion corriente') {
      return this.translate.instant('socioCambioCuota.options.afiliacionCorriente');
    }

    if (t === 'afiliacion navideña' || t === 'afiliacion navidena') {
      return this.translate.instant('socioCambioCuota.options.afiliacionNavidena');
    }

    return tipo;
  }

  getTipoClass(tipo: string): string {
  const t = (tipo || '').toLowerCase();

  if (t === 'incremento') return 'badge-soft-success';
  if (t === 'disminucion') return 'badge-soft-danger';
  if (t.includes('afiliacion')) return 'badge-soft-primary';

  return 'badge-soft-secondary';
}
}