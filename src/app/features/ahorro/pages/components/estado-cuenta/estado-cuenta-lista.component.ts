import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, forkJoin, Subscription } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { Breadcrumb } from '../../../../../shared/components/breadcrumb/breadcrumb';
import { AppPermissionDirective } from '../../../../../core/services/app-permission.directive';
import { NotificationService } from '../../../../../core/services/notification.service';
import { EstadoCuentaService } from '../../../services/estado.cuenta.service';
import { SocioAlerts } from '../../../../../shared/interfaces/alert.model';
import { AppConfigService } from '../../../../../core/services/app-config.service';
import { TableFilterService } from '../../../../../core/services/table-filter.service';

interface CuentaSocio {
    corriente: boolean;
    navidena: boolean;
}

interface EstadoCuentaSocioRow {
    id: string;
    codigoSocio: string;
    nombreCompleto: string;
    cuentas: CuentaSocio;
    fechaIngreso?: string | null;
    estado: string;
    alerts: SocioAlerts;
}

interface ActionItem {
    icon: string;
    titleKey: string;
    accent: 'green' | 'blue' | 'violet' | 'cyan' | 'amber' | 'emerald' | 'orange' | 'teal';
    order: number;
}

@Component({
    selector: 'app-estado-cuenta-lista',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        Breadcrumb,
        AppPermissionDirective
    ],
    templateUrl: './estado-cuenta-lista.component.html',
    styleUrls: ['./estado-cuenta-lista.component.scss']
})
export class EstadoCuentaListaComponent implements OnInit, OnDestroy {
    private readonly service = inject(EstadoCuentaService);
    private readonly notify = inject(NotificationService);
    private readonly router = inject(Router);
    private readonly translate = inject(TranslateService);
    public readonly appConfig = inject(AppConfigService);
    private readonly filterSvc = inject(TableFilterService);
    private readonly filterKey = 'estado-cuenta-lista';

    private readonly subs = new Subscription();
    private searchTimeout: any;

    breadcrumbs: any[] = [];

    socios: EstadoCuentaSocioRow[] = [];
    selectedSocio: EstadoCuentaSocioRow | null = null;


   

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
        icon: 'fa-solid fa-file-invoice',
        titleKey: 'estadoCuentaLista.actions.accountStatement',
        accent: 'green',
        order: 1
    },
    {
        icon: 'fa-solid fa-piggy-bank',
        titleKey: 'estadoCuentaLista.actions.interestAccountStatement',
        accent: 'violet',
        order: 2
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
      this.currentPage = 1;
      this.loadData();
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
        this.breadcrumbs = this.translate.instant('estadoCuentaLista.breadcrumbs') || [];
    }

    loadData(): void {
        this.loading = true;

        this.service.getAll(
            this.currentPage,
            this.pageSize,
            this.search,
            this.tipoCuenta,
            this.estado
        )
            .pipe(finalize(() => this.loading = false))
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

    selectSocio(item: EstadoCuentaSocioRow): void {
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

        this.searchTimeout = setTimeout(() => {
            this.currentPage = 1;
            this.loadData();
        }, 400);
    }

    onSearchKeyup(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            clearTimeout(this.searchTimeout);
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
        this.loadData();
    }

onActionClick(action: ActionItem): void {

    if (!this.selectedSocio) {

        this.notify.show(
            this.translate.instant('estadoCuentaLista.messages.selectSocio'),
            '',
            'warning'
        );

        return;
    }

    if (action.titleKey === 'estadoCuentaLista.actions.accountStatement') {

        this.router.navigate([
            '/estado-cuenta',
            this.selectedSocio.id,
            'detalle'
        ]);

        return;
    }

    if (action.titleKey === 'estadoCuentaLista.actions.interestAccountStatement') {

        this.router.navigate([
            '/estado-cuenta-intereses',
            this.selectedSocio.id,
            'detalle'
        ]);

        return;
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





    private normalizeSocio(item: any): EstadoCuentaSocioRow {
        return {
            id: item?.id ?? '',
            codigoSocio: item?.codigoSocio ?? '',
            nombreCompleto: item?.nombreCompleto ?? '',
            fechaIngreso: item?.fechaIngreso ?? null,
            estado: item?.estado ?? 'Inactivo',

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