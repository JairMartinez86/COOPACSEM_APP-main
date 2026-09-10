import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize, Subscription } from 'rxjs';

import { Breadcrumb } from '../../../../../shared/components/breadcrumb/breadcrumb';
import { PagoInteresesService } from '../../../services/pago-intereses.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { AppConfigService } from '../../../../../core/services/app-config.service';
import { TableFilterService } from '../../../../../core/services/table-filter.service';
import { AppPermissionDirective } from '../../../../../core/services/app-permission.directive';

type TipoInteresFiltro = '' | 'Corriente' | 'Navidena';
type EstadoSocioFiltro = '' | 'Activo' | 'Inactivo';

declare const Choices: any;

@Component({
    selector: 'app-pago-intereses',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule, Breadcrumb, AppPermissionDirective],
    templateUrl: './pago-intereses.component.html',
    styleUrls: ['./pago-intereses.component.scss']
})
export class PagoInteresesComponent implements OnInit, OnDestroy {
    @ViewChild('corteSelect') corteSelectRef?: ElementRef<HTMLSelectElement>;


    private readonly service = inject(PagoInteresesService);
    private readonly notify = inject(NotificationService);
    private readonly translate = inject(TranslateService);
    private readonly route = inject(ActivatedRoute);
    private readonly filterSvc = inject(TableFilterService);
    private readonly router = inject(Router);
    public readonly appConfig = inject(AppConfigService);
    private cdr = inject(ChangeDetectorRef);

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
        fechaCalculo: '',
        ultimoPagoGenerado: ''
    };

    allRows: any[] = [];
    rows: any[] = [];

    corteChoices: any = null;

    cortes: { value: string, label: string }[] = [];

    pdf: string | null = null;
    excel: string | null = null;


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
                this.onSearchChange();
            })
        );

        const fechaServidor = this.appConfig.getCurrentSettings().fechaServidor;
        const fecha = fechaServidor ? new Date(fechaServidor) : new Date();

        this.anio = fecha.getFullYear();
        //this.filtro.corte = this.getCorteActual(fecha);
        this.filtro.fechaCorte = this.getFechaCortePorCorte(this.filtro.corte);

        this.generarCortes();

        setTimeout(() => {
            this.initCorteChoices();
        });


        this.loadData();
    }

    ngOnDestroy(): void {
        this.subs.unsubscribe();
    }

    private initCorteChoices(): void {
        this.initChoicesFromDom(

            this.corteSelectRef,
            this.filtro.corte,
            (instance) => (this.corteChoices = instance),
            this.corteChoices,
            9999
        );



    }

    private initChoicesFromDom(
        elementRef: ElementRef<HTMLSelectElement> | undefined,
        currentValue: string | null | undefined,
        assignInstance: (instance: any) => void,
        previousInstance?: any,
        searchResultLimit?: number
    ): void {
        const element = elementRef?.nativeElement;
        if (!element) return;

        try {
            previousInstance?.destroy();
        } catch { }

        this.removeOrphanChoicesWrapper(element);

        const instance = new Choices(element, {
            searchEnabled: true,
            searchChoices: true,
            searchFloor: 0,
            searchResultLimit: searchResultLimit ?? 9999,
            shouldSort: false,
            allowHTML: false,
            itemSelectText: '',
            placeholder: true,
            placeholderValue: this.translate.instant('pagoIntereses.common.selectOption'),
            searchPlaceholderValue: this.translate.instant('pagoIntereses.choices.searchPlaceholder') || 'Buscar...',
            noResultsText: this.translate.instant('pagoIntereses.choices.noResults') || 'No se encontraron resultados',
            noChoicesText: this.translate.instant('pagoIntereses.choices.noChoices') || 'No hay opciones disponibles',
            searchFields: ['label', 'value'],
            position: 'bottom',
            renderChoiceLimit: -1
        });

        assignInstance(instance);

        if (currentValue != null && currentValue !== '') {
            requestAnimationFrame(() => {
                this.setChoicesValue(instance, currentValue);
            });
        }
    }


    private removeOrphanChoicesWrapper(element: HTMLSelectElement): void {
        const nextSibling = element.nextElementSibling as HTMLElement | null;
        if (nextSibling?.classList.contains('choices')) {
            nextSibling.remove();
        }
    }


    private setChoicesValue(instance: any, value: string | null | undefined): void {
        if (!instance) return;

        try {
            if (value == null || value === '') {
                instance.removeActiveItems?.();

                const passedElement = instance.passedElement?.element as HTMLSelectElement | undefined;
                if (passedElement) {
                    passedElement.value = '';
                }
                return;
            }

            const choices = instance?._store?.choices ?? [];
            const exists = choices.some((c: any) => String(c.value) === String(value));

            if (!exists) {
                instance.removeActiveItems?.();
                return;
            }

            instance.removeActiveItems?.();
            instance.setChoiceByValue(String(value));
        } catch { }
    }


    setBreadcrumbs(): void {
        this.breadcrumbs =
            this.translate.instant('pagoIntereses.breadcrumbs') || [];
    }

    loadData(): void {
        this.loading = true;
        this.filtro.search = this.currentTerm;


        this.service.getResumen(this.filtro)
            .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
            .subscribe({
                next: (res: any) => {
                    const data = res?.data ?? res ?? {};

                    this.resumen = data?.summary ?? this.resumen;
                    this.allRows = data?.items
                    this.pdf = data?.pdf ?? res?.data?.pdf ?? null;
                    this.excel = data?.excel ?? res?.data?.excel ?? null;

                    this.applySorting();
                    this.applyFiltersAndPaging();
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

        const data = this.allRows
            .filter(x => x.interesPendiente > 0)
            .map(x => ({
                codSocio: x.codigoSocio,
                capitalizaAhorro: x.capitalizaAhorro,
                cuentaTraslado: x.cuentaTraslado,
                fechaTrimestre: x.fechaTrimestre
            }));



        this.service.procesarPago(data)
            .pipe(finalize(() => { this.processing = false; this.cdr.markForCheck(); }))
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
        this.applyFiltersAndPaging();
    }

    cambiarPagina(page: number): void {

        if (page < 1 || page > this.totalPages || page === this.filtro.page) return;

        this.filtro.page = page;

        this.applyFiltersAndPaging();
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

   /* private getCorteActual(fecha: Date): string {
        const mes = fecha.getMonth() + 1;

        if (mes <= 3) return 'Q1-2026';
        if (mes <= 6) return 'Q2-2026';
        if (mes <= 9) return 'Q3-2026';

        return 'Q4-2026';
    }*/
    private getFechaCortePorCorte(corte: string): string {

        if (!corte) {
            return this.toDateInputValue(new Date());
        }

        const match = corte.match(/^Q([1-4])-(\d{4})$/);

        if (!match) {
            return this.toDateInputValue(new Date());
        }

        const trimestre = Number(match[1]);
        const year = Number(match[2]);

        let month = 12;
        let day = 31;

        switch (trimestre) {
            case 1:
                month = 3;
                day = 31;
                break;
            case 2:
                month = 6;
                day = 30;
                break;
            case 3:
                month = 9;
                day = 30;
                break;
            case 4:
                month = 12;
                day = 31;
                break;
        }

        // ⚠️ JS month es 0-based
        const date = new Date(year, month - 1, day);

        return this.toDateInputValue(date);
    }

    private toDateInputValue(date: Date): string {
        const fixed = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        return fixed.toISOString().substring(0, 10);
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

        // SI CAPITALIZA
        if (row.capitalizaAhorro) {

            row.montoTrasladar = pendiente;
            row.montoPagar = 0;

            // cuenta por defecto
            row.cuentaTraslado = 'Corriente';
        }
        else {

            // vuelve a pago normal
            row.montoPagar = pendiente;
            row.montoTrasladar = 0;

            // limpiar cuenta traslado
            row.cuentaTraslado = null;
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
    getEstadoInteresClass(row: any): string {

        const interes = Number(row.interesPendiente ?? 0);

        // NEGATIVO
        if (interes < 0) {
            return 'estado-negativo';
        }

        // SIN INTERÉS
        if (interes === 0) {
            return 'estado-sin-interes';
        }

        // SI CAPITALIZA -> TRASLADAR (AMARILLO)
        if (row.capitalizaAhorro) {
            return 'estado-trasladar';
        }

        // MAYOR A 100 -> PAGAR (VERDE)
        if (interes > 100) {
            return 'estado-pagar';
        }

        // MENOR O IGUAL A 100 -> TRASLADAR
        return 'estado-trasladar';
    }


    recalcularResumen(): void {

        this.rows = this.rows.map(x => {

            const interes = Number(x.interesPendiente ?? 0);
            const capitaliza = !!x.capitalizaAhorro;

            return {
                ...x,

                montoPagar:
                    interes > 100 && !capitaliza
                        ? interes
                        : 0,

                montoTrasladar:
                    (
                        (interes > 0 && interes <= 100)
                        ||
                        (interes > 100 && capitaliza)
                    )
                        ? interes
                        : 0
            };
        });

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

    toggleCuentaTraslado(
        row: any,
        cuenta: 'Corriente' | 'Navidena'
    ): void {


        console.log('toggleCuentaTraslado', { row, cuenta });
        if (!row.cuentaTraslado) {
            return;
        }


        if (!row.cuentaNavidenaActiva
        ) {
            return;
        }



        if (cuenta == "Corriente") {
            cuenta = "Navidena";
        }
        else {
            cuenta = "Corriente";
        }



        row.cuentaTraslado = cuenta;

    }


    applyFiltersAndPaging(): void {

        // 🔥 SIEMPRE partir del dataset original
        let data = [...this.allRows];

        const term = (this.currentTerm || '').trim().toLowerCase();

        // 🔎 SEARCH (solo si tiene texto)
        if (term.length > 0) {
            data = data.filter(x =>
                (x.codigoSocio || '').toLowerCase().includes(term) ||
                (x.nombreCompleto || '').toLowerCase().includes(term) ||
                (x.identificacion || '').toLowerCase().includes(term)
            );
        }

        // 🔽 FILTRO TIPO INTERES
        if (this.filtro.tipoInteres) {
            data = data.filter(x =>
                this.filtro.tipoInteres === 'Corriente'
                    ? x.pendienteCorriente > 0
                    : x.pendienteNavidena > 0
            );
        }

        // 🔽 FILTRO ESTADO
        if (this.filtro.estadoSocio !== '') {
            const activo = this.filtro.estadoSocio === 'Activo';
            data = data.filter(x => x.activo === activo);
        }

        // 🔃 ordenar
        data = this.sortData(data);

        // 📄 paginación
        this.totalRecords = data.length;
        this.totalPages = Math.ceil(data.length / this.filtro.pageSize) || 1;

        const start = (this.filtro.page - 1) * this.filtro.pageSize;
        const end = start + this.filtro.pageSize;

        this.rows = data.slice(start, end);
    }

    onSearchChange(): void {
        this.filtro.page = 1;
        this.applyFiltersAndPaging();
    }

    onTipoInteresChange(): void {
        this.filtro.page = 1;
        this.applyFiltersAndPaging();
    }

    onEstadoChange(): void {
        this.filtro.page = 1;
        this.applyFiltersAndPaging();
    }


    sortData(data: any[]): any[] {
        return [...data].sort((a, b) => {
            const aValue = this.getSortValue(a, this.sortColumn);
            const bValue = this.getSortValue(b, this.sortColumn);

            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return this.sortDirection === 'asc'
                    ? aValue - bValue
                    : bValue - aValue;
            }

            return this.sortDirection === 'asc'
                ? String(aValue).localeCompare(String(bValue))
                : String(bValue).localeCompare(String(aValue));
        });
    }


    private generarCortes(): void {

        const fechaServidor = this.appConfig.getCurrentSettings().fechaServidor;
        const fecha = fechaServidor ? new Date(fechaServidor) : new Date();

        const currentYear = fecha.getFullYear();
        const currentMonth = fecha.getMonth() + 1;

        const trimestres = [
            { q: 4, key: 'q4', maxMonth: 12 },
            { q: 3, key: 'q3', maxMonth: 9 },
            { q: 2, key: 'q2', maxMonth: 6 },
            { q: 1, key: 'q1', maxMonth: 3 }
        ];

        const cortes: any[] = [];

        for (let year = currentYear; year >= 2000; year--) {

            for (const t of trimestres) {

                if (year === currentYear && currentMonth < (t.maxMonth - 2)) {
                    continue;
                }

                const label = this.translate.instant(`pagoIntereses.cutoffs.${t.key}`, {
                    anio: year
                });

                cortes.push({
                    value: `Q${t.q}-${year}`,
                    label,
                    year,
                    trimestre: t.q
                });
            }
        }

        this.cortes = cortes;
    }

    esTrimestreActual(corte: string): boolean {

        if (!corte) return false;

        const match = corte.match(/^Q([1-4])-(\d{4})$/);
        if (!match) return false;

        const trimestre = Number(match[1]);
        const year = Number(match[2]);

        // Fecha base
        const fechaBase = this.resumen.ultimoPagoGenerado
            ? new Date(this.resumen.ultimoPagoGenerado)
            : new Date(this.appConfig.getCurrentSettings().fechaServidor);

        // Calcular siguiente trimestre
        let siguienteTrimestre = 1;
        let siguienteYear = fechaBase.getFullYear();

        const month = fechaBase.getMonth() + 1;

        if (month <= 3) {
            siguienteTrimestre = 2;
        }
        else if (month <= 6) {
            siguienteTrimestre = 3;
        }
        else if (month <= 9) {
            siguienteTrimestre = 4;
        }
        else {
            siguienteTrimestre = 1;
            siguienteYear++;
        }

        return year === siguienteYear
            && trimestre === siguienteTrimestre;
    }











        descargarPdf(): void {
        this.descargarBase64(this.pdf, `${this.buildFileName()}.pdf`, 'application/pdf');
    }

    descargarExcel(): void {
        this.descargarBase64(
            this.excel,
            `${this.buildFileName()}.xlsx`,
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
    }

    imprimir(): void {
        if (!this.pdf) return;

        const blob = this.base64ToBlob(this.pdf, 'application/pdf');
        const url = window.URL.createObjectURL(blob);
        const win = window.open(url, '_blank');

        if (!win) return;

        win.onload = () => {
            win.focus();
            win.print();
        };
    }

    private buildFileName(): string {


        return `${this.appConfig.getCurrentSettings().companyName}_SALDO INTERESES AHORROS - TODOS AL ${this.filtro.corte}`;
    }

    private descargarBase64(base64: string | null | undefined, fileName: string, contentType: string): void {
        if (!base64) return;

        const blob = this.base64ToBlob(base64, contentType);
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        window.URL.revokeObjectURL(url);
    }

    private base64ToBlob(base64: string, contentType: string): Blob {
        const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
        const byteCharacters = atob(cleanBase64);
        const byteNumbers = new Array(byteCharacters.length);

        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }

        return new Blob([new Uint8Array(byteNumbers)], { type: contentType });
    }


}