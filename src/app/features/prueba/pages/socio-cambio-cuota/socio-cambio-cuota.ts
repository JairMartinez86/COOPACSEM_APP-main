// =============================
// IMPORTACIONES
// =============================
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize, Subscription } from 'rxjs';

// Componentes y servicios internos
import { Breadcrumb } from '../../../../shared/components/breadcrumb/breadcrumb';
import { AppConfigService } from '../../../../core/services/app-config.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AppPermissionDirective } from '../../../../core/services/app-permission.directive';

// Librería de validaciones personalizada
import {
  JMartAutoFocusDirective,
  JMartAutoFocusNextDirective,
  JMartDateFormatDirective,
  JMartEngineSyncDirective,
  JMartErrorNotifyDirective,
  JMartMassiveValidationService,
  JMartNumberFormatDirective
} from '@JairMartinez86/jmartinez-validator';

// Librería de gráficos
import {
  ApexChart,
  ApexDataLabels,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexResponsive,
  ApexTooltip,
  ChartComponent
} from 'ng-apexcharts';

// Servicios del módulo
import { SocioCambioCuotaService } from '../../services/socio-cambio-cuota.service';
import { SocioCambioCuota } from '../../interface/socio.cambio.cuota';
import { TableFilterService } from '../../../../core/services/table-filter.service';


// =============================
// INTERFACES
// =============================

// Información básica del socio
interface SocioResumen {
  id: string;
  codigoSocio: string;
  nombreCompleto: string;
  numeroIdentificacion: string;
  sociedadLabora?: string;
  fechaIngreso?: string | null;
}

// Información de autorizaciones (workflow de aprobación)
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

// Historial simplificado para la tabla
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

  // =============================
  // INYECCIÓN DE DEPENDENCIAS
  // =============================
  private readonly route = inject(ActivatedRoute); // Maneja parámetros de la URL
  private readonly router = inject(Router); // Navegación
  private readonly translate = inject(TranslateService); // Traducciones
  private readonly service = inject(SocioCambioCuotaService); // Servicio API
  private readonly filterSvc = inject(TableFilterService); // Servicio de filtros

  public appConfigService = inject(AppConfigService); // Config global (moneda, formato)
  public notify = inject(NotificationService); // Notificaciones

  private engine = inject(JMartMassiveValidationService); // Motor de validaciones

  private readonly isBrowser: boolean; // Detecta si está en navegador
  private readonly subs = new Subscription(); // Manejo de subscripciones
  private readonly filterKey = 'socio-cambio-cuota'; // Key del filtro



  // Estado del componente
  mode: 'create' | 'view' | 'edit' = 'create';

  tipoMovimiento: 'incremento' | 'disminucion' = 'incremento';
  socioId = '';

  loading = false; // Indicador de carga
  saving = false; // Indicador de guardado
  approvingId: string | null = null; // Control de aprobación por fila

  socio: SocioResumen | null = null;

  // Cuotas actuales
  cuotas: { corriente: number; navideno: number } = {
    corriente: 0,
    navideno: 0
  };

  // Totales del gráfico
  chartTotals = {
    ahorro: 0,
    retiro: 0,
    intereses: 0
  };

  // Datos del dashboard
  dashboard = {
    ahorro: 0,
    deposito: 0,
    intereses: 0
  }

  // Paginación historial
  historialCurrentPage = 1;
  historialPageSize = 5;
  historialCurrentTerm = '';
  historial: HistorialItem[] = [];
  historialAll: HistorialItem[] = [];

  // Lista de autorizaciones
  autorizaciones: AutorizacionItem[] = [];

  // Formulario principal
  form: SocioCambioCuota = {
    socioId: '',
    tipoCuenta: 'corriente',
    tipoMovimiento: 'incremento',
    cuotaActual: 0,
    nuevaCuota: null,
    vigencia: '',
    aplicaDesde: 'quincena',
    observacion: ''
  };

  // Breadcrumbs
  breadcrumbs: any[] = [];

  // =============================
  // CONFIGURACIÓN DE GRÁFICO
  // =============================
  public pieColors: string[] = [
    '#19b7a5', // ahorro = verde
    '#f59e0b', // retirado = orange
    '#1d4ed8'  // interés = amarillo
  ];

  public pieSeries: ApexNonAxisChartSeries = [0, 0, 0];

  public pieLabels: string[] = [
    'Ahorro',
    'Retirado',
    'Interés'
  ];

  public pieChart: ApexChart = {
    type: 'pie',
    height: 300
  };

  // Tooltip con formato de moneda
  public pieTooltip: ApexTooltip = {
    y: {
      formatter: (value: number) => {
        const currency = this.appConfigService.getCurrentSettings().currency;
        return `${currency} ${this.formatCurrency(value)}`;
      }
    }
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


  public pieLegend: ApexLegend = {
    position: 'bottom'
  };

  // Etiquetas dentro del gráfico
  public pieDataLabels: ApexDataLabels = {
    enabled: true,
    formatter: (_val: number, opts?: any) => {
      const value = opts?.w?.config?.series?.[opts.seriesIndex] ?? 0;
      const currency = this.appConfigService.getCurrentSettings().currency;
      return `${currency} ${this.formatCurrency(value)}`;
    }
  };

  // Responsive del gráfico
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

  // =============================
  // INICIALIZACIÓN
  // =============================
  ngOnInit(): void {

    // Cargar breadcrumbs traducidos
    this.breadcrumbs = this.translate.instant('socioCambioCuota.breadcrumbs') || this.breadcrumbs;

    this.setLabels();

    this.translate.onLangChange.subscribe(() => {
      this.setLabels();
    });


    // Escuchar filtro de búsqueda
    this.subs.add(
      this.filterSvc.query$(this.filterKey).subscribe(query => {
        this.historialCurrentTerm = (query || '').trim().toLowerCase();
        this.applyFilter();
      })
    );

    // Actualizar configuración al cambiar idioma
    this.subs.add(
      this.translate.onLangChange.subscribe(() => {
        this.breadcrumbs = this.translate.instant('socioCambioCuota.breadcrumbs') || [];
        this.loadConfig();
      })
    );

    this.loadConfig();

    // Registrar fecha del servidor en validaciones
    this.engine.addControl('FechaServidor');
    this.engine.setControlValue(
      'FechaServidor',
      this.appConfigService.getCurrentSettings().fechaServidor
    );




    // Sincronizar valores en el form
    (this.form as any).FechaServidor = this.appConfigService.getCurrentSettings().fechaServidor;
    (this.form as any).tipoMovimiento = this.tipoMovimiento;

    // Obtener parámetros de la URL
    this.subs.add(
      this.route.paramMap.subscribe(params => {
        this.socioId = params.get('socioId') ?? '';

        const routeTipo = params.get('tipoMovimiento');
        this.tipoMovimiento = routeTipo === 'disminucion' ? 'disminucion' : 'incremento';



        this.form.socioId = this.socioId;
        this.form.tipoMovimiento = this.tipoMovimiento;

        // Si no hay socio → regresar
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

    // Reaplica configuración después de render
    this.loadConfig();

    // Inicializa modo según ruta
    this.initRouteModeAndLoad();
  }


  private setLabels(): void {
    this.pieLabels = [
      this.translate.instant('socioCambioCuota.chart.labels.saving'),
      this.translate.instant('socioCambioCuota.chart.labels.withdrawal'),
      this.translate.instant('socioCambioCuota.chart.labels.interest')
    ];
  }

  // Determina modo (create / view)
  private initRouteModeAndLoad(): void {
    const url = this.router.url.toLowerCase();
    this.mode = 'view';

    if (url.includes('/new')) {
      this.mode = 'create';
    }
  }

  // Limpieza de subscripciones
  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  // =============================
  // CONFIGURACIÓN VALIDACIONES
  // =============================
  loadConfig(): void {

    this.engine.resetRules?.();
    this.engine.clearFieldsMeta?.();

    const fieldMeta = this.translate.instant('socioCambioCuota.form.fieldMeta') || {};
    const validations = this.translate.instant('socioCambioCuota.form.validations') || {};

    // Configurar metadata de campos
    for (const [fieldId, meta] of Object.entries(fieldMeta as Record<string, any>)) {
      this.engine.addFieldMeta?.({
        id: fieldId,
        label: meta?.label ?? '',
        tooltip: meta?.tooltip ?? '',
        tooltipIconClass: meta?.tooltipIconClass ?? ''
      });
    }

    // Configurar reglas dinámicas
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

  // =============================
  // CARGA DE DATOS
  // =============================
  loadData(): void {
    this.loading = true;

    this.service.getData(this.socioId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res: any) => {
          const data = res?.data ?? {};

    
          if (this.form.tipoCuenta == 'corriente') {
            this.form.cuotaActual = Number(data?.cuotas?.corriente ?? 0);
          }
          else {
            this.form.cuotaActual = Number(data?.cuotas?.navideno ?? 0);
          }

          this.socio = data?.socio ?? null;

          // Asignar cuotas
          this.cuotas = {
            corriente: Number(data?.cuotas?.corriente ?? 0),
            navideno: Number(data?.cuotas?.navideno ?? 0)
          };

          // Autorizaciones
          this.autorizaciones = Array.isArray(data?.autorizaciones)
            ? data.autorizaciones
            : [];

          // Mapear historial
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

          this.engine.setControlValue(
            'FechaServidor',
            this.appConfigService.getCurrentSettings().fechaServidor
          );



          this.engine.setControlValue(
            'CuotaActual',
            this.form.cuotaActual
          );






          this.applyFilter();

          // Labels del gráfico
          this.pieLabels = Array.isArray(data?.chart?.labels)
            ? data.chart.labels
            : [];

          const s = data?.chart?.series ?? {};

          // Series del gráfico
          this.pieSeries = [
            Number(s.ahorro ?? 0),
            Number(s.retiro ?? 0),
            Number(s.intereses ?? 0)
          ];

          // Dashboard
          this.dashboard = {
            ahorro: Number(s.ahorro ?? 0),
            deposito: Number(s.deposito ?? 0),
            intereses: Number(s.intereses ?? 0)
          };

          // Totales
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

  // Actualiza cuota actual según tipo
  updateCuotaActual(): void {
    this.form.cuotaActual = this.form.tipoCuenta === 'corriente'
      ? Number(this.cuotas.corriente ?? 0)
      : Number(this.cuotas.navideno ?? 0);


    if (this.form.tipoCuenta == 'corriente') {
      this.form.cuotaActual = Number(this.cuotas.corriente ?? 0);
    }
    else {
      this.form.cuotaActual = Number(this.cuotas.navideno ?? 0);
    }

  }

  // Calcula diferencia entre cuotas
  getDiferencia(): number {
    const cuotaActual = Number(this.form.cuotaActual ?? 0);
    const nuevaCuota = Number(this.form.nuevaCuota ?? 0);
    return Math.abs(nuevaCuota - cuotaActual);
  }

  // Formato de moneda
  formatCurrency(value?: number | null): string {
    const amount = Number(value ?? 0);
    return amount.toLocaleString('es-NI', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // Formato de fecha
  formatDate(value?: string | null): string {
    if (!value) return '-';

    const date = new Date(value);
    if (isNaN(date.getTime())) return '-';

    return date.toLocaleDateString('es-NI');
  }

  // Guardar
  onSave(): void {
    const ok = this.engine.validateAll?.();

    if (!ok) {
      this.notify.show?.(this.engine.getGroupedErrorsHtmlSnapshot?.(), '', 'warning');
      return;
    }

    const payload: SocioCambioCuota = {
      socioId: this.socioId,
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
        next: () => {
          this.loadData();
        },
        error: (err: any) => {
          this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
        }
      });
  }

  // Aprobar
  aprobar(id: string): void {
    if (!id) return;

    this.approvingId = id;

    this.service.approve(this.socioId, id)
      .pipe(finalize(() => (this.approvingId = null)))
      .subscribe({
        next: () => this.loadData(),
        error: (err: any) => {
          this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
        }
      });
  }

  // Cancelar
  onCancel(): void {
    this.router.navigate(['/socios']);
  }

  // Normaliza fecha
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

  // Filtro
  public applyFilter(): void {
    const term = this.historialCurrentTerm;

    this.historial = !term
      ? [...this.historialAll]
      : this.historialAll.filter((item) =>
        JSON.stringify(item).toLowerCase().includes(term)
      );

    this.historialCurrentPage = 1;
  }

  // Paginación
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

    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);

    if (current <= 3) return [1, 2, 3, '...', total];
    if (current >= total - 2) return [1, '...', total - 2, total - 1, total];

    return [1, '...', current - 1, current, current + 1, '...', total];
  }

  goToHistorialPage(page: number): void {
    if (page < 1 || page > this.historialTotalPages) return;
    this.historialCurrentPage = page;
  }

  // Label de tipo
  getTipoLabel(tipo: string): string {
    const t = (tipo || '').toLowerCase();

    if (t === 'incremento') return this.translate.instant('socioCambioCuota.options.incremento');
    if (t === 'disminucion') return this.translate.instant('socioCambioCuota.options.disminucion');

    return tipo;
  }

  // Clase CSS
  getTipoClass(tipo: string): string {
    const t = (tipo || '').toLowerCase();

    if (t === 'incremento') return 'badge-soft-success';
    if (t === 'disminucion') return 'badge-soft-danger';
    if (t.includes('afiliacion')) return 'badge-soft-primary';

    return 'badge-soft-secondary';
  }
}