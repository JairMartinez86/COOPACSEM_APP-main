import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize, Subscription } from 'rxjs';

import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexGrid,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  NgApexchartsModule
} from 'ng-apexcharts';

import { Breadcrumb } from '../../../../../shared/components/breadcrumb/breadcrumb';
import { AppConfigService } from '../../../../../core/services/app-config.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { TableFilterService } from '../../../../../core/services/table-filter.service';

import { CreditosActivosService } from '../../../services/creditos-activos.service';

import {
  CreditosActivosFiltro,
  CreditosActivosKpis,
  CreditosActivosGraficos,
  CreditoActivoItem,
  CreditoActivoDetalle
} from '../../../interface/creditos-activos.interface';
import { JMartAutoFocusNextDirective, JMartDateFormatDirective } from '@JairMartinez86/jmartinez-validator';
import { AppPermissionDirective } from '../../../../../core/services/app-permission.directive';

@Component({
  selector: 'app-creditos-activos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    NgApexchartsModule,
      JMartAutoFocusNextDirective,
        JMartDateFormatDirective,
    Breadcrumb
  ],
  templateUrl: './creditos-activos.component.html',
  styleUrls: ['./creditos-activos.component.scss']
})
export class CreditosActivosComponent implements OnInit, OnDestroy {
  private readonly service = inject(CreditosActivosService);
  private readonly translate = inject(TranslateService);
  private readonly notify = inject(NotificationService);
  private readonly filterSvc = inject(TableFilterService);

  public readonly appConfigService = inject(AppConfigService);

  private readonly subs = new Subscription();
  private readonly isBrowser: boolean;
  private searchTimeout: any;

  private readonly filterKey = 'creditos-activos';

  breadcrumbs: any[] = [];

  loading = false;
  loadingDetalle = false;

  filtro: CreditosActivosFiltro = {
    page: 1,
    pageSize: 10,
    search: '',
    fechaCorte: ''
  };

  pageSizeOptions = [10, 20, 50, 100];

  totalRecords = 0;
  totalPages = 0;

  kpis: CreditosActivosKpis = {
    totalCreditos: 0,
    creditosVigentes: 0,
    creditosVencidos: 0,
    creditosMora: 0,
    creditosProximosVencer: 0,
    carteraTotal: 0,
    carteraVigente: 0,
    carteraVencida: 0,
    carteraMora: 0,
    proximasAVencer: 0,
    porcentajeVigente: 0,
    porcentajeVencida: 0,
    porcentajeMora: 0
  };

  creditos: CreditoActivoItem[] = [];
  selectedCredito: CreditoActivoItem | null = null;
  detalle: CreditoActivoDetalle | null = null;

  carteraDistribucion: any = this.buildDonutChart([], [], []);
  tipoCreditoChart: any = this.buildDonutChart([], [], []);
  moraRangosChart: any = this.buildBarChart([], []);

  avanceCreditoChart = {
    series: [0] as ApexNonAxisChartSeries,
    chart: {
      type: 'radialBar',
      height: 125,
      sparkline: { enabled: true }
    } as ApexChart,
    colors: ['#22c55e'],
    labels: ['Avance'],
    plotOptions: {
      radialBar: {
        hollow: { size: '62%' },
        track: { background: '#e5e7eb' },
        dataLabels: {
          name: { show: false },
          value: {
            fontSize: '18px',
            fontWeight: 700,
            offsetY: 6,
            formatter: (value: number) => `${Math.round(value)}%`
          }
        }
      }
    } as ApexPlotOptions,
    dataLabels: { enabled: true } as ApexDataLabels
  };

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (!this.isBrowser) return;

    this.setBreadcrumbs();

        const fechaServidor =
            this.appConfigService.getCurrentSettings().fechaServidor;

        this.filtro.fechaCorte = fechaServidor
            ? this.formatDate(fechaServidor)
            : '';



    this.subs.add(
      this.translate.onLangChange.subscribe(() => {
        this.setBreadcrumbs();
        this.cargarGraficos(true);
      })
    );

    this.subs.add(
      this.filterSvc.draft$(this.filterKey).subscribe((draft: string) => {
        const value = String(draft ?? '');

        if (this.filtro.search !== value) {
          this.filtro.search = value;
        }
      })
    );

    this.subs.add(
      this.filterSvc.query$(this.filterKey).subscribe((query: string) => {
        const value = String(query ?? '').trim();

        this.filtro.search = value;
        this.filtro.page = 1;

        this.cargarTodo();
      })
    );

    this.cargarTodo();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();

    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }

  private setBreadcrumbs(): void {
    const value = this.translate.instant('creditosActivos.breadcrumbs');

    this.breadcrumbs = Array.isArray(value)
      ? value
      : [
          { label: this.translate.instant('creditosActivos.title') }
        ];
  }

  get settings(): any {
    return this.appConfigService.getCurrentSettings();
  }

  get currency(): string {
    return this.settings?.currency || 'C$';
  }

  get dateFormat(): string {
    return this.settings?.dateFormat || 'dd/MM/yyyy';
  }

  get paginas(): number[] {
    const total = this.totalPages;
    const actual = this.filtro.page;

    if (total <= 0) return [];

    if (total <= 5) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    let start = Math.max(1, actual - 2);
    let end = Math.min(total, actual + 2);

    if (actual <= 3) {
      start = 1;
      end = 5;
    }

    if (actual >= total - 2) {
      start = total - 4;
      end = total;
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  cargarTodo(): void {
    this.cargarKpis(true);
    this.cargarGraficos(true);
    this.cargarLista();
  }

  cargarKpis(skipLoader = false): void {
    this.service.getKpis(this.filtro, skipLoader)
      .subscribe({
        next: (res: any) => {
          this.kpis = res?.data ?? this.kpis;
        },
        error: (err: any) => {
          this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
        }
      });
  }

  cargarGraficos(skipLoader = false): void {
    this.service.getGraficos(this.filtro, skipLoader)
      .subscribe({
        next: (res: any) => {
          const data: CreditosActivosGraficos = res?.data ?? {
            distribucionCartera: [],
            moraRangos: [],
            tipoCredito: []
          };

          this.carteraDistribucion = this.buildDonutChart(
            data.distribucionCartera.map(x => Number(x.porcentaje ?? 0)),
            data.distribucionCartera.map(x => this.getGraficoEtiqueta(x.etiqueta)),
            data.distribucionCartera.map(x => Number(x.monto ?? 0)),
            ['#22c55e', '#f59e0b', '#ef4444']
          );

          this.moraRangosChart = this.buildBarChart(
            data.moraRangos.map(x => x.etiqueta),
            data.moraRangos.map(x => Number(x.monto ?? 0))
          );

          this.tipoCreditoChart = this.buildDonutChart(
            data.tipoCredito.map(x => Number(x.porcentaje ?? 0)),
            data.tipoCredito.map(x => x.etiqueta),
            data.tipoCredito.map(x => Number(x.monto ?? 0)),
            ['#2563eb', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4', '#64748b']
          );
        },
        error: (err: any) => {
          this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
        }
      });
  }

  cargarLista(): void {
    this.loading = true;

    this.service.getAll(this.filtro)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (res: any) => {
          const data = res?.data ?? res;

          this.creditos = data?.items ?? [];
          this.totalRecords = Number(data?.totalRecords ?? 0);
          this.totalPages = Number(data?.totalPages ?? 0);

          if (this.creditos.length > 0) {
            const selected = this.selectedCredito
              ? this.creditos.find(x => x.noCredito === this.selectedCredito?.noCredito)
              : null;

            this.seleccionarCredito(selected ?? this.creditos[0]);
          } else {
            this.selectedCredito = null;
            this.detalle = null;
            this.updateAvanceChart(0);
          }
        },
        error: (err: any) => {
          this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
        }
      });
  }

  seleccionarCredito(credito: CreditoActivoItem): void {
    this.selectedCredito = credito;
    this.cargarDetalle(credito.noCredito);
  }

  cargarDetalle(noCredito: string): void {
    this.loadingDetalle = true;

    this.service.getDetalle(noCredito, this.filtro, true)
      .pipe(finalize(() => this.loadingDetalle = false))
      .subscribe({
        next: (res: any) => {
          this.detalle = res?.data ?? null;
          this.updateAvanceChart(Number(this.detalle?.porcentajePagado ?? 0));
        },
        error: (err: any) => {
          this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
        }
      });
  }

  buscar(): void {
    this.filtro.page = 1;
    this.cargarTodo();
  }



  cambiarPageSize(): void {
    this.filtro.page = 1;
    this.cargarLista();
  }

  cambiarPagina(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.filtro.page) return;

    this.filtro.page = page;
    this.cargarLista();
  }

  onSearchInputChange(): void {
    clearTimeout(this.searchTimeout);

    const value = String(this.filtro.search ?? '');

    this.filterSvc.setDraft(this.filterKey, value);

    this.searchTimeout = setTimeout(() => {
      this.filtro.page = 1;
      this.cargarTodo();
    }, 400);
  }

  onSearchKeyup(event: KeyboardEvent): void {
    if (event.key !== 'Enter') return;

    clearTimeout(this.searchTimeout);

    const value = String(this.filtro.search ?? '').trim();

    this.filtro.search = value;
    this.filtro.page = 1;

    if (!value) {
      this.filterSvc.clear(this.filterKey);
      this.cargarTodo();
      return;
    }

    this.filterSvc.setDraft(this.filterKey, value);
    this.filterSvc.setQuery(this.filterKey, value);

    this.cargarTodo();
  }

  onFechaCorteChange(): void {
    this.filtro.page = 1;
    this.cargarTodo();
  }

  private updateAvanceChart(value: number): void {
    const avance = Math.min(Math.max(Number(value ?? 0), 0), 100);

    this.avanceCreditoChart = {
      ...this.avanceCreditoChart,
      series: [avance]
    };
  }

  private buildDonutChart(
    series: number[],
    labels: string[],
    amounts: number[],
    colors: string[] = []
  ): any {
    return {
      series: series as ApexNonAxisChartSeries,
      chart: {
        type: 'donut',
        height: 200
      } as ApexChart,
      labels,
      colors,
      legend: {
        show: true,
        position: 'right',
        fontSize: '11px',
        offsetY: 8,
        itemMargin: { vertical: 5 },
        formatter: (seriesName: string, opts: any) => {
          const amount = amounts[opts.seriesIndex] ?? 0;
          return `${seriesName}\n${this.formatMoney(amount)}`;
        }
      } as ApexLegend,
      dataLabels: { enabled: false } as ApexDataLabels,
      stroke: { width: 0 } as ApexStroke,
      tooltip: {
        theme: 'light',
        y: {
          formatter: (_value: number, opts: any) => {
            const amount = amounts[opts.seriesIndex] ?? 0;
            return this.formatMoney(amount);
          }
        }
      } as ApexTooltip,
      plotOptions: {
        pie: {
          donut: {
            size: '68%',
            labels: {
              show: true,
              total: {
                show: true,
                label: this.translate.instant('creditosActivos.charts.total'),
                formatter: () => this.formatCompactMoney(
                  amounts.reduce((sum, x) => sum + Number(x ?? 0), 0)
                )
              }
            }
          }
        }
      } as ApexPlotOptions
    };
  }

  private buildBarChart(categories: string[], values: number[]): any {
    return {
      series: [
        {
          name: this.translate.instant('creditosActivos.charts.amount'),
          data: values
        }
      ] as ApexAxisChartSeries,
      chart: {
        type: 'bar',
        height: 190,
        toolbar: { show: false }
      } as ApexChart,
      colors: ['#3b82f6'],
      plotOptions: {
        bar: {
          borderRadius: 5,
          columnWidth: '42%'
        }
      } as ApexPlotOptions,
      dataLabels: { enabled: false } as ApexDataLabels,
      xaxis: {
        categories,
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: {
          style: { fontSize: '10px' }
        }
      } as ApexXAxis,
      yaxis: {
        labels: {
          formatter: (value: number) => this.formatCompactMoney(value),
          style: { fontSize: '10px' }
        }
      } as ApexYAxis,
      grid: {
        borderColor: 'rgba(148,163,184,0.12)',
        strokeDashArray: 3
      } as ApexGrid,
      tooltip: {
        theme: 'light',
        y: {
          formatter: (value: number) => this.formatMoney(value)
        }
      } as ApexTooltip
    };
  }

  getEstadoBadgeClass(estado: string | null | undefined): string {
    const value = this.normalize(estado);

    if (value === 'vigente') return 'badge-soft-success';
    if (value === 'vencida' || value === 'vencido') return 'badge-soft-warning';
    if (value === 'mora') return 'badge-soft-danger';

    return 'badge-soft-secondary';
  }

  getEstadoTextoKey(estado: string | null | undefined): string {
    const value = this.normalize(estado);

    if (value === 'vigente') return 'creditosActivos.status.vigente';
    if (value === 'vencida' || value === 'vencido') return 'creditosActivos.status.vencida';
    if (value === 'mora') return 'creditosActivos.status.mora';

    return 'creditosActivos.status.unknown';
  }

  private getGraficoEtiqueta(etiqueta: string): string {
    const value = this.normalize(etiqueta);

    if (value === 'vigente') return this.translate.instant('creditosActivos.status.vigente');
    if (value === 'vencida' || value === 'vencido') return this.translate.instant('creditosActivos.status.vencida');
    if (value === 'mora') return this.translate.instant('creditosActivos.status.mora');

    return etiqueta;
  }

  formatCurrency(value: number | null | undefined): string {
    const n = Number(value ?? 0);

    return n.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  formatMoney(value: number | null | undefined): string {
    return `${this.currency} ${this.formatCurrency(Number(value ?? 0))}`;
  }

  formatCompactMoney(value: number | null | undefined): string {
    const n = Number(value ?? 0);

    if (n >= 1000000) return `${this.currency} ${(n / 1000000).toFixed(2)}M`;
    if (n >= 1000) return `${this.currency} ${(n / 1000).toFixed(0)}k`;

    return this.formatMoney(n);
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '-';

    const date = new Date(`${value}`.includes('T') ? value : `${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleDateString('es-NI', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  private toDateInput(value: string | Date): string {
    const date = value instanceof Date
      ? value
      : new Date(`${value}`.includes('T') ? value : `${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      const now = new Date();
      return this.toDateInput(now);
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private normalize(value: string | null | undefined): string {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '');
  }
}