import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize, Subscription } from 'rxjs';

import { Breadcrumb } from '../../../../../shared/components/breadcrumb/breadcrumb';
import { PagoInteresesService } from '../../../services/pago-intereses.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { AppConfigService } from '../../../../../core/services/app-config.service';
import { TableFilterService } from '../../../../../core/services/table-filter.service';

type TipoInteresFiltro = '' | 'Corriente' | 'Navidena';
type EstadoSocioFiltro = '' | 'Activo' | 'Inactivo';

@Component({
    selector: 'app-pago-intereses',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule, Breadcrumb],
    templateUrl: './pago-intereses.component.html',
    styleUrls: ['./pago-intereses.component.scss']
})
export class PagoInteresesComponent implements OnInit, OnDestroy {

    private readonly service = inject(PagoInteresesService);
    private readonly notify = inject(NotificationService);
    private readonly translate = inject(TranslateService);
    private readonly route = inject(ActivatedRoute);
    private readonly filterSvc = inject(TableFilterService);
    private readonly router = inject(Router);
    public readonly appConfig = inject(AppConfigService);

    private readonly subs = new Subscription();

    breadcrumbs: any[] = [];

    loading = false;
    processing = false;

    anio = new Date().getFullYear();

    totalRecords = 0;
    totalPages = 0;

    pageSizeOptions = [10, 20, 50, 100];

    private filterKey = 'pago-intereses';
    currentTerm = '';

    sortColumn = 'nombreCompleto';
    sortDirection: 'asc' | 'desc' = 'asc';

    filtro = {
        corte: 'Q1-2026',
        fechaCorte: '',
        tipoInteres: '' as TipoInteresFiltro,
        estadoSocio: '' as EstadoSocioFiltro,
        incluirCapitaliza: true,
        search: '',
        page: 1,
        pageSize: 10
    };

    resumen = {
        totalSocios: 0,
        totalIntereses: 0,
        totalPagar: 0,
        sociosPagar: 0,
        totalTrasladar: 0,
        sociosTrasladar: 0,
        fechaCalculo: ''
    };

    rows: any[] = [];

    ngOnInit(): void {
        this.setBreadcrumbs();

        this.subs.add(
            this.translate.onLangChange.subscribe(() => {
                this.setBreadcrumbs();
            })
        );

        this.filterKey =
            this.route.snapshot.data['tableFilterKey'] ?? 'pago-intereses';

        this.subs.add(
            this.filterSvc.query$(this.filterKey).subscribe(query => {
                this.currentTerm = (query || '').trim();
                this.filtro.search = this.currentTerm;
                this.filtro.page = 1;
                this.loadData();
            })
        );

        const fechaServidor = this.appConfig.getCurrentSettings().fechaServidor;
        const fecha = fechaServidor ? new Date(fechaServidor) : new Date();

        this.anio = fecha.getFullYear();
        this.filtro.corte = this.getCorteActual(fecha);
        this.filtro.fechaCorte = this.getFechaCortePorCorte(this.filtro.corte);

        this.loadData();
    }

    ngOnDestroy(): void {
        this.subs.unsubscribe();
    }

    setBreadcrumbs(): void {
        this.breadcrumbs =
            this.translate.instant('pagoIntereses.breadcrumbs') || [];
    }

    loadData(): void {
        this.loading = true;
        this.filtro.search = this.currentTerm;

        this.service.getResumen(this.filtro)
            .pipe(finalize(() => this.loading = false))
            .subscribe({
                next: (res: any) => {
                    const data = res?.data ?? res ?? {};

                    this.resumen = data?.summary ?? this.resumen;
                    this.rows = (data?.items ?? []).map((x: any) => ({
                        ...x,
                        pendienteCorriente: Number(x.pendienteCorriente ?? 0),
                        pendienteNavidena: Number(x.pendienteNavidena ?? 0),
                        interesPendiente: Number(x.interesPendiente ?? 0),
                        montoPagar: Number(x.montoPagar ?? 0),
                        montoTrasladar: Number(x.montoTrasladar ?? 0),
                        capitalizaAhorro: !!x.capitalizaAhorro
                    }));

                    this.applySorting();

                    this.filtro.page = Number(data?.page ?? this.filtro.page);
                    this.filtro.pageSize = Number(data?.pageSize ?? this.filtro.pageSize);

                    this.totalRecords = Number(data?.totalRecords ?? 0);
                    this.totalPages = Number(data?.totalPages ?? 0);
                },
                error: (err) => {
                    this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
                }
            });
    }

    buscar(): void {
        this.filtro.page = 1;
        this.loadData();
    }

    limpiar(): void {
        this.filtro.tipoInteres = '';
        this.filtro.estadoSocio = '';
        this.filtro.incluirCapitaliza = true;
        this.filtro.page = 1;
        this.loadData();
    }

    onCorteChange(): void {
        this.filtro.fechaCorte = this.getFechaCortePorCorte(this.filtro.corte);
        this.buscar();
    }

    onFechaCorteChange(): void {
        this.filtro.page = 1;
        this.loadData();
    }

    procesarPago(): void {
        this.processing = true;

        this.service.procesarPago(this.filtro)
            .pipe(finalize(() => this.processing = false))
            .subscribe({
                next: () => {
                    this.notify.show(
                        this.translate.instant('pagoIntereses.messages.processSuccess'),
                        '',
                        'success'
                    );

                    this.loadData();
                },
                error: (err) => {
                    this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
                }
            });
    }

    exportar(): void {
        this.service.exportar(this.filtro, 'excel')
            .subscribe({
                error: (err) => {
                    this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
                }
            });
    }

    cambiarPageSize(): void {
        this.filtro.page = 1;
        this.loadData();
    }

    cambiarPagina(page: number): void {
        if (page < 1 || page > this.totalPages || page === this.filtro.page) {
            return;
        }

        this.filtro.page = page;
        this.loadData();
    }

    get paginas(): number[] {
        const total = this.totalPages || 1;
        const current = this.filtro.page || 1;
        const pages: number[] = [];

        const start = Math.max(1, current - 2);
        const end = Math.min(total, current + 2);

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        return pages;
    }

    ver(row: any): void {
        if (!row?.socioId) {
            return;
        }

        this.router.navigate([
            '/estado-cuenta-intereses',
            row.socioId,
            'detalle'
        ]);
    }

    estadoBadgeClass(activo: boolean): string {
        return activo ? 'badge-soft-success' : 'badge-soft-secondary';
    }

    get currency(): string {
        return this.appConfig.getCurrentSettings().currency || 'C$';
    }

    formatCurrency(value?: number | null): string {
        return `${this.currency} ${this.formatAmount(value)}`;
    }

    formatAmount(value?: number | null): string {
        return Number(value ?? 0).toLocaleString('es-NI', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    formatDate(value?: string | Date | null): string {
        if (!value) return '-';

        const date = value instanceof Date
            ? value
            : new Date(value);

        if (isNaN(date.getTime())) return '-';

        const format =
            this.appConfig.getCurrentSettings().dateFormat || 'dd/MM/yyyy';

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear());

        return format
            .replace('dd', day)
            .replace('MM', month)
            .replace('yyyy', year)
            .replace('YYYY', year);
    }

    private getCorteActual(fecha: Date): string {
        const mes = fecha.getMonth() + 1;

        if (mes <= 3) return 'Q1-2026';
        if (mes <= 6) return 'Q2-2026';
        if (mes <= 9) return 'Q3-2026';

        return 'Q4-2026';
    }

    private getFechaCortePorCorte(corte: string): string {
        switch (corte) {
            case 'Q1-2026':
                return `${this.anio}-03-31`;

            case 'Q2-2026':
                return `${this.anio}-06-30`;

            case 'Q3-2026':
                return `${this.anio}-09-30`;

            case 'Q4-2026':
                return `${this.anio}-12-31`;

            default:
                return this.toDateInputValue(new Date());
        }
    }

    private toDateInputValue(date: Date): string {
        const fixed = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        return fixed.toISOString().substring(0, 10);
    }

    buscarDesdeFiltro(): void {
        this.currentTerm = (this.currentTerm || '').trim();

        this.filtro.search = this.currentTerm;
        this.filtro.page = 1;

        this.loadData();
    }



    recalcularResumen(): void {
        this.resumen.totalPagar = this.rows.reduce(
            (sum, x) => sum + Number(x.montoPagar ?? 0),
            0
        );

        this.resumen.totalTrasladar = this.rows.reduce(
            (sum, x) => sum + Number(x.montoTrasladar ?? 0),
            0
        );

        this.resumen.sociosPagar = this.rows.filter(
            x => Number(x.montoPagar ?? 0) > 0
        ).length;

        this.resumen.sociosTrasladar = this.rows.filter(
            x => Number(x.montoTrasladar ?? 0) > 0
        ).length;
    }

    debeBloquearCapitaliza(row: any): boolean {
        return Number(row.interesPendiente ?? 0) <= 100;
    }

    toggleCapitaliza(row: any): void {

        const pendiente = Number(row.interesPendiente ?? 0);


        if (pendiente <= 100) {
            return;
        }

        row.capitalizaAhorro = !row.capitalizaAhorro;

        if (row.capitalizaAhorro) {

            row.montoPagar = 0;
            row.montoTrasladar = pendiente;

        } else {

            row.montoPagar = pendiente;
            row.montoTrasladar = 0;

        }

        this.recalcularResumen();
    }

    sortBy(column: string): void {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }

        this.applySorting();
    }

    applySorting(): void {
        this.rows = [...this.rows].sort((a, b) => {
            const aValue = this.getSortValue(a, this.sortColumn);
            const bValue = this.getSortValue(b, this.sortColumn);

            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return this.sortDirection === 'asc'
                    ? aValue - bValue
                    : bValue - aValue;
            }

            return this.sortDirection === 'asc'
                ? String(aValue).localeCompare(String(bValue), 'es', { sensitivity: 'base' })
                : String(bValue).localeCompare(String(aValue), 'es', { sensitivity: 'base' });
        });
    }

    getSortValue(row: any, column: string): string | number {
        const value = row?.[column];

        if (
            column === 'pendienteCorriente' ||
            column === 'pendienteNavidena' ||
            column === 'interesPendiente' ||
            column === 'montoPagar' ||
            column === 'montoTrasladar'
        ) {
            return Number(value ?? 0);
        }

        if (column === 'activo') {
            return row.activo ? 1 : 0;
        }

        return String(value ?? '').trim();
    }

    sortIcon(column: string): string {
        if (this.sortColumn !== column) {
            return 'fa-solid fa-sort';
        }

        return this.sortDirection === 'asc'
            ? 'fa-solid fa-sort-up'
            : 'fa-solid fa-sort-down';
    }


}