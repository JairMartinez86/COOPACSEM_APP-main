import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
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
  AlertItem,
  PaginationMeta,
  PlanRow,
  ReportItem,
  SimpleMovimientoRow,
  SocioDetail,
  SocioRow,
  SummaryCard
} from '../interface/ahorro.models';
import { Subscription } from 'rxjs';



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
export class AhorroComponent implements OnInit {
  private readonly ahorroService = inject(AhorroService);
  private readonly translate = inject(TranslateService);
  private readonly notificationService = inject(NotificationService);
  private readonly subs = new Subscription();


  readonly pageSize = 20;
  loading = false;




  selectedSocioId: string | null = null;
  selectedSocio: SocioDetail | null = null;
  ahorroRows: SimpleMovimientoRow[] = [];
  retiroRows: SimpleMovimientoRow[] = [];
  depositoRows: SimpleMovimientoRow[] = [];
  solicitudRows: SimpleMovimientoRow[] = [];
  planesRows: PlanRow[] = [];
  alerts: AlertItem[] = [];

  breadcrumbs = [
    { label: '', url: '/' },
    { label: '' }
  ];

  cards: SummaryCard[] = [];
  actions: ActionItem[] = [
  { icon: 'fa-regular fa-hand-holding-heart', titleKey: 'ahorro.actions.newSaving', accent: 'green', order: 1 },
  { icon: 'fa-regular fa-gift', titleKey: 'ahorro.actions.viewChristmasPlan', accent: 'amber', order: 2 },

  { icon: 'fa-solid fa-arrow-down', titleKey: 'ahorro.actions.newDeposit', accent: 'blue', order: 3 },
  { icon: 'fa-solid fa-arrow-up', titleKey: 'ahorro.actions.newWithdrawal', accent: 'violet', order: 4 },

  { icon: 'fa-solid fa-arrow-trend-up', titleKey: 'ahorro.actions.increaseInstallment', accent: 'teal', order: 5 },
  { icon: 'fa-solid fa-arrow-trend-down', titleKey: 'ahorro.actions.decreaseInstallment', accent: 'orange', order: 6 },

  
  { icon: 'fa-solid fa-print', titleKey: 'ahorro.actions.printReport', accent: 'cyan', order: 7 },
  { icon: 'fa-regular fa-file-excel', titleKey: 'ahorro.actions.exportExcel', accent: 'emerald', order: 8 },
];

// ordenar
get orderedActions() {
  return [...this.actions].sort((a, b) => a.order - b.order);
}

  reports: ReportItem[] = [
    { titleKey: 'ahorro.reports.movementsBySocio.title', subtitleKey: 'ahorro.reports.movementsBySocio.subtitle' },
    { titleKey: 'ahorro.reports.savingSummary.title', subtitleKey: 'ahorro.reports.savingSummary.subtitle' },
    { titleKey: 'ahorro.reports.pendingRequests.title', subtitleKey: 'ahorro.reports.pendingRequests.subtitle' },
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
        this.breadcrumbs =
          this.breadcrumbs = this.translate.instant('ahorro.breadcrumbs') || [];
      })
    );

    this.loadDashboard(1);
  }

  onFiltersChange(filters: { search: string; tipoCuenta: string; estado: string }): void {
    this.filters = filters;
    this.selectedSocioId = null;
    this.clearDetail();
    this.loadDashboard(1);
  }

  onPageChange(page: number): void {
    this.selectedSocioId = null;
    this.clearDetail();
    this.loadDashboard(page);
  }

  onSelectSocio(row: SocioRow): void {
    this.selectedSocioId = row.id;
    this.loadSocioDetail(row.id);
  }

  private loadDashboard(page = 1): void {
    this.loading = true;

    this.ahorroService.getDashboard({
      page,
      pageSize: this.pageSize,
      search: this.filters.search,
      tipoCuenta: this.filters.tipoCuenta,
      estado: this.filters.estado
    }).subscribe({
      next: (response) => {
        const data = response?.data;
        const summary = data?.summary;

        this.cards = [
          { icon: 'fa-regular fa-hand-holding-heart fa-2xl', titleKey: 'ahorro.summary.totalSaved.title', amount: Number(summary?.totalAhorrado ?? 0), subtitleKey: 'ahorro.summary.totalSaved.subtitle', accent: 'teal' },
          { icon: 'fa-solid fa-arrow-up-from-bracket fa-2xl', titleKey: 'ahorro.summary.totalWithdrawn.title', amount: Number(summary?.totalRetirado ?? 0), subtitleKey: 'ahorro.summary.totalWithdrawn.subtitle', accent: 'blue' },
          { icon: 'fa-solid fa-arrow-down fa-2xl', titleKey: 'ahorro.summary.totalDeposited.title', amount: Number(summary?.totalDepositado ?? 0), subtitleKey: 'ahorro.summary.totalDeposited.subtitle', accent: 'blue' },
          { icon: 'fa-regular fa-clipboard fa-2xl', titleKey: 'ahorro.summary.pendingRequests.title', amount: Number(summary?.solicitudesPendientes ?? 0), subtitleKey: 'ahorro.summary.pendingRequests.subtitle', accent: 'orange' },
        ];

        this.socioRows = data?.socios?.items ?? [];
        console.log(this.socioRows);
  
        const total = Number(data?.socios?.total ?? 0);
        const currentPage = Number(data?.socios?.page ?? page);
        const pageSize = Number(data?.socios?.pageSize ?? this.pageSize);
        const totalPages = Number(data?.socios?.totalPages ?? 0);
        const start = total === 0 ? 0 : ((currentPage - 1) * pageSize) + 1;
        const end = total === 0 ? 0 : Math.min(currentPage * pageSize, total);

        this.pagination = { page: currentPage, pageSize, total, totalPages, start, end };
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.notificationService.showFromApiResponse(error);
      }
    });
  }

  private loadSocioDetail(socioId: string): void {
    this.ahorroService.getSocioDetail(socioId, true).subscribe({
      next: (response) => {
        const data = response?.data;

        this.selectedSocio = data?.selectedSocio ?? null;
        this.ahorroRows = data?.detail?.ahorros ?? [];
        this.retiroRows = data?.detail?.retiros ?? [];
        this.depositoRows = data?.detail?.depositos ?? [];
        this.solicitudRows = data?.detail?.solicitudes ?? [];
        this.planesRows = data?.detail?.planes ?? [];
        this.alerts = data?.alerts ?? [];

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
    this.solicitudRows = [];
    this.planesRows = [];
    this.alerts = [];
  }

  
}