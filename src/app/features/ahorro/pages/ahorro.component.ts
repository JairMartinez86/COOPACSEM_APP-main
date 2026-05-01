import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AhorroFiltersComponent } from './components/ahorro-filters/ahorro-filters.component';
import { AhorroSidePanelComponent } from './components/ahorro-side-panel/ahorro-side-panel.component';
import { AhorroSocioResumenComponent } from './components/ahorro-socio-resumen/ahorro-socio-resumen.component';
import { AhorroSummaryCardsComponent } from './components/ahorro-summary-cards/ahorro-summary-cards.component';
import { SociosTableComponent } from './components/tables/socios-table/socios-table.component';
import { Breadcrumb } from '../../../shared/components/breadcrumb/breadcrumb';
import { AhorroService } from '../services/ahorro.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  ActionItem,
  AfiliacionMembresiaRow,
  SocioAlerts,
  PaginationMeta,
  PlanRow,
  ReportItem,
  SimpleMovimientoRow,
  SocioDetail,
  SocioRow,
  SummaryCard,
  CambioCuotaRow
} from '../interface/ahorro.models';
import { Subscription, Subject, of, timer } from 'rxjs';
import { switchMap, finalize } from 'rxjs/operators';

@Component({
  selector: 'app-ahorro',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    AhorroSummaryCardsComponent,
    AhorroFiltersComponent,
    SociosTableComponent,
    AhorroSidePanelComponent,
    AhorroSocioResumenComponent,
    Breadcrumb
  ],
  templateUrl: './ahorro.component.html',
  styleUrl: './ahorro.component.scss',
})
export class AhorroComponent implements OnInit, OnDestroy {
  private readonly ahorroService = inject(AhorroService);
  private readonly translate = inject(TranslateService);
  private readonly notificationService = inject(NotificationService);
  private readonly subs = new Subscription();

  private readonly dashboardReload$ = new Subject<{ page: number; debounce: boolean }>();

  readonly pageSize = 20;
  loading = false;
  detailLoading = false;

  selectedSocioId: string | null = null;
  selectedSocio: SocioDetail | null = null;
  ahorroRows: SimpleMovimientoRow[] = [];
  retiroRows: SimpleMovimientoRow[] = [];
  depositoRows: SimpleMovimientoRow[] = [];
  cambioCuotaRows: CambioCuotaRow[] = [];
  solicitudRows: SimpleMovimientoRow[] = [];
  planesRows: PlanRow[] = [];
  afiliacionMembresiaRows: AfiliacionMembresiaRow[] = [];
  alerts: SocioAlerts | null = null;

  breadcrumbs = [
    { label: '', url: '/' },
    { label: '' }
  ];

  cards: SummaryCard[] = [];
  actions: ActionItem[] = [
    { icon: 'fa-regular fa-hand-holding-heart', titleKey: 'ahorro.actions.newSaving', accent: 'green', order: 1 },
    { icon: 'fa-duotone fa-light fa-file-invoice-dollar', titleKey: 'ahorro.actions.affiliation', accent: 'amber', order: 2 },
    { icon: 'fa-solid fa-arrow-down', titleKey: 'ahorro.actions.newDeposit', accent: 'blue', order: 3 },
    { icon: 'fa-solid fa-arrow-up', titleKey: 'ahorro.actions.newWithdrawal', accent: 'violet', order: 4 },
    { icon: 'fa-solid fa-arrow-trend-up', titleKey: 'ahorro.actions.increaseInstallment', accent: 'teal', order: 5 },
    { icon: 'fa-solid fa-arrow-trend-down', titleKey: 'ahorro.actions.decreaseInstallment', accent: 'orange', order: 6 },
    { icon: 'fa-solid fa-print', titleKey: 'ahorro.actions.printReport', accent: 'cyan', order: 7 },
    { icon: 'fa-regular fa-file-excel', titleKey: 'ahorro.actions.exportExcel', accent: 'emerald', order: 8 },
  ];

  get orderedActions() {
    return [...this.actions].sort((a, b) => a.order - b.order);
  }


    reports: any[] = [
        {
            titleKey: 'estadoCuentaLista.reports.saldosAhorroActual.title',
            subtitleKey: 'estadoCuentaLista.reports.saldosAhorroActual.subtitle',
            type: 'saldosAhorroActual'
        },
        {
            titleKey: 'estadoCuentaLista.reports.saldosHistoricosAhorro.title',
            subtitleKey: 'estadoCuentaLista.reports.saldosHistoricosAhorro.subtitle',
            type: 'saldosHistoricosAhorro'
        },
        {
            titleKey: 'estadoCuentaLista.reports.integracionAhorro.title',
            subtitleKey: 'estadoCuentaLista.reports.integracionAhorro.subtitle',
            type: 'integracionAhorro'
        },
        {
            titleKey: 'estadoCuentaLista.reports.saldosAfiliacion.title',
            subtitleKey: 'estadoCuentaLista.reports.saldosAfiliacion.subtitle',
            type: 'saldosAfiliacion'
        },
        {
            titleKey: 'estadoCuentaLista.reports.deduccionesAfiliacion.title',
            subtitleKey: 'estadoCuentaLista.reports.deduccionesAfiliacion.subtitle',
            type: 'deduccionesAfiliacion'
        }
    ];

  socioRows: SocioRow[] = [];
  pagination: PaginationMeta = {
    page: 1,
    pageSize: this.pageSize,
    total: 0,
    totalPages: 0,
    start: 0,
    end: 0
  };

  detailRenderKey = 0;

  filters = {
    search: '',
    tipoCuenta: '',
    estado: ''
  };

  ngOnInit(): void {
    this.breadcrumbs = this.translate.instant('ahorro.breadcrumbs') || [];

    this.subs.add(
      this.translate.onLangChange.subscribe(() => {
        this.breadcrumbs = this.translate.instant('ahorro.breadcrumbs') || [];
      })
    );

    this.subs.add(
      this.dashboardReload$
        .pipe(
          switchMap(({ page, debounce }) => {
            this.loading = true;

            const wait$ = debounce ? timer(300) : of(0);

            return wait$.pipe(
              switchMap(() =>
                this.ahorroService.getDashboard({
                  page,
                  pageSize: this.pageSize,
                  search: this.filters.search,
                  tipoCuenta: this.filters.tipoCuenta,
                  estado: this.filters.estado
                })
              ),
              finalize(() => {
                this.loading = false;
              })
            );
          })
        )
        .subscribe({
          next: (response) => {
            const data = response?.data;
            const summary = data?.summary;

            this.cards = [
              {
                icon: 'fa-regular fa-hand-holding-heart fa-2xl',
                titleKey: 'ahorro.summary.totalSaved.title',
                amount: Number(summary?.totalAhorrado ?? 0),
                subtitleKey: 'ahorro.summary.totalSaved.subtitle',
                accent: 'teal'
              },
              {
                icon: 'fa-solid fa-arrow-up-from-bracket fa-2xl',
                titleKey: 'ahorro.summary.totalWithdrawn.title',
                amount: Number(summary?.totalRetirado ?? 0),
                subtitleKey: 'ahorro.summary.totalWithdrawn.subtitle',
                accent: 'blue'
              },
              {
                icon: 'fa-solid fa-arrow-down fa-2xl',
                titleKey: 'ahorro.summary.totalDeposited.title',
                amount: Number(summary?.totalDepositado ?? 0),
                subtitleKey: 'ahorro.summary.totalDeposited.subtitle',
                accent: 'blue'
              },
              {
                icon: 'fa-regular fa-clipboard fa-2xl',
                titleKey: 'ahorro.summary.pendingRequests.title',
                amount: Number(summary?.solicitudesPendientes ?? 0),
                subtitleKey: 'ahorro.summary.pendingRequests.subtitle',
                accent: 'orange'
              },
            ];

            this.socioRows = data?.socios?.items ?? [];

            const total = Number(data?.socios?.total ?? 0);
            const currentPage = Number(data?.socios?.page ?? 1);
            const pageSize = Number(data?.socios?.pageSize ?? this.pageSize);
            const totalPages = Number(data?.socios?.totalPages ?? 0);
            const start = total === 0 ? 0 : ((currentPage - 1) * pageSize) + 1;
            const end = total === 0 ? 0 : Math.min(currentPage * pageSize, total);

            this.pagination = { page: currentPage, pageSize, total, totalPages, start, end };
          },
          error: (error) => {
            this.notificationService.showFromApiResponse(error);
          }
        })
    );

    this.loadDashboard(1, false);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.dashboardReload$.complete();
  }

  onFiltersChange(filters: { search: string; tipoCuenta: string; estado: string }): void {
    this.filters = filters;
    this.selectedSocioId = null;
    this.clearDetail();
    this.loadDashboard(1, true);
  }

  onPageChange(page: number): void {
    this.selectedSocioId = null;
    this.clearDetail();
    this.loadDashboard(page, false);
  }

  onSelectSocio(row: SocioRow): void {
    this.selectedSocioId = row.id;
    this.loadSocioDetail(row.id);
  }

  private loadDashboard(page = 1, debounce = false): void {
    this.dashboardReload$.next({ page, debounce });
  }

  private loadSocioDetail(socioId: string): void {
    this.detailLoading = true;

    this.ahorroService.getSocioDetail(socioId, true)
      .pipe(finalize(() => {
        this.detailLoading = false;
      }))
      .subscribe({
        next: (response) => {
          const data = response?.data;

          this.selectedSocio = data?.selectedSocio ?? null;
          this.ahorroRows = data?.detail?.ahorros ?? [];
          this.retiroRows = data?.detail?.retiros ?? [];
          this.depositoRows = data?.detail?.depositos ?? [];
          this.cambioCuotaRows = data?.detail?.cambiosCuota ?? [];
          this.solicitudRows = data?.detail?.solicitudes ?? [];
          this.planesRows = data?.detail?.planes ?? [];
          this.afiliacionMembresiaRows = data?.detail?.afiliacionMembresia ?? [];
          this.alerts = data?.alerts ?? null;
        },
        error: (error) => {
          this.notificationService.showFromApiResponse(error);
        }
      });
  }

 private clearDetail(): void {
  this.selectedSocio = null;
  this.ahorroRows = [];
  this.retiroRows = [];
  this.depositoRows = [];
  this.cambioCuotaRows = [];
  this.solicitudRows = [];
  this.afiliacionMembresiaRows = [];
  this.planesRows = [];
  this.alerts = null;
}
}