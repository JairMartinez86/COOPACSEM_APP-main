import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  Component,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  Renderer2,
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

/* =========================================================
 * MODELOS / INTERFACES
 * ========================================================= */

interface SocioResumen {
  id: string;
  codigoSocio: string;
  nombreCompleto: string;
  numeroIdentificacion: string;
  sociedadLabora?: string | null;
  fechaIngreso?: string | null;
  fechaAperturaNavidena?: string | null;
}

interface AperturaResumen {
  id: string;
  fechaInicio: string;
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
  deposito: number,
  retiro: number,
  estado: string;
  referencia?: string | null;
  fechaPago?: string | null;
  tipoMovimiento?: string | null;
}
export interface PlanItem {
  id?: string | null;
  noCuota: number | null;
  fechaProgramada: string;
  tipoLinea: string | null;
  descripcion: string | null;

  montoCuota: number | null;
  deposito: number | null;
  retiro: number | null;
  interes: number | null;

  estado: string | null;
  saldo: number | null;
  saldoInteres: number | null;

  pagado: boolean | null;
  fechaPago?: string | null;
  usuarioPago?: string | null;
}

interface AperturaCuentaNavidenaForm {
  socioId: string;
  tipoCuenta: string;
  fechaInicio: string;
  montoCuota: number | null;
  observacion: string;
}

/* =========================================================
 * COMPONENTE
 * ========================================================= */

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

  /* =========================================================
   * INYECCIÓN DE DEPENDENCIAS
   * ========================================================= */

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly service = inject(SocioAperturaCuentaNavidenaService);
  private readonly filterSvc = inject(TableFilterService);
  private readonly renderer = inject(Renderer2);
  private readonly document = inject(DOCUMENT);

  public readonly appConfigService = inject(AppConfigService);
  public readonly notify = inject(NotificationService);
  private readonly engine = inject(JMartMassiveValidationService);


  selected: MovimientoPlanItem | null = null;

  /* =========================================================
   * ESTADO GENERAL
   * ========================================================= */

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
  tieneMovimiento = false;

  retiros: any[] = [];

  form: AperturaCuentaNavidenaForm = {
    socioId: '',
    tipoCuenta: 'Navidena',
    fechaInicio: '',
    montoCuota: null,
    observacion: ''
  };

  /* =========================================================
   * HISTORIAL / MOVIMIENTOS
   * ========================================================= */

  movimientos: MovimientoPlanItem[] = [];
  movimientosAll: MovimientoPlanItem[] = [];
  pagedMovimientos: MovimientoPlanItem[] = [];
  movimientosCurrentPage = 1;
  movimientosPageSize = 5;
  movimientosCurrentTerm = '';

  /* =========================================================
   * PLAN
   * ========================================================= */

  plan: PlanItem[] = [];
  showPlanModal = false;

  /* =========================================================
   * BREADCRUMBS
   * ========================================================= */

  breadcrumbs: any[] = [
    { label: '', url: '/' },
    { label: '', url: '/socios' },
    { label: '' }
  ];

  /* =========================================================
 * CONFIGURACIÓN DEL CHART
 * ========================================================= */

  public pieSeries: ApexNonAxisChartSeries = [0, 0];

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
          name: {
            show: true
          },
          value: {
            show: true,
            formatter: (value: string) => {
              const currency = this.appConfigService.getCurrentSettings().currency;
              return `${currency} ${this.formatCurrency(Number(value || 0))}`;
            }
          },
          total: {
            show: true,
            showAlways: true,
            label: this.translate.instant('aperturaCuentaNavidena.common.total'),
            formatter: (w: any) => {
              const total = (w?.globals?.seriesTotals || [])
                .reduce((a: number, b: number) => a + b, 0);

              const currency = this.appConfigService.getCurrentSettings().currency;
              return `${currency} ${this.formatCurrency(total)}`;
            }
          }
        }
      }
    }
  };


  public pieTooltip: any = {
    custom: ({ series, seriesIndex, w }: any) => {
      const value = series[seriesIndex];
      const currency = this.appConfigService.getCurrentSettings().currency;

      return `
  <div style="padding:10px; color:write;">
    <strong>${this.pieLabels[seriesIndex]}</strong><br/>
    ${currency} ${this.formatCurrency(value)}
  </div>
`;
    }
  };
  /**
   * Carga labels traducidos para el gráfico donut.
   */
  loadChartLabels(): void {
    this.pieLabels = [
      this.translate.instant('aperturaCuentaNavidena.chart.currentSaving'),
      this.translate.instant('aperturaCuentaNavidena.chart.goalSaving')
    ];
  }

  /**
   * Actualiza la serie principal del chart con los datos del resumen.
   */
  loadChartSeries(): void {
    const ahorroActual = Number(this.resumen?.ahorroActual ?? 0);
    const meta = Number(this.resumen?.meta ?? 0);

    this.pieSeries = [ahorroActual, meta];
  }
  /* =========================================================
   * EFECTO DE NIEVE
   * ========================================================= */

  private snowHost?: HTMLElement;
  private snowStyle?: HTMLStyleElement;
  private snowInterval?: number;

  /* =========================================================
   * CONSTRUCTOR
   * ========================================================= */

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  /* =========================================================
   * CICLO DE VIDA
   * ========================================================= */

  /**
   * Inicializa el componente:
   * - activa el efecto nieve
   * - carga breadcrumbs
   * - configura traducciones y filtros
   * - prepara validaciones
   * - toma el socioId de la ruta
   * - carga la información principal
   */
  ngOnInit(): void {
    this.startSnow();

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

    // Controles auxiliares del motor de validación
    this.engine.addControl('FechaServidor');
    this.engine.addControl('yaAperturada');

    this.engine.setControlValue(
      'FechaServidor',
      this.appConfigService.getCurrentSettings().fechaServidor
    );

    this.engine.setControlValue('yaAperturada', this.yaAperturada);

    // Valores iniciales del formulario
    (this.form as any).fechaApertura =
      this.formatDate(this.appConfigService.getCurrentSettings().fechaServidor);

    (this.form as any).FechaServidor =
      this.appConfigService.getCurrentSettings().fechaServidor;

    this.subs.add(
      this.route.paramMap.subscribe(params => {
        this.socioId = params.get('socioId') ?? '';
        this.form.socioId = this.socioId;

        if (!this.socioId) {
          this.onCancel();
          return;
        }

        this.loadData();
      })
    );
  }

  /**
   * Limpia recursos del componente:
   * - detiene nieve
   * - libera suscripciones
   */
  ngOnDestroy(): void {
    this.stopSnow();
    this.subs.unsubscribe();
  }

  /* =========================================================
   * EFECTO NIEVE
   * ========================================================= */

  /**
   * Inicia el efecto de nieve:
   * - inserta estilos dinámicos en <head>
   * - crea un host en <body>
   * - genera copos aleatorios en intervalos
   */
  private startSnow(): void {
    if (!this.isBrowser || this.snowHost) return;

    const style = this.renderer.createElement('style') as HTMLStyleElement;
    style.innerHTML = `
      .oai-snow-host {
        position: fixed;
        inset: 0;
        pointer-events: none;
        overflow: hidden;
        z-index: 999999;
      }

      .oai-snowflake {
        position: absolute;
        top: -24px;
        color: #fff;
        user-select: none;
        pointer-events: none;
        text-shadow: 0 0 10px rgba(255,255,255,.9);
        animation-name: oai-fall-snow;
        animation-timing-function: linear;
        animation-iteration-count: 1;
        will-change: transform, opacity;
      }

      @keyframes oai-fall-snow {
        0% {
          transform: translate3d(0, -20px, 0) rotate(0deg);
          opacity: 0;
        }
        10% {
          opacity: .95;
        }
        100% {
          transform: translate3d(40px, 110vh, 0) rotate(360deg);
          opacity: .15;
        }
      }
    `;

    this.renderer.appendChild(this.document.head, style);
    this.snowStyle = style;

    const host = this.renderer.createElement('div');
    host.className = 'oai-snow-host';
    this.renderer.appendChild(this.document.body, host);
    this.snowHost = host;

    const createFlake = () => {
      if (!this.snowHost) return;

      const flake = this.renderer.createElement('span');
      flake.className = 'oai-snowflake';
      flake.textContent = '❄';

      const left = Math.random() * 100;
      const size = 8 + Math.random() * 10;
      const duration = 5 + Math.random() * 7;
      const drift = -80 + Math.random() * 160;

      this.renderer.setStyle(flake, 'left', `${left}vw`);
      this.renderer.setStyle(flake, 'font-size', `${size}px`);
      this.renderer.setStyle(flake, 'animation-duration', `${duration}s`);
      this.renderer.setStyle(flake, 'transform', `translate3d(0,0,0)`);
      this.renderer.setStyle(flake, '--drift', `${drift}px`);

      flake.animate(
        [
          { transform: 'translate3d(0, -20px, 0) rotate(0deg)', opacity: 0 },
          {
            transform: `translate3d(${drift * 0.25}px, 10vh, 0) rotate(90deg)`,
            opacity: 0.95,
            offset: 0.15
          },
          {
            transform: `translate3d(${drift}px, 110vh, 0) rotate(360deg)`,
            opacity: 0.15
          }
        ],
        {
          duration: duration * 1000,
          easing: 'linear',
          fill: 'forwards'
        }
      );

      this.renderer.appendChild(this.snowHost, flake);

      window.setTimeout(() => {
        flake.remove();
      }, duration * 1000 + 300);
    };

    // ráfaga inicial
    for (let i = 0; i < 10; i++) {
      window.setTimeout(createFlake, i * 180);
    }

    // generación continua
    this.snowInterval = window.setInterval(createFlake, 800);
  }

  /**
   * Detiene el efecto nieve:
   * - limpia el intervalo
   * - elimina el host
   * - elimina los estilos dinámicos
   */
  private stopSnow(): void {
    if (this.snowInterval) {
      window.clearInterval(this.snowInterval);
      this.snowInterval = undefined;
    }

    if (this.snowHost) {
      this.snowHost.remove();
      this.snowHost = undefined;
    }

    if (this.snowStyle) {
      this.snowStyle.remove();
      this.snowStyle = undefined;
    }
  }

  /* =========================================================
   * CONFIGURACIÓN DE VALIDACIONES
   * ========================================================= */

  /**
   * Carga metadatos y reglas del motor de validación desde traducciones.
   */
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



  /* =========================================================
   * CARGA DE DATOS
   * ========================================================= */

  /**
   * Carga todos los datos de la pantalla:
   * - socio
   * - apertura existente
   * - resumen
   * - retiros
   * - movimientos
   * - plan
   */
  loadData(): void {

    // const start = performance.now();

    this.loading = true;

    this.service.getData(this.socioId)
      .pipe(finalize(() => {
        this.loading = false;

        /* console.log(
           `Apertura/Plan request: ${(performance.now() - start).toFixed(2)} ms`
         );*/
      }))
      .subscribe({
        next: (res: any) => {
          const data = res?.data ?? {};



          this.socio = data?.socio ?? null;
          this.apertura = data?.apertura ?? null;
          this.yaAperturada = !!data?.yaAperturada;
          this.tieneMovimiento = !!data?.tieneMovimiento;

          this.engine.setControlValue('yaAperturada', this.yaAperturada);

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

          this.plan = [];

          this.movimientos = [...this.movimientosAll];
          this.applyMovimientosFilter();
          if (this.apertura) {

            this.form.fechaInicio =
              this.toDateInput(this.apertura.fechaInicio);

            this.form.montoCuota =
              Number(this.apertura.montoCuota ?? 0);

            this.form.observacion =
              this.apertura.observacion ?? '';
          } else {
            this.form.fechaInicio = this.form.fechaInicio || '';
            this.form.montoCuota = this.form.montoCuota ?? null;
            this.form.observacion = this.form.observacion || '';
          }
          if (!this.yaAperturada) {
            this.buildPreviewPlan();
          } else {
            this.previewPlan = [];
          }
          this.engine.patchValues?.({
            FechaInicio: this.normalizeDate(this.form.fechaInicio) ?? '',
            MontoCuota: Number(this.form.montoCuota ?? 0),
            Observacion: this.form.observacion ?? '',
            yaAperturada: this.yaAperturada
          });



          this.loadChartSeries();
          this.engine.clearErrors();
        },
        error: (err: any) => {
          this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
        }
      });
  }

  /* =========================================================
   * FILTRO Y PAGINACIÓN DE MOVIMIENTOS
   * ========================================================= */

  /**
   * Aplica el filtro de búsqueda al historial de movimientos.
   */
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

  /**
   * Recalcula la página visible del historial.
   */
  refreshMovimientosPage(): void {
    const start = (this.movimientosCurrentPage - 1) * this.movimientosPageSize;
    const end = start + this.movimientosPageSize;
    this.pagedMovimientos = this.movimientos.slice(start, end);
  }

  /**
   * Navega a una página específica del historial.
   */
  goToMovimientosPage(page: number): void {
    const totalPages = this.movimientosTotalPages;
    if (page < 1 || page > totalPages) return;

    this.movimientosCurrentPage = page;
    this.refreshMovimientosPage();
  }

  /**
   * Total de páginas del historial.
   */
  get movimientosTotalPages(): number {
    return Math.max(1, Math.ceil(this.movimientos.length / this.movimientosPageSize));
  }

  /**
   * Índice inicial visible en paginación.
   */
  get movimientosVisibleStart(): number {
    if (this.movimientos.length === 0) return 0;
    return (this.movimientosCurrentPage - 1) * this.movimientosPageSize + 1;
  }

  /**
   * Índice final visible en paginación.
   */
  get movimientosVisibleEnd(): number {
    return Math.min(
      this.movimientosCurrentPage * this.movimientosPageSize,
      this.movimientos.length
    );
  }

  /**
   * Construye los números de página con puntos suspensivos.
   */
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

  /* =========================================================
   * MODAL DEL PLAN
   * ========================================================= */


  simularPlan(): void {

    if (!this.socioId) return;

    const fechaServidor =
      this.appConfigService.getCurrentSettings().fechaServidor;

    //const start = performance.now();

    this.loading = true;

    this.service.simularPlan(
      this.socioId,
      this.normalizeDate(fechaServidor) ?? undefined
    )
      .pipe(finalize(() => {

        this.loading = false;

        /* console.log(
           `Simular plan request: ${(performance.now() - start).toFixed(2)} ms`
         );*/
      }))
      .subscribe({
        next: (res: any) => {

          const data = res?.data ?? {};

          this.plan = Array.isArray(data?.plan)
            ? data.plan.map((x: any) => ({
              id: String(
                x?.id ??
                `${x?.fechaProgramada ?? ''}-${x?.montoCuota ?? 0}`
              ),

              noCuota: Number(x?.noCuota ?? 0),

              fechaProgramada: String(x?.fechaProgramada ?? ''),

              tipoLinea: String(x?.tipoLinea ?? ''),

              descripcion: String(x?.descripcion ?? ''),

              montoCuota: Number(x?.montoCuota ?? 0),

              deposito: Number(x?.deposito ?? 0),

              retiro: Number(x?.retiro ?? 0),

              interes: Number(x?.interes ?? 0),

              estado: String(x?.estado ?? ''),

              saldo: Number(x?.saldo ?? 0),

              saldoInteres: Number(x?.saldoInteres ?? 0),

              pagado:
                !!x?.pagado ||
                String(x?.estado ?? '').toLowerCase() === 'pagado',

              fechaPago: x?.fechaPago ?? null,

              usuarioPago: x?.usuarioPago ?? null
            }))
            : [];

          this.openPlanModal();
        },
        error: (err: any) => {
          this.notify.showFromApiResponse?.(
            err?.error ?? err,
            'error'
          );
        }
      });
  }



  /**
   * Abre el modal del plan.
   */
  openPlanModal(): void {
    this.showPlanModal = true;
  }

  /**
   * Cierra el modal del plan.
   */
  closePlanModal(): void {
    this.showPlanModal = false;
  }

  /* =========================================================
   * ACCIONES DEL FORMULARIO
   * ========================================================= */

  /**
   * Valida y guarda la apertura de cuenta navideña.
   */
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
      TipoCuenta: 'Navidena',
      FechaInicio: this.normalizeDate(this.form.fechaInicio) ?? '',
      MontoCuota: Number(this.form.montoCuota ?? 0),
      Observacion: this.form.observacion?.trim() ?? ''
    };

    this.saving = true;

    this.service.create(payload)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (res: any) => {
          this.notify.showFromApiResponse?.(res, 'success');
          this.engine.clearErrors?.();
          this.loadData();
        },
        error: (err: any) => {
          this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
        }
      });
  }

  onDelete(): void {
    const message = this.translate.instant('aperturaCuentaNavidena.delete.message', {
      nombre: this.socio?.nombreCompleto || '',
      identificacion: this.socio?.numeroIdentificacion || ''
    });

    const warning = this.translate.instant('aperturaCuentaNavidena.delete.warning');
    const title = this.translate.instant('aperturaCuentaNavidena.delete.title');

    const ref = this.notify.confirm?.(
      `${message}\n\n${warning}`,
      title,
      'warning'
    );

    if (!ref) return;

    const deleteSub = ref.subscribe((result: number) => {
      if (result !== 1) return;

      this.service.delete(this.socioId).subscribe({
        next: (res: any) => {
          this.notify.showFromApiResponse?.(res, 'success');
          this.loadData();
        },
        error: (err: any) => {
          this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
        }
      });
    });

    this.subs.add(deleteSub);
  }
  /**
   * Cancela la operación y vuelve a la lista de socios.
   */
  onCancel(): void {
    this.notify.close?.();
    this.engine.clearErrors?.();
    this.router.navigate(['/socios']);
  }

  /* =========================================================
   * FORMATO
   * ========================================================= */

  /**
   * Formatea un número decimal usando configuración regional de la empresa.
   */
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

  /**
   * Formatea una fecha según la configuración regional actual.
   */
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


  formatFechaLarga(value: string | Date | null | undefined): string {
    if (!value) return '';

    let year = 0;
    let month = 0;
    let day = 0;

    if (value instanceof Date) {
      year = value.getFullYear();
      month = value.getMonth();
      day = value.getDate();
    } else {
      const raw = String(value).trim();
      const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);

      if (match) {
        year = Number(match[1]);
        month = Number(match[2]) - 1;
        day = Number(match[3]);
      } else {
        const fecha = new Date(raw);
        if (isNaN(fecha.getTime())) return '';
        year = fecha.getFullYear();
        month = fecha.getMonth();
        day = fecha.getDate();
      }
    }

    const lang = this.translate.getCurrentLang() || 'es';

    const meses: any = {
      es: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
      en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    };

    const mes = meses[lang]?.[month] ?? '';

    if (lang === 'en') {
      return `${mes} ${String(day).padStart(2, '0')}, ${year}`;
    }

    return `${String(day).padStart(2, '0')} ${mes} del ${year}`;
  }

  /**
   * Obtiene iniciales de un nombre para avatar.
   */
  getInitials(value?: string | null): string {
    const text = (value ?? '').trim();
    if (!text) return '--';

    const parts = text.split(' ').filter(Boolean);

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }

  /* =========================================================
   * NORMALIZACIÓN DE FORM / FECHAS
   * ========================================================= */

  /**
   * Normaliza un objeto de formulario.
   */
  private normalizeForm(data: AperturaCuentaNavidenaForm): AperturaCuentaNavidenaForm {
    return {
      socioId: data?.socioId ?? '',
      tipoCuenta: data?.tipoCuenta ?? 'Navidena',
      fechaInicio: data?.fechaInicio ?? '',
      montoCuota: data?.montoCuota == null ? null : Number(data.montoCuota),
      observacion: data?.observacion?.trim() ?? ''
    };
  }

  /**
   * Convierte una fecha a formato de input según formato regional.
   */
  private toDateInput(value?: string | null): string {
    if (!value) return '';

    const date = this.parseLocalDate(value);
    if (!date) return '';

    return this.formatDate(this.toIsoDate(date));
  }

  /**
   * Normaliza una fecha ingresada a formato ISO yyyy-MM-dd.
   */
  private normalizeDate(value: string | null): string | null {
    if (!value) return null;

    const date = this.parseLocalDate(value);
    if (!date) return null;

    return this.toIsoDate(date);
  }

  /* =========================================================
   * MÉTRICAS DEL PLAN
   * ========================================================= */

  /**
   * Total de cuotas del plan mostrado.
   */
  get totalCuotasPlan(): number {
    return (this.displayedPlan ?? []).length;
  }

  /**
   * Total de cuotas pagadas del plan mostrado.
   */
  get cuotasPagadasPlan(): number {
    return (this.displayedPlan ?? []).filter(x => x.pagado === true).length;
  }

  /**
   * Porcentaje de avance del plan.
   */
  get porcentajePlan(): number {
    const total = this.totalCuotasPlan;
    if (total <= 0) return 0;

    return Math.round((this.cuotasPagadasPlan / total) * 100);
  }

  /**
   * Devuelve el plan real o el preview dependiendo del estado.
   */
  get displayedPlan(): PlanItem[] {
    if (this.plan.length > 0) {
      return this.plan;
    }

    if (!this.yaAperturada) {
      return this.previewPlan;
    }

    return [];
  }



  /* =========================================================
   * EVENTOS DE CAMBIO DE FORMULARIO
   * ========================================================= */

  /**
   * Maneja cambios en la fecha de apertura y reconstruye preview.
   */
  onFechaAperturaChange(value: string): void {
    this.form.fechaInicio = value;
    this.buildPreviewPlan();
  }

  /**
   * Maneja cambios en monto de cuota y reconstruye preview.
   */
  onMontoCuotaChange(value: any): void {
    this.form.montoCuota = Number(value ?? 0);
    this.buildPreviewPlan();
  }

  /* =========================================================
   * GENERACIÓN DE PREVIEW DEL PLAN
   * ========================================================= */

  /**
   * Construye un plan preliminar de cuotas quincenales hasta noviembre.
   */
  // SOLO TE PASO LAS PARTES MODIFICADAS Y COMPLETAS DEL TS (listas para pegar)

  // ============================
  // NUEVO MÉTODO SALDO ACUMULADO
  // ============================
  getSaldoAcumulado(index: number): number {
    if (index < 0) return 0;

    return (this.displayedPlan ?? [])
      .slice(0, index + 1)
      .reduce((sum, item) => sum + Number(item?.montoCuota ?? 0), 0);
  }

  // ============================
  // REEMPLAZAR COMPLETO
  // buildPreviewPlan()
  // ============================
  private buildPreviewPlan(): void {
    const fecha = this.normalizeDate(this.form.fechaInicio);
    const monto = Number(this.form.montoCuota ?? 0);

    if (!fecha || monto <= 0) {
      this.previewPlan = [];
      this.updateResumenFromPreview();
      return;
    }

    let current = this.normalizePlanDate(new Date(`${fecha}T00:00:00`));
    const end = new Date(current.getFullYear(), 9, 31);

    const rows: PlanItem[] = [];
    let i = 1;

    while (current <= end) {
      rows.push({
        id: `preview-${i}`,
        noCuota: i,
        fechaProgramada: this.toIsoDate(current),
        tipoLinea: 'PLAN',
        descripcion: 'PLAN',
        montoCuota: monto,
        deposito: null,
        retiro: null,
        interes: null,
        estado: 'Pendiente',
        pagado: false,
        saldo: 0,
        saldoInteres: 0,
        fechaPago: null,
        usuarioPago: null
      });

      current = this.getNextBiweeklyDate(current);
      i++;
    }

    this.previewPlan = rows;
    this.updateResumenFromPreview();
  }

  private normalizePlanDate(date: Date): Date {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const lastDay = new Date(year, month + 1, 0).getDate();

    if (day <= 15) {
      return new Date(year, month, 15);
    }

    return new Date(year, month, lastDay);
  }

  private getNextBiweeklyDate(current: Date): Date {
    const year = current.getFullYear();
    const month = current.getMonth();
    const day = current.getDate();
    const lastDay = new Date(year, month + 1, 0).getDate();

    if (day === 15) {
      return new Date(year, month, lastDay);
    }

    return new Date(year, month + 1, 15);
  }



  private updateResumenFromPreview(): void {
    const ahorroActual = Number(this.resumen?.ahorroActual ?? 0);
    const totalCuotas = this.previewPlan.length;
    const meta = this.previewPlan.reduce(
      (sum, x) => sum + Number(x.montoCuota ?? 0),
      0
    );

    const faltante = Math.max(0, meta - ahorroActual);

    const cuotasPagadas = Number(this.resumen?.cuotasPagadas ?? 0);

    const porcentaje = meta <= 0
      ? 0
      : Math.round((ahorroActual / meta) * 10000) / 100;

    this.resumen = {
      ahorroActual,
      meta,
      faltante,
      porcentaje,
      totalCuotas,
      cuotasPagadas
    };

    this.loadChartSeries();
  }



  /* =========================================================
   * PARSEO Y UTILIDADES DE FECHAS
   * ========================================================= */

  /**
   * Parsea una fecha en diferentes formatos soportados por la app:
   * - yyyy-MM-dd
   * - yyyy-MM-ddTHH:mm:ss
   * - dd/MM/yyyy
   * - MM/dd/yyyy
   */
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




  /**
   * Convierte una fecha Date a string ISO yyyy-MM-dd.
   */
  private toIsoDate(date: Date): string {
    const y = date.getFullYear();
    const m = `${date.getMonth() + 1}`.padStart(2, '0');
    const d = `${date.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /* =========================================================
   * NAVEGACIÓN
   * ========================================================= */

  /**
   * Navega a la pantalla de nuevo depósito.
   */
  onNuevoDeposito(): void {
    this.router.navigate(['/socio-ahorro/new', this.socioId]);
  }

  /**
   * Placeholder para retiro futuro.
   */
  onNuevoRetiro(): void {
    this.router.navigate(['/socio-retiro/new', this.socioId]);
  }
}