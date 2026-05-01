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
import { JMartAutoFocusNextDirective } from '@JairMartinez86/jmartinez-validator';
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
        AppPermissionDirective,
        JMartAutoFocusNextDirective,
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

    tipoCuentaReporte: 'Corriente' | 'Navidena' | '' = '';
    reporteSeleccionado: any | null = null;
    modalReporteOpen = false;
    procesandoReporte = false;
    fechaInicioReporte: string | null = null;
    fechaFinReporte: string | null = null;
    estadoReporte: '' | 'Activo' | 'Inactivo' = '';
    anioReporte: number = 0;


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
        }
    ];

    ngOnInit(): void {
  this.setBreadcrumbs();
  this.anioReporte = new Date(this.appConfig.getCurrentSettings().fechaServidor).getFullYear();

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

    abrirModalReporte(report: any): void {
        this.reporteSeleccionado = report;
        this.tipoCuentaReporte = 'Corriente';
        this.estadoReporte = '';
        this.fechaInicioReporte = null;
        this.fechaFinReporte = null;


        if (report.type === 'saldosAhorroActual') {
            this.fechaFinReporte = this.getFechaHoy();
        }


        if (report.type === 'saldosHistoricosAhorro') {
            this.fechaInicioReporte = this.getPrimerDiaMesActual();
            this.fechaFinReporte = this.getFechaHoy();
        }


        if (report.type === 'saldosAfiliacion') {
            this.fechaFinReporte = this.getFechaHoy();
        }




        if (report.type === 'deduccionesAfiliacion') {
            this.fechaFinReporte = this.getFechaHoy();
        }









        this.modalReporteOpen = true;
        this.procesandoReporte = false;
    }



    cerrarModalReporte(): void {
        if (this.procesandoReporte) return;

        this.modalReporteOpen = false;
        this.reporteSeleccionado = null;
        this.tipoCuentaReporte = '';
    }

    procesarReporte(accion: 'print' | 'pdf' | 'excel'): void {
        if (!this.reporteSeleccionado || !this.tipoCuentaReporte) {
            return;
        }

        switch (this.reporteSeleccionado.type) {
            case 'saldosAhorroActual':
                this.procesarSaldosAhorroActual(accion);
                return;

            case 'saldosHistoricosAhorro':
                this.procesarSaldosHistoricosAhorro(accion);
                return;

            case 'integracionAhorro':
                this.procesarIntegracionAhorro(accion);

                return;

            case 'saldosAfiliacion':
                this.procesarSaldosAfiliacion(accion);
                return;

            case 'deduccionesAfiliacion':
                this.procesarPagosAfiliaciones(accion);

                return;

            default:
                this.notify.show(
                    this.translate.instant('estadoCuentaLista.exportModal.notImplemented'),
                    '',
                    'warning'
                );
                return;
        }



    }

    private procesarSaldosAhorroActual(accion: 'print' | 'pdf' | 'excel'): void {
        const formato: 'pdf' | 'excel' = accion === 'excel' ? 'excel' : 'pdf';

        this.procesandoReporte = true;

        this.service.getReporteSaldosAhorroActual(
            this.tipoCuentaReporte,
            formato,
            this.fechaInicioReporte,
            this.fechaFinReporte,
            this.estadoReporte
        )
            .pipe(finalize(() => this.procesandoReporte = false))
            .subscribe({
                next: (res: any) => {
                    const data = res?.data ?? {};
                    const archivo = data?.archivo ?? '';

                    const base = this.getNombreBaseReporte(this.reporteSeleccionado?.type);
                    const cuenta = this.getNombreTipoCuenta(this.tipoCuentaReporte);

                    if (accion === 'print') {
                        this.imprimirPdf(archivo);
                        return;
                    }

                    if (accion === 'pdf') {
                        this.descargarArchivo(
                            archivo,
                            this.getNombreArchivo(`${base} - ${cuenta}`, 'pdf'),
                            'application/pdf'
                        );
                        return;
                    }

                    if (accion === 'excel') {
                        this.descargarArchivo(
                            archivo,
                            this.getNombreArchivo(`${base} - ${cuenta}`, 'xlsx'),
                            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                        );
                    }
                },
                error: (err: any) => {
                    this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
                }
            });
    }


    private procesarSaldosHistoricosAhorro(accion: 'print' | 'pdf' | 'excel'): void {
        const formato: 'pdf' | 'excel' = accion === 'excel' ? 'excel' : 'pdf';

        this.procesandoReporte = true;

        this.service.getReporteSaldosHistoricosAhorro(
            this.tipoCuentaReporte,
            formato,
            this.fechaInicioReporte,
            this.fechaFinReporte,
            this.estadoReporte
        )
            .pipe(finalize(() => this.procesandoReporte = false))
            .subscribe({
                next: (res: any) => {
                    const data = res?.data ?? {};
                    const archivo = data?.archivo ?? '';

                    const base = this.getNombreBaseReporte(this.reporteSeleccionado?.type);
                    const cuenta = this.getNombreTipoCuenta(this.tipoCuentaReporte);

                    if (accion === 'print') {
                        this.imprimirPdf(archivo);
                        return;
                    }

                    if (accion === 'pdf') {
                        this.descargarArchivo(
                            archivo,
                            this.getNombreArchivo(`${base} - ${cuenta}`, 'pdf'),
                            'application/pdf'
                        );
                        return;
                    }

                    if (accion === 'excel') {
                        this.descargarArchivo(
                            archivo,
                            this.getNombreArchivo(`${base} - ${cuenta}`, 'xlsx'),
                            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                        );
                    }
                },
                error: (err: any) => {
                    this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
                }
            });
    }


    private procesarSaldosAfiliacion(accion: 'print' | 'pdf' | 'excel'): void {
        const formato: 'pdf' | 'excel' = accion === 'excel' ? 'excel' : 'pdf';

        this.procesandoReporte = true;

        this.service.getReporteAfiliacionMembresia(
            formato,
            this.fechaFinReporte,
            this.estadoReporte
        )
            .pipe(finalize(() => this.procesandoReporte = false))
            .subscribe({
                next: (res: any) => {
                    const data = res?.data ?? {};
                    const archivo = data?.archivo ?? '';

                    const base = this.getNombreBaseReporte('saldosAfiliacion');

                    if (accion === 'print') {
                        this.imprimirPdf(archivo);
                        return;
                    }

                    if (accion === 'pdf') {
                        this.descargarArchivo(
                            archivo,
                            this.getNombreArchivo(base, 'pdf'),
                            'application/pdf'
                        );
                        return;
                    }

                    if (accion === 'excel') {
                        this.descargarArchivo(
                            archivo,
                            this.getNombreArchivo(base, 'xlsx'),
                            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                        );
                    }
                },
                error: (err: any) => {
                    this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
                }
            });
    }



    private procesarPagosAfiliaciones(accion: 'print' | 'pdf' | 'excel'): void {
        const formato: 'pdf' | 'excel' = accion === 'excel' ? 'excel' : 'pdf';

        this.procesandoReporte = true;

        this.service.getReportePagosAfiliaciones(
            formato,
            this.fechaInicioReporte,
            this.fechaFinReporte,
            this.estadoReporte
        )
            .pipe(finalize(() => this.procesandoReporte = false))
            .subscribe({
                next: (res: any) => {
                    const data = res?.data ?? {};
                    const archivo = data?.archivo ?? '';

                    const base = this.getNombreBaseReporte('pagosAfiliaciones');

                    if (accion === 'print') {
                        this.imprimirPdf(archivo);
                        return;
                    }

                    if (accion === 'pdf') {
                        this.descargarArchivo(
                            archivo,
                            this.getNombreArchivo(base, 'pdf'),
                            'application/pdf'
                        );
                        return;
                    }

                    if (accion === 'excel') {
                        this.descargarArchivo(
                            archivo,
                            this.getNombreArchivo(base, 'xlsx'),
                            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                        );
                    }
                },
                error: (err: any) => {
                    this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
                }
            });
    }



    private procesarIntegracionAhorro(accion: 'print' | 'pdf' | 'excel'): void {
        const formato: 'pdf' | 'excel' = accion === 'excel' ? 'excel' : 'pdf';

        this.procesandoReporte = true;

        this.service.getReporteIntegracionAhorro(
            formato,
            this.anioReporte,
            this.tipoCuentaReporte,
            this.estadoReporte
        )
            .pipe(finalize(() => this.procesandoReporte = false))
            .subscribe({
                next: (res: any) => {
                    const data = res?.data ?? {};
                    const archivo = data?.archivo ?? '';

                    const base = this.getNombreBaseReporte('integracionAhorro');

                    if (accion === 'print') {
                        this.imprimirPdf(archivo);
                        return;
                    }

                    if (accion === 'pdf') {
                        this.descargarArchivo(
                            archivo,
                            this.getNombreArchivo(`${base} - ${this.anioReporte}`, 'pdf'),
                            'application/pdf'
                        );
                        return;
                    }

                    if (accion === 'excel') {
                        this.descargarArchivo(
                            archivo,
                            this.getNombreArchivo(`${base} - ${this.anioReporte}`, 'xlsx'),
                            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                        );
                    }
                },
                error: (err: any) => {
                    this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
                }
            });
    }


    private descargarArchivo(base64: string, fileName: string, mimeType: string): void {
        if (!base64) {
            this.notify.show(
                this.translate.instant('estadoCuentaLista.exportModal.fileNotAvailable'),
                '',
                'warning'
            );
            return;
        }

        const byteCharacters = atob(base64);
        const byteNumbers = Array.from(byteCharacters, c => c.charCodeAt(0));
        const byteArray = new Uint8Array(byteNumbers);

        const blob = new Blob([byteArray], { type: mimeType });
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();

        window.URL.revokeObjectURL(url);
    }

    private imprimirPdf(base64: string): void {
        if (!base64) {
            this.notify.show(
                this.translate.instant('estadoCuentaLista.exportModal.fileNotAvailable'),
                '',
                'warning'
            );
            return;
        }

        const byteCharacters = atob(base64);
        const byteNumbers = Array.from(byteCharacters, c => c.charCodeAt(0));
        const byteArray = new Uint8Array(byteNumbers);

        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);

        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;

        document.body.appendChild(iframe);

        iframe.onload = () => {
            setTimeout(() => {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();

                setTimeout(() => {
                    document.body.removeChild(iframe);
                    window.URL.revokeObjectURL(url);
                }, 1000);
            }, 500);
        };
    }

    private getNombreArchivo(base: string, extension: string): string {

        const cuenta = this.getNombreTipoCuenta(this.tipoCuentaReporte);

        const rango = this.getTextoRangoFechas();

        const estado = this.getTextoEstado();

        return `COOPACSEM - ${base} - ${cuenta} ${rango} ${estado}.${extension}`;
    }

    private getNombreBaseReporte(type: string): string {
        switch (type) {
            case 'saldosAhorroActual':
                return 'SALDO AHORROS';

            case 'saldosHistoricosAhorro':
                return 'SALDO AHORROS HISTORICO';

            case 'integracionAhorro':
                return 'INTEGRACION AHORROS';

            case 'saldosAfiliacion':
                return 'SALDOS AFILIACION';

            case 'deduccionesAfiliacion':
                return 'DEDUCCIONES AFILIACION';

            default:
                return 'REPORTE';
        }
    }

    private getNombreTipoCuenta(tipoCuenta: string): string {
        switch (tipoCuenta) {
            case 'Corriente':
                return 'CORRIENTE';

            case 'Navidena':
                return 'NAVIDENA';

            default:
                return 'TODOS';
        }
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

    private getTextoRangoFechas(): string {

        if (this.fechaInicioReporte && this.fechaFinReporte) {
            return `DEL ${this.formatFecha(this.fechaInicioReporte)} AL ${this.formatFecha(this.fechaFinReporte)}`;
        }

        if (this.fechaInicioReporte) {
            return `DEL ${this.formatFecha(this.fechaInicioReporte)}`;
        }

        if (this.fechaFinReporte) {
            return `FECHA CORTE ${this.formatFecha(this.fechaFinReporte)}`;
        }

        return `AL ${this.appConfig.getCurrentSettings().fechaServidor}`;
    }

    private getTextoEstado(): string {

        if (this.estadoReporte === 'Activo') {
            return 'ACTIVOS';
        }

        if (this.estadoReporte === 'Inactivo') {
            return 'INACTIVOS';
        }

        return 'TODOS';
    }

    private formatFecha(fecha: string): string {
        const d = new Date(fecha);
        return d.toLocaleDateString('es-NI');
    }


    private getFechaHoy(): string {
        return this.appConfig.getCurrentSettings().fechaServidor;
    }

    private getPrimerDiaMesActual(): string {
        const fecha = new Date();
        return this.formatDateInput(new Date(fecha.getFullYear(), fecha.getMonth(), 1));
    }

    private formatDateInput(fecha: Date): string {
        const year = fecha.getFullYear();
        const month = String(fecha.getMonth() + 1).padStart(2, '0');
        const day = String(fecha.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    }


    get aniosReporte(): number[] {
        const actual = new Date(this.appConfig.getCurrentSettings().fechaServidor).getFullYear();
        const anios: number[] = [];

        for (let y = actual; y >= 2000; y--) {
            anios.push(y);
        }

        return anios;
    }

    get esIntegracionAhorro(): boolean {
        return this.reporteSeleccionado?.type === 'integracionAhorro';
    }

}