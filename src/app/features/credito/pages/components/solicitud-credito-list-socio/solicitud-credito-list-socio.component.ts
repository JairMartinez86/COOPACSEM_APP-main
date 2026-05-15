import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, forkJoin, Subscription } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { Breadcrumb } from '../../../../../shared/components/breadcrumb/breadcrumb';
import { AppPermissionDirective } from '../../../../../core/services/app-permission.directive';
import { NotificationService } from '../../../../../core/services/notification.service';
import { AppConfigService } from '../../../../../core/services/app-config.service';

import { SolicitudCreditoService } from '../../../services/solicitud-credito.service';
import { TableFilterService } from '../../../../../core/services/table-filter.service';
import { SolicitudCreditoSocioRow } from '../../../interface/solicitud-credito.interface';




interface ActionItem {
  icon: string;
  titleKey: string;
  order: number;
  class?: string;
}

@Component({
  selector: 'app-solicitud-credito-list-socio',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    Breadcrumb,
    AppPermissionDirective
  ],
  templateUrl: './solicitud-credito-list-socio.component.html',
  styleUrls: ['./solicitud-credito-list-socio.component.scss']
})
export class SolicitudCreditoListSocioComponent implements OnInit, OnDestroy {
  private readonly service = inject(SolicitudCreditoService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly filterSvc = inject(TableFilterService);

  public readonly appConfig = inject(AppConfigService);

  private readonly subs = new Subscription();
  private searchTimeout: any;
  private readonly filterKey = 'solicitud-credito-lista-socio';

  breadcrumbs: any[] = [];

  socios: SolicitudCreditoSocioRow[] = [];
  selectedSocio: SolicitudCreditoSocioRow | null = null;

  loading = false;

  search = '';
  tipoCuenta = '';
  estado = '';

  currentPage = 1;
  pageSize = 20;
  totalRecords = 0;

  readonly pageSizeOptions = [10, 20, 50, 100];
  actions: ActionItem[] = [
    {
      icon: 'fa-solid fa-handshake',
      titleKey: 'solicitudCreditoListSocio.actions.newRequest',
      order: 1,
      class: 'is-success'
    },
    {
      icon: 'bi bi-cash-stack',
      titleKey: 'solicitudCreditoListSocio.actions.refinancing',
      order: 2,
      class: 'is-info'
    }
  ];

  ngOnInit(): void {
    this.setBreadcrumbs();

    this.subs.add(
      this.filterSvc.draft$(this.filterKey).subscribe((draft: string) => {
        const value = String(draft ?? '');

        if (this.search !== value) {
          this.search = value;
        }
      })
    );

    this.subs.add(
      this.filterSvc.query$(this.filterKey).subscribe((query: string) => {
        this.search = String(query ?? '').trim();
      })
    );
    this.subs.add(
      this.translate.onLangChange.subscribe(() => {
        this.setBreadcrumbs();
      })
    );

    this.loadData();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();

    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }

  private setBreadcrumbs(): void {
    this.breadcrumbs = this.translate.instant('solicitudCreditoListSocio.breadcrumbs') || [];
  }

  loadData(): void {

    this.loading = true;

    //const start = performance.now();

    this.service.getAll(
      this.currentPage,
      this.pageSize,
      this.search,
      this.tipoCuenta,
      this.estado,
    )
      .pipe(finalize(() => {
        this.loading = false;

        /* const end = performance.now();
         console.log(`Socios request: ${(end - start).toFixed(2)} ms`);*/
      }))
      .subscribe({
        next: (res: any) => {
          const data = res?.data ?? {};
          const raw = Array.isArray(data?.items) ? data.items : [];

          this.socios = raw.map((item: any) => this.normalizeSocio(item));
          this.totalRecords = Number(data?.totalRecords ?? 0);

          if (!this.socios.length) {
            this.selectedSocio = null;
            return;
          }

          if (!this.selectedSocio) {
            this.selectedSocio = this.socios[0];
            return;
          }

          const selected = this.socios.find(x => x.id === this.selectedSocio?.id);
          this.selectedSocio = selected ?? this.socios[0];
        },
        error: (err: any) => {
          this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
        }
      });
  }
  selectSocio(item: SolicitudCreditoSocioRow): void {
    if (item.alerts?.count > 0) {
      const type =
        item.alerts.highestSeverity === 'danger'
          ? 'error'
          : item.alerts.highestSeverity === 'warning'
            ? 'warning'
            : 'info';

      const observables = item.alerts.items.map(alert =>
        this.translate.get(alert.messageKey, alert.params ?? {})
      );

      this.translate.get('alerts.common.title').subscribe(title => {
        if (observables.length === 0) {
          this.notify.show('', title, type);
          return;
        }

        forkJoin(observables).subscribe(messages => {
          this.notify.show(messages.join('\n'), title, type);
        });
      });
    }

    this.selectedSocio = item;
  }

  onSearchInputChange(): void {
    clearTimeout(this.searchTimeout);

    this.filterSvc.setDraft(this.filterKey, this.search);

    this.searchTimeout = setTimeout(() => {
      this.currentPage = 1;
      this.loadData();
    }, 400);
  }

  onSearchKeyup(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      clearTimeout(this.searchTimeout);

      this.filterSvc.setDraft(this.filterKey, this.search);
      this.filterSvc.setQuery(this.filterKey, this.search);

      this.currentPage = 1;
      this.loadData();
    }
  }

  onTipoCuentaChange(): void {
    this.currentPage = 1;
    this.loadData();
  }

  onEstadoChange(): void {
    this.currentPage = 1;
    this.loadData();
  }

  clearFilters(): void {
    this.search = '';
    this.tipoCuenta = '';
    this.estado = '';
    this.currentPage = 1;

    this.filterSvc.clear(this.filterKey);

    this.loadData();
  }

  onActionClick(action: ActionItem): void {


    if (!this.selectedSocio) {

      this.notify.show(
        this.translate.instant('solicitudCreditoListSocio.messages.selectSocio'),
        '',
        'warning'
      );
      return;
    }


    if (this.selectedSocio?.ahorroDisponible == 0) {
      this.notify.show(
        this.translate.instant('solicitudCreditoListSocio.messages.ahorroInsuficiente'),
        '',
        'warning'
      );
      return;
    }


    if (action.order === 1) {
      this.router.navigate([
        '/solicitud-credito/new',
        this.selectedSocio.id,
        "credito"
      ]);
    }

    if (action.order === 2) {
      this.router.navigate([
        '/solicitud-credito/new',
        this.selectedSocio.id,
        "refinanciamiento"
      ]);
    }


  }

  get orderedActions(): ActionItem[] {
    return [...this.actions].sort((a, b) => a.order - b.order);
  }

  get totalPages(): number {
    return this.totalRecords > 0
      ? Math.ceil(this.totalRecords / this.pageSize)
      : 0;
  }

  get visibleStart(): number {
    if (!this.totalRecords) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get visibleEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalRecords);
  }

  get pageNumbers(): Array<number | string> {
    const total = this.totalPages;
    const current = this.currentPage;
    const pages: Array<number | string> = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
      return pages;
    }

    pages.push(1);

    if (current > 4) pages.push('...');

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (current < total - 3) {
      pages.push('...');
    }

    pages.push(total);

    return pages;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;

    this.currentPage = page;
    this.loadData();
  }

  changePageSize(value: number | string): void {
    const size = Number(value);

    if (!size || size === this.pageSize) {
      return;
    }

    this.pageSize = size;
    this.currentPage = 1;
    this.loadData();
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

  formatCurrency(value?: number | null): string {
    const amount = Number(value ?? 0);

    return amount.toLocaleString('es-NI', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  get currency(): string {
    return this.appConfig.getCurrentSettings()?.currency || 'C$';
  }

  private normalizeSocio(item: any): SolicitudCreditoSocioRow {
    return {
      id: item?.id ?? '',
      codigoSocio: item?.codigoSocio ?? '',
      nombreCompleto: item?.nombreCompleto ?? '',
      fechaIngreso: item?.fechaIngreso ?? null,
      estado: item?.estado ?? 'Inactivo',

      salarioMensual: Number(item?.salarioMensual ?? 0),
      ahorroDisponible: Number(item?.ahorroDisponible ?? item?.saldoActual ?? 0),
      creditosActivos: Number(item?.creditosActivos ?? 0),
      limiteCreditoDisponible: Number(item?.limiteCreditoDisponible ?? 0),

      cuentas: {
        corriente: !!item?.cuentas?.corriente,
        navidena: !!item?.cuentas?.navidena
      },

      alerts: item?.alerts ?? {
        count: 0,
        hasAlerts: false,
        isExpired: false,
        highestSeverity: 'info',
        items: []
      }
    };
  }

  getAvatarStyle(): Record<string, string> {
    if (this.isDarkTheme()) {
      return {};
    }

    return {
      background: '#1e3a8a',
      color: '#ffffff',
      border: '1px solid #1d4ed8'
    };
  }

  isDarkTheme(): boolean {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  getInitials(value: string | null | undefined): string {
    if (!value) {
      return 'SO';
    }

    const parts = value.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }

    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }
}