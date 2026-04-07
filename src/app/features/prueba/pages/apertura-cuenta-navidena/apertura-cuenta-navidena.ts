import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  inject
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize, Subscription } from 'rxjs';

import { Breadcrumb } from '../../../../shared/components/breadcrumb/breadcrumb';
import { AppConfigService } from '../../../../core/services/app-config.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AppPermissionDirective } from '../../../../core/services/app-permission.directive';
import { TableFilterService } from '../../../../core/services/table-filter.service';

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

import { SocioAperturaCuentaNavidenaService } from '../../services/socio-apertura-cuenta-navidena.service';

interface SocioResumen {
  id: string;
  codigoSocio: string;
  nombreCompleto: string;
  numeroIdentificacion: string;
  sociedadLabora?: string | null;
  fechaIngreso?: string | null;
}

interface AperturaResumen {
  id: string;
  fechaApertura: string;
  montoCuota: number;
  activa: boolean;
  usuarioCrea?: string | null;
  fechaCreacion?: string | null;
  observacion?: string | null;
}

interface ResumenPlan {
  ahorroActual: number;
  meta: number;
  faltante: number;
  porcentaje: number;
  totalCuotas: number;
  cuotasPagadas: number;
}

interface MovimientoPlanItem {
  id: string;
  fecha: string;
  descripcion: string;
  monto: number;
  estado: string;
  referencia?: string | null;
  fechaPago?: string | null;
  tipoMovimiento?: string | null;
}

interface PlanItem {
  id: string;
  fechaProgramada: string;
  montoCuota: number;
  estado: string;
  pagado: boolean;
  fechaPago?: string | null;
  usuarioPago?: string | null;
}

interface AperturaCuentaNavidenaForm {
  socioId: string;
  tipoCuenta: string;
  fechaApertura: string;
  montoCuota: number | null;
  observacion: string;
}

@Component({
  selector: 'app-apertura-cuenta-navidena',
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
    JMartAutoFocusDirective,
    ChartComponent
  ],
  templateUrl: './apertura-cuenta-navidena.html',
  styleUrl: './apertura-cuenta-navidena.scss'
})
export class AperturaCuentaNavidenaComponent implements OnInit, OnDestroy {
  @ViewChild('formRef') formRef?: NgForm;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly service = inject(SocioAperturaCuentaNavidenaService);
  private readonly filterSvc = inject(TableFilterService);

  public appConfigService = inject(AppConfigService);
  public notify = inject(NotificationService);
  private engine = inject(JMartMassiveValidationService);

  private readonly subs = new Subscription();
  private readonly filterKey = 'apertura-cuenta-navidena';
  private readonly isBrowser: boolean;

  socioId = '';
  loading = false;
  saving = false;

  socio: SocioResumen | null = null;
  apertura: AperturaResumen | null = null;
  resumen: ResumenPlan | null = null;

  previewPlan: PlanItem[] = [];
  yaAperturada = false;

  retiros: any[] = [];

  form: AperturaCuentaNavidenaForm = {
    socioId: '',
    tipoCuenta: 'Cuenta Navidena',
    fechaApertura: '',
    montoCuota: null,
    observacion: ''
  };

  copy: AperturaCuentaNavidenaForm = {
    socioId: '',
    tipoCuenta: 'Cuenta Navidena',
    fechaApertura: '',
    montoCuota: null,
    observacion: ''
  };

  movimientos: MovimientoPlanItem[] = [];
  movimientosAll: MovimientoPlanItem[] = [];
  pagedMovimientos: MovimientoPlanItem[] = [];
  movimientosCurrentPage = 1;
  movimientosPageSize = 5;
  movimientosCurrentTerm = '';

  plan: PlanItem[] = [];
  showPlanModal = false;

  breadcrumbs: any[] = [
    { label: '', url: '/' },
    { label: '', url: '/socios' },
    { label: '' }
  ];

  public pieSeries: ApexNonAxisChartSeries = [0, 0, 0];
  public pieChart: ApexChart = {
    type: 'donut',
    height: 290
  };

  public pieLabels: string[] = [];
  public pieLegend: ApexLegend = {
    position: 'bottom',
    fontSize: '13px'
  };

  public pieDataLabels: ApexDataLabels = {
    enabled: true,
    formatter: (value: number) => `${Math.round(value)}%`
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

  public piePlotOptions: any = {
    pie: {
      donut: {
        size: '68%',
        labels: {
          show: true,
          total: {
            show: true,
            label: 'Total'
          }
        }
      }
    }
  };

  public pieTooltip: any = {
    y: {
      formatter: (value: number) => {
        const currency = this.appConfigService.getCurrentSettings().currency;
        return `${currency} ${this.formatCurrency(value)}`;
      }
    }
  };

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.breadcrumbs =
      this.translate.instant('aperturaCuentaNavidena.breadcrumbs') || this.breadcrumbs;

    this.subs.add(
      this.translate.onLangChange.subscribe(() => {
        this.breadcrumbs =
          this.translate.instant('aperturaCuentaNavidena.breadcrumbs') || this.breadcrumbs;
        this.loadConfig();
        this.loadChartLabels();
      })
    );

    this.subs.add(
      this.filterSvc.query$(this.filterKey).subscribe(query => {
        this.movimientosCurrentTerm = (query || '').trim().toLowerCase();
        this.applyMovimientosFilter();
      })
    );

    this.loadConfig();
    this.loadChartLabels();

    this.subs.add(
      this.route.paramMap.subscribe(params => {
        this.socioId = params.get('socioId') ?? '';
        this.form.socioId = this.socioId;
        this.copy.socioId = this.socioId;

        if (!this.socioId) {
          this.onCancel();
          return;
        }

        this.loadData();
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  loadConfig(): void {
    this.engine.resetRules?.();
    this.engine.clearFieldsMeta?.();

    const fieldMeta =
      this.translate.instant('aperturaCuentaNavidena.form.fieldMeta') || {};
    const validations =
      this.translate.instant('aperturaCuentaNavidena.form.validations') || {};

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

  loadChartLabels(): void {
    this.pieLabels = [
      this.translate.instant('aperturaCuentaNavidena.chart.currentSaving'),
      this.translate.instant('aperturaCuentaNavidena.chart.goalSaving'),
      this.translate.instant('aperturaCuentaNavidena.chart.pendingSaving')
    ];
  }

  loadData(): void {
    this.loading = true;

    this.service.getData(this.socioId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res: any) => {
          const data = res?.data ?? {};

          this.socio = data?.socio ?? null;
          this.apertura = data?.apertura ?? null;
          this.yaAperturada = !!data?.yaAperturada;

          this.resumen = {
            ahorroActual: Number(data?.resumen?.ahorroActual ?? 0),
            meta: Number(data?.resumen?.meta ?? 0),
            faltante: Number(data?.resumen?.faltante ?? 0),
            porcentaje: Number(data?.resumen?.porcentaje ?? 0),
            totalCuotas: Number(data?.resumen?.totalCuotas ?? 0),
            cuotasPagadas: Number(data?.resumen?.cuotasPagadas ?? 0)
          };

          this.retiros = Array.isArray(data?.retiros)
            ? data.retiros.map((x: any) => ({
                id: String(x?.id ?? ''),
                fecha: String(x?.fecha ?? ''),
                descripcion: String(x?.descripcion ?? ''),
                monto: Number(x?.monto ?? 0)
              }))
            : [];

          this.movimientosAll = Array.isArray(data?.movimientos)
            ? data.movimientos.map((x: any) => ({
                id: String(x?.id ?? ''),
                fecha: String(x?.fecha ?? ''),
                descripcion: String(x?.descripcion ?? ''),
                monto: Number(x?.monto ?? 0),
                estado: String(x?.estado ?? ''),
                referencia: x?.referencia ?? null,
                fechaPago: x?.fechaPago ?? null,
                tipoMovimiento: String(x?.tipoMovimiento ?? '')
              }))
            : [];

          this.plan = Array.isArray(data?.plan)
            ? data.plan.map((x: any) => ({
                id: String(x?.id ?? `${x?.fechaProgramada ?? ''}-${x?.montoCuota ?? 0}`),
                fechaProgramada: String(x?.fechaProgramada ?? ''),
                montoCuota: Number(x?.montoCuota ?? 0),
                estado: String(x?.estado ?? ''),
                pagado: !!x?.pagado || String(x?.estado ?? '').toLowerCase() === 'pagada',
                fechaPago: x?.fechaPago ?? null,
                usuarioPago: x?.usuarioPago ?? null
              }))
            : [];

          this.movimientos = [...this.movimientosAll];
          this.applyMovimientosFilter();

          if (this.apertura) {
            this.form.fechaApertura = this.toDateInput(this.apertura.fechaApertura);
            this.form.montoCuota = Number(this.apertura.montoCuota ?? 0);
            this.form.observacion = this.apertura.observacion ?? '';
          } else {
            this.form.fechaApertura = this.form.fechaApertura || '';
            this.form.montoCuota = this.form.montoCuota ?? null;
            this.form.observacion = this.form.observacion || '';
          }

          this.copy = { ...this.form };

          if (!this.yaAperturada) {
            this.buildPreviewPlan();
          } else if ((!this.plan || this.plan.length === 0) && this.form.fechaApertura && Number(this.form.montoCuota ?? 0) > 0) {
            this.buildPreviewPlan();
          } else {
            this.previewPlan = [];
          }

          this.loadChartSeries();
        },
        error: (err: any) => {
          this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
        }
      });
  }

  loadChartSeries(): void {
    const ahorroActual = Number(this.resumen?.ahorroActual ?? 0);
    const meta = Number(this.resumen?.meta ?? 0);
    const faltante = Number(this.resumen?.faltante ?? 0);

    this.pieSeries = [ahorroActual, meta, faltante];
  }

  applyMovimientosFilter(): void {
    const term = (this.movimientosCurrentTerm || '').trim().toLowerCase();

    if (!term) {
      this.movimientos = [...this.movimientosAll];
    } else {
      this.movimientos = this.movimientosAll.filter(item =>
        [
          item.fecha,
          item.descripcion,
          item.estado,
          item.referencia,
          String(item.monto)
        ]
          .filter(Boolean)
          .some(value => String(value).toLowerCase().includes(term))
      );
    }

    this.movimientosCurrentPage = 1;
    this.refreshMovimientosPage();
  }

  refreshMovimientosPage(): void {
    const start = (this.movimientosCurrentPage - 1) * this.movimientosPageSize;
    const end = start + this.movimientosPageSize;
    this.pagedMovimientos = this.movimientos.slice(start, end);
  }

  goToMovimientosPage(page: number): void {
    const totalPages = this.movimientosTotalPages;
    if (page < 1 || page > totalPages) return;

    this.movimientosCurrentPage = page;
    this.refreshMovimientosPage();
  }

  get movimientosTotalPages(): number {
    return Math.max(1, Math.ceil(this.movimientos.length / this.movimientosPageSize));
  }

  get movimientosVisibleStart(): number {
    if (this.movimientos.length === 0) return 0;
    return (this.movimientosCurrentPage - 1) * this.movimientosPageSize + 1;
  }

  get movimientosVisibleEnd(): number {
    return Math.min(this.movimientosCurrentPage * this.movimientosPageSize, this.movimientos.length);
  }

  get movimientosPageNumbers(): (number | string)[] {
    const total = this.movimientosTotalPages;
    const current = this.movimientosCurrentPage;
    const pages: (number | string)[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
      return pages;
    }

    pages.push(1);

    if (current > 3) {
      pages.push('...');
    }

    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i);
    }

    if (current < total - 2) {
      pages.push('...');
    }

    pages.push(total);
    return pages;
  }

  openPlanModal(): void {
    this.showPlanModal = true;
  }

  closePlanModal(): void {
    this.showPlanModal = false;
  }

  onSave(): void {
    const ok = this.engine.validateAll?.();

    if (!ok) {
      this.notify.show?.(this.engine.getGroupedErrorsHtmlSnapshot?.(), '', 'warning');
      return;
    }

    this.engine.clearErrors?.();
    this.notify.close?.();

    const payload = {
      SocioId: this.socioId,
      TipoCuenta: 'Cuenta Navidena',
      FechaApertura: this.normalizeDate(this.form.fechaApertura) ?? '',
      MontoCuota: Number(this.form.montoCuota ?? 0),
      Observacion: this.form.observacion?.trim() ?? ''
    };

    this.saving = true;

    this.service.create(payload)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (res: any) => {
          this.notify.showFromApiResponse?.(res, 'success');
          this.copy = { ...this.form };
          this.engine.clearErrors?.();
          this.loadData();
        },
        error: (err: any) => {
          this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
        }
      });
  }

  onCancel(): void {
    this.notify.close?.();

    this.form = {
      ...this.copy
    };

    this.engine.clearErrors?.();
    this.router.navigate(['/socios']);
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
    if (!value) return '-';

    const date = this.parseLocalDate(value);
    if (!date) return '-';

    const format = (this.appConfigService.getCurrentSettings().dateFormat || 'dd/MM/yyyy').trim();

    const dd = `${date.getDate()}`.padStart(2, '0');
    const MM = `${date.getMonth() + 1}`.padStart(2, '0');
    const yyyy = `${date.getFullYear()}`;

    return format
      .replace('dd', dd)
      .replace('MM', MM)
      .replace('yyyy', yyyy);
  }

  getInitials(value?: string | null): string {
    const text = (value ?? '').trim();
    if (!text) return '--';

    const parts = text.split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }

  private normalizeForm(data: AperturaCuentaNavidenaForm): AperturaCuentaNavidenaForm {
    return {
      socioId: data?.socioId ?? '',
      tipoCuenta: data?.tipoCuenta ?? 'Cuenta Navidena',
      fechaApertura: data?.fechaApertura ?? '',
      montoCuota: data?.montoCuota == null ? null : Number(data.montoCuota),
      observacion: data?.observacion?.trim() ?? ''
    };
  }

  private toDateInput(value?: string | null): string {
    if (!value) return '';

    const date = this.parseLocalDate(value);
    if (!date) return '';

    return this.formatDate(this.toIsoDate(date));
  }

  private normalizeDate(value: string | null): string | null {
    if (!value) return null;

    const date = this.parseLocalDate(value);
    if (!date) return null;

    return this.toIsoDate(date);
  }

  get totalCuotasPlan(): number {
    return (this.displayedPlan ?? []).length;
  }

  get cuotasPagadasPlan(): number {
    return (this.displayedPlan ?? []).filter(x => x.pagado === true).length;
  }

  get porcentajePlan(): number {
    const total = this.totalCuotasPlan;
    if (total <= 0) return 0;

    return Math.round((this.cuotasPagadasPlan / total) * 100);
  }

  get displayedPlan(): PlanItem[] {
    if (this.yaAperturada && this.plan.length > 0) {
      return this.plan;
    }

    return this.previewPlan;
  }

  onFechaAperturaChange(value: string): void {
    this.form.fechaApertura = value;
    this.buildPreviewPlan();
  }

  onMontoCuotaChange(value: any): void {
    this.form.montoCuota = Number(value ?? 0);
    this.buildPreviewPlan();
  }

  private buildPreviewPlan(): void {
    const fecha = this.normalizeDate(this.form.fechaApertura);
    const monto = Number(this.form.montoCuota ?? 0) / 2;

    if (!fecha || monto <= 0) {
      this.previewPlan = [];
      return;
    }

    let current = this.normalizePlanDate(new Date(`${fecha}T00:00:00`));
    const end = new Date(current.getFullYear(), 10, 30);

    const rows: PlanItem[] = [];
    let i = 1;

    while (current <= end) {
      rows.push({
        id: `preview-${i}`,
        fechaProgramada: this.toIsoDate(current),
        montoCuota: monto,
        estado: 'Pendiente',
        pagado: false,
        fechaPago: null,
        usuarioPago: null
      });

      current = this.getNextBiweeklyDate(current);
      i++;
    }

    this.previewPlan = rows;
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

  private normalizePlanDate(date: Date): Date {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    const day15 = new Date(year, month, 15);
    const day30 = new Date(year, month, Math.min(30, new Date(year, month + 1, 0).getDate()));

    if (day < 15) {
      return day15;
    }

    if (day > 15 && day < 30) {
      return day30;
    }

    if (day === 15) {
      return day15;
    }

    if (day === 30) {
      return day30;
    }

    return new Date(year, month + 1, 15);
  }

  private getNextBiweeklyDate(current: Date): Date {
    const year = current.getFullYear();
    const month = current.getMonth();
    const day = current.getDate();

    if (day === 15) {
      const lastDay = new Date(year, month + 1, 0).getDate();
      return new Date(year, month, Math.min(30, lastDay));
    }

    return new Date(year, month + 1, 15);
  }

  private toIsoDate(date: Date): string {
    const y = date.getFullYear();
    const m = `${date.getMonth() + 1}`.padStart(2, '0');
    const d = `${date.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  onNuevoDeposito(): void {
    this.router.navigate(['/socio-ahorro/new', this.socioId]);
  }

  onNuevoRetiro(): void {

  }
}
