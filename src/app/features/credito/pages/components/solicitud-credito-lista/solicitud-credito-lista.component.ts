import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, Inject, OnDestroy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize, Subscription } from 'rxjs';

import { Breadcrumb } from '../../../../../shared/components/breadcrumb/breadcrumb';
import { NotificationService } from '../../../../../core/services/notification.service';
import { AppConfigService } from '../../../../../core/services/app-config.service';

import { SolicitudCreditoListaService } from '../../../services/solicitud-credito-lista.service';
import {
    SolicitudCreditoListaFiltro,
    SolicitudCreditoListaItem
} from '../../../interface/solicitud-credito-lista.interface';
import { JMartAutoFocusNextDirective, JMartDateFormatDirective, JMartMassiveValidationService } from '@JairMartinez86/jmartinez-validator';
import { TableFilterService } from '../../../../../core/services/table-filter.service';
import { AppPermissionDirective } from '../../../../../core/services/app-permission.directive';

@Component({
    selector: 'app-solicitud-credito-lista',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        JMartAutoFocusNextDirective,
        JMartDateFormatDirective,
        AppPermissionDirective,
        Breadcrumb
    ],
    templateUrl: './solicitud-credito-lista.component.html',
    styleUrl: './solicitud-credito-lista.component.scss'
})
export class SolicitudCreditoListaComponent implements OnInit, OnDestroy {
    private readonly service = inject(SolicitudCreditoListaService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly translate = inject(TranslateService);
    private readonly notify = inject(NotificationService);
    private cdr = inject(ChangeDetectorRef);

    public readonly appConfigService = inject(AppConfigService);
    private readonly filterSvc = inject(TableFilterService);
    private searchTimeout: any;
    private readonly filterKey = 'aprobaciones-credito-lista';



    private readonly subs = new Subscription();
    private readonly isBrowser: boolean;

    readonly permissionRoute = '/aprobaciones-credito';

    breadcrumbs: any[] = [];
    autorizadores: any[] = [];

    loading = false;
    processing = false;
    fechaServidor: any;
    approvalPanelHidden = false;

    items: SolicitudCreditoListaItem[] = [];
    solicitudSeleccionada: SolicitudCreditoListaItem | null = null;
    solicitudFlujoSeleccionada: SolicitudCreditoListaItem | null = null;

    modo: 'registros' | 'aprobaciones' = 'registros';

    modalAprobacionOpen = false;
    accionModal: 'aprobar' | 'rechazar' | 'desembolsar' = 'aprobar';
    comentarioAccion = '';



    filtro: SolicitudCreditoListaFiltro = {
        page: 1,
        pageSize: 10,
        search: '',
        estado: '',
        etapa: '',
        fechaInicio: '',
        fechaFin: ''
    };

    totalRecords = 0;
    totalPages = 0;

    pageSizeOptions = [10, 20, 50, 100];

    estados = [
        { value: '', labelKey: 'solicitudCreditoLista.filters.todos' },
        { value: 'Borrador', labelKey: 'solicitudCreditoLista.status.borrador' },
        { value: 'EnEvaluacion', labelKey: 'solicitudCreditoLista.status.enEvaluacion' },
        { value: 'TramitePago', labelKey: 'solicitudCreditoLista.status.tramitePago' },
        { value: 'Completado', labelKey: 'solicitudCreditoLista.status.completado' },
        { value: 'Denegada', labelKey: 'solicitudCreditoLista.status.denegada' },
        { value: 'Anulado', labelKey: 'solicitudCreditoLista.status.anulado' }
    ];

    etapas = [
        { value: '', labelKey: 'solicitudCreditoLista.filters.todas' },
        { value: 'COMITE_CREDITO_1', labelKey: 'solicitudCreditoLista.approval.comiteCredito1' },
        { value: 'COMITE_CREDITO_2', labelKey: 'solicitudCreditoLista.approval.comiteCredito2' },
        { value: 'COMITE_VIGILANCIA', labelKey: 'solicitudCreditoLista.approval.comiteVigilancia' },
        { value: 'VICEPRESIDENTE', labelKey: 'solicitudCreditoLista.approval.vicepresidente' },
        { value: 'PRESIDENTE', labelKey: 'solicitudCreditoLista.approval.presidente' },
        { value: 'DESEMBOLSO', labelKey: 'solicitudCreditoLista.approval.desembolso' }
    ];

    constructor(@Inject(PLATFORM_ID) platformId: object) {
        this.isBrowser = isPlatformBrowser(platformId);
    }

ngOnInit(): void {
    if (!this.isBrowser) return;

    this.modo = this.route.snapshot.data['modo'] === 'aprobaciones'
        ? 'aprobaciones'
        : 'registros';

    this.setBreadcrumbs();

    this.subs.add(
        this.translate.onLangChange.subscribe(() => this.setBreadcrumbs())
    );

    const fechaServidor =
        this.appConfigService.getCurrentSettings().fechaServidor;

    this.fechaServidor = new Date(fechaServidor);

    this.filtro.fechaFin = fechaServidor
        ? this.formatDate(fechaServidor)
        : '';

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
        })
    );

    this.cargarSolicitudes();
}

    ngOnDestroy(): void {
        this.subs.unsubscribe();

        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
    }

    get esModoAprobacion(): boolean {
        return this.modo === 'aprobaciones';
    }

    get esModoRegistro(): boolean {
        return this.modo === 'registros';
    }


    private setBreadcrumbs(): void {
        const key = this.esModoAprobacion
            ? 'solicitudCreditoLista.breadcrumbs'
            : 'solicitudCreditoLista.breadcrumbs2';

        const value = this.translate.instant(key);


        this.breadcrumbs = value

    }

    get settings(): any {
        return this.appConfigService.getCurrentSettings();
    }

    get currency(): string {
        return this.settings?.currency || 'C$';
    }

cargarSolicitudes(): void {

    this.loading = true;

    //const start = performance.now();

    this.filtro.modo = this.modo;

    const filtro = {
        ...this.filtro,

        fechaInicio: this.formatDateApi(this.filtro.fechaInicio),
        fechaFin: this.formatDateApi(this.filtro.fechaFin)
    };

    this.service.getAll(filtro)
        .pipe(finalize(() => {

            this.loading = false;
            this.cdr.markForCheck();

          /*  const end = performance.now();

            console.log(
                `SolicitudCredito request: ${(end - start).toFixed(2)} ms`
            );*/

        }))
        .subscribe({
            next: (res: any) => {

                const data = res?.data ?? res;

                this.items = (data?.items ?? []).map((x: SolicitudCreditoListaItem) => ({
                    ...x,
                    aprobaciones: x.aprobaciones ?? []
                }));

                this.totalRecords = Number(data?.totalRecords ?? 0);
                this.totalPages = Number(data?.totalPages ?? 0);
                this.autorizadores = data?.autorizadores ?? [];

                if (this.items.length > 0) {

                    const selected = this.items.find(
                        x => x.id === this.solicitudFlujoSeleccionada?.id
                    );

                    this.solicitudFlujoSeleccionada =
                        selected ?? this.items[0];

                } else {

                    this.solicitudFlujoSeleccionada = null;
                }
            },
            error: (err: any) => {
                this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
            }
        });
}
    buscar(): void {
        this.filtro.page = 1;
        this.cargarSolicitudes();
    }

    limpiarFiltros(): void {

        const fechaServidor = this.appConfigService.getCurrentSettings().fechaServidor;

        this.filtro.page = 1;
        this.filtro.pageSize = 10;
        this.filtro.search = '';
        this.filtro.estado = '';
        this.filtro.etapa = '';
        this.filtro.fechaInicio = '';
        this.filtro.modo = this.modo;
        this.filtro.fechaFin = fechaServidor ? this.formatDate(fechaServidor) : '';



        this.cargarSolicitudes();
    }


    cambiarPageSize(): void {
        this.filtro.page = 1;
        this.cargarSolicitudes();
    }

    cambiarPagina(page: number): void {
        if (page < 1 || page > this.totalPages || page === this.filtro.page) return;

        this.filtro.page = page;
        this.cargarSolicitudes();
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

    nuevaSolicitud(): void {
        this.router.navigate(['/solicitud-credito']);
    }

    verDetalle(row: SolicitudCreditoListaItem): void {

        const tipoSolicitud =
            row.tipoCredito?.toLowerCase().includes('refinanciamiento')
                ? 'refinanciamiento'
                : 'credito';

        this.router.navigate([
            '/solicitud-credito/view',
            row.socioId,
            row.id,
            tipoSolicitud
        ]);
    }



    editar(row: SolicitudCreditoListaItem): void {

        const tipoSolicitud =
            row.tipoCredito?.toLowerCase().includes('refinanciamiento')
                ? 'refinanciamiento'
                : 'credito';

        this.router.navigate([
            '/solicitud-credito/edit',
            row.socioId,
            row.id,
            tipoSolicitud
        ]);
    }


    seleccionarSolicitudFlujo(row: SolicitudCreditoListaItem): void {
        this.solicitudFlujoSeleccionada = row;
    }

    esSolicitudSeleccionada(row: SolicitudCreditoListaItem): boolean {
        return this.solicitudFlujoSeleccionada?.id === row.id;
    }

    get aprobacionesFlujoSeleccionado(): any[] {
        return this.solicitudFlujoSeleccionada?.aprobaciones ?? [];
    }

    abrirModalAccion(
        row: SolicitudCreditoListaItem,
        accion: 'aprobar' | 'rechazar' | 'desembolsar'
    ): void {
        this.solicitudSeleccionada = row;
        this.solicitudFlujoSeleccionada = row;
        this.accionModal = accion;
        this.comentarioAccion = '';
        this.modalAprobacionOpen = true;
    }

    cerrarModalAccion(): void {
        this.modalAprobacionOpen = false;
        this.solicitudSeleccionada = null;
        this.comentarioAccion = '';
    }

    confirmarAccion(): void {
        if (!this.solicitudSeleccionada) return;

        const row = this.solicitudSeleccionada;

        this.processing = true;

        const request = {
            solicitudId: row.id,
            etapa: row.etapaActual,
            comentario: this.comentarioAccion
        };

        const obs$ =
            this.accionModal === 'aprobar'
                ? this.service.aprobar(request)
                : this.accionModal === 'rechazar'
                    ? this.service.rechazar(request)
                    : this.service.desembolsar(row.id, this.comentarioAccion);

        obs$
            .pipe(finalize(() => { this.processing = false; this.cdr.markForCheck(); }))
            .subscribe({
                next: (res: any) => {
                    this.notify.showFromApiResponse?.(res, 'success');
                    this.cerrarModalAccion();
                    this.cargarSolicitudes();
                },
                error: (err: any) => {
                    this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
                }
            });
    }

    getEstadoTexto(estado: string): string {
        const value = this.normalize(estado);

        if (value === 'borrador') return this.translate.instant('solicitudCreditoLista.status.borrador');
        if (value === 'enevaluacion') return this.translate.instant('solicitudCreditoLista.status.enEvaluacion');
        if (value === 'tramitepago') return this.translate.instant('solicitudCreditoLista.status.tramitePago');
        if (value === 'completado') return this.translate.instant('solicitudCreditoLista.status.completado');
        if (value === 'denegada') return this.translate.instant('solicitudCreditoLista.status.denegada');
        if (value === 'anulado') return this.translate.instant('solicitudCreditoLista.status.anulado');

        return estado || '-';
    }

    getEstadoAprobacionTexto(estado: string): string {
        const value = this.normalize(estado);

        if (value === 'aprobado') return this.translate.instant('solicitudCreditoLista.status.aprobado');
        if (value === 'rechazado') return this.translate.instant('solicitudCreditoLista.status.rechazado');
        if (value === 'anulado') return this.translate.instant('solicitudCreditoLista.status.anulado');
        if (value === 'denegada') return this.translate.instant('solicitudCreditoLista.status.denegada');
        if (value === 'pendiente') return this.translate.instant('solicitudCreditoLista.status.pendiente');

        return estado || '-';
    }

    estadoBadgeClass(estado: string): string {
        const value = this.normalize(estado);

        if (value === 'borrador') return 'badge-soft-secondary';
        if (value === 'enevaluacion') return 'badge-soft-warning';
        if (value === 'tramitepago') return 'badge-soft-primary';
        if (value === 'completado') return 'badge-soft-success';
        if (value === 'denegada') return 'badge-soft-danger';
        if (value === 'anulado') return 'badge-soft-danger';



        return 'badge-soft-secondary';
    }

    aprobacionBadgeClass(estado: string): string {
        const value = this.normalize(estado);

        if (value === 'aprobado') return 'badge-soft-success';
        if (value === 'rechazado') return 'badge-soft-danger';
        if (value === 'anulado') return 'badge-soft-danger';
        if (value === 'pendiente') return 'badge-soft-warning';

        return 'badge-soft-secondary';
    }




    puedeMostrarAprobar(row: SolicitudCreditoListaItem): boolean {
        return !!row.puedeAprobar;
    }

    puedeMostrarDesembolsar(row: SolicitudCreditoListaItem): boolean {
        return !!row.puedeDesembolsar;
    }







    modalTitleKey(): string {
        if (this.accionModal === 'aprobar') return 'solicitudCreditoLista.modal.aprobarTitle';
        if (this.accionModal === 'rechazar') return 'solicitudCreditoLista.modal.rechazarTitle';
        return 'solicitudCreditoLista.modal.desembolsarTitle';
    }

    modalButtonClass(): string {
        if (this.accionModal === 'rechazar') return 'btn btn-danger';
        if (this.accionModal === 'desembolsar') return 'btn btn-primary';
        return 'btn btn-success';
    }

    modalButtonKey(): string {
        if (this.accionModal === 'aprobar') return 'solicitudCreditoLista.actions.aprobar';
        if (this.accionModal === 'rechazar') return 'solicitudCreditoLista.actions.rechazar';
        return 'solicitudCreditoLista.actions.desembolsar';
    }

    formatCurrency(value: number | null | undefined): string {
        const n = Number(value ?? 0);

        return n.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
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

    formatDateTime(value: string | null | undefined): string {
        if (!value) return '-';

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return String(value);

        return date.toLocaleString('es-NI', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }




    getStepClass(ap: any): string {
        const estado = this.normalize(ap.estado);

        if (estado === 'aprobado') return 'step-success';
        if (estado === 'rechazado' || estado === 'anulado') return 'step-danger';
        if (ap.actual || estado === 'pendiente') return 'step-warning';

        return 'step-pending';
    }

    private normalize(value: string | null | undefined): string {
        return String(value ?? '')
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '');
    }

    getStepProgressClass(ap: any, index: number): string {
        const estado = this.normalize(ap.estado);

        if (estado === 'aprobado') return 'completed';
        if (estado === 'rechazado' || estado === 'anulado') return 'error';

        const firstPendingIndex = this.aprobacionesFlujoSeleccionado.findIndex(x =>
            this.normalize(x.estado) === 'pendiente'
        );

        if (estado === 'pendiente' && index === firstPendingIndex) {
            return 'active';
        }

        return '';
    }






    isStepActualPendiente(ap: any, index: number): boolean {
        const estado = this.normalize(ap.estado);

        if (estado !== 'pendiente') {
            return false;
        }

        const firstPendingIndex = this.aprobacionesFlujoSeleccionado.findIndex(x =>
            this.normalize(x.estado) === 'pendiente'
        );

        return index === firstPendingIndex;
    }




    isStepCompleted(index: number): boolean {
        const item = this.aprobacionesFlujoSeleccionado[index];
        return this.normalize(item?.estado) === 'aprobado';
    }

    getStepProgressIcon(ap: any, index: number): string {
        const estado = this.normalize(ap.estado);

        if (estado === 'aprobado') return 'bi-check';

        if (this.isStepActualPendiente(ap, index)) {
            return 'bi-clock';
        }

        return 'bi-circle';
    }

    isStepRejected(index: number): boolean {
        const item = this.aprobacionesFlujoSeleccionado[index];
        const estado = this.normalize(item?.estado);

        return estado === 'rechazado' || estado === 'anulado';
    }





    private aprobacionEstado(row: SolicitudCreditoListaItem, codigo: string): string {
        const item = (row.aprobaciones ?? []).find(x =>
            this.normalize(x.codigo) === this.normalize(codigo)
        );

        return this.normalize(item?.estado);
    }










    private estadoEsRojo(row: SolicitudCreditoListaItem): boolean {
        const estado = this.normalize(row.estado);

        return estado === 'denegada'
            || estado === 'anulado';
    }

    private todasAprobacionesAprobadas(row: SolicitudCreditoListaItem): boolean {
        return this.aprobacionEstado(row, 'COMITE_CREDITO_1') === 'aprobado'
            && this.aprobacionEstado(row, 'COMITE_CREDITO_2') === 'aprobado'
            && this.aprobacionEstado(row, 'COMITE_VIGILANCIA') === 'aprobado'
            && this.aprobacionEstado(row, 'VICEPRESIDENTE') === 'aprobado'
            && this.aprobacionEstado(row, 'PRESIDENTE') === 'aprobado';
    }

    private desembolsoPagado(row: SolicitudCreditoListaItem): boolean {
        return this.normalize(row.estadoDesembolso) === 'pagado';
    }

    getFlowProgress(row: SolicitudCreditoListaItem): number {

        const total = 5;
        let completadas = 0;

        if (this.aprobacionEstado(row, 'COMITE_CREDITO_1') === 'aprobado') completadas++;
        if (this.aprobacionEstado(row, 'COMITE_CREDITO_2') === 'aprobado') completadas++;
        if (this.aprobacionEstado(row, 'COMITE_VIGILANCIA') === 'aprobado') completadas++;
        if (this.aprobacionEstado(row, 'VICEPRESIDENTE') === 'aprobado') completadas++;
        if (this.aprobacionEstado(row, 'PRESIDENTE') === 'aprobado') completadas++;

        return Math.round((completadas / total) * 100);
    }

    progressClass(row: SolicitudCreditoListaItem): string {

        if (this.estadoEsRojo(row)) {
            return 'progress-danger';
        }

        if (
            this.todasAprobacionesAprobadas(row)
            && this.desembolsoPagado(row)
        ) {
            return 'progress-success';
        }

        return 'progress-warning';
    }

    etapaActualIconClass(row: SolicitudCreditoListaItem): string {

        if (this.estadoEsRojo(row)) {
            return 'fa-circle-xmark text-danger';
        }

        if (
            this.todasAprobacionesAprobadas(row)
            && this.desembolsoPagado(row)
        ) {
            return 'fa-circle-check text-success';
        }

        return 'fa-clock text-warning';
    }

    getFlowLineClass(): string {

        if (!this.solicitudFlujoSeleccionada) {
            return 'step-line-warning';
        }

        if (this.estadoEsRojo(this.solicitudFlujoSeleccionada)) {
            return 'step-line-danger';
        }

        if (
            this.todasAprobacionesAprobadas(this.solicitudFlujoSeleccionada)
            && this.desembolsoPagado(this.solicitudFlujoSeleccionada)
        ) {
            return 'step-line-success';
        }

        return 'step-line-warning';
    }

    onSearchInputChange(): void {
        clearTimeout(this.searchTimeout);

        const value = String(this.filtro.search ?? '');

        this.filterSvc.setDraft(this.filterKey, value);

        this.searchTimeout = setTimeout(() => {
            this.filtro.page = 1;
            this.cargarSolicitudes();
        }, 400);
    }



onSearchKeyup(event: KeyboardEvent): void {
    if (event.key !== 'Enter') return;

    clearTimeout(this.searchTimeout);

    const value = String(this.filtro.search ?? '').trim();

    this.filtro.search = value;
    this.filtro.page = 1;

    this.filterSvc.setDraft(this.filterKey, value);
    this.filterSvc.setQuery(this.filterKey, value);

    this.cargarSolicitudes();
}

    getAutorizadorCargo(codigo: string): string {

        const value = this.normalize(codigo);

        if (value === 'comite_credito_1') {
            return this.translate.instant(
                'solicitudCreditoLista.approval.comiteCredito1'
            );
        }

        if (value === 'comite_credito_2') {
            return this.translate.instant(
                'solicitudCreditoLista.approval.comiteCredito2'
            );
        }

        if (value === 'comite_vigilancia') {
            return this.translate.instant(
                'solicitudCreditoLista.approval.comiteVigilancia'
            );
        }

        if (value === 'vicepresidente') {
            return this.translate.instant(
                'solicitudCreditoLista.approval.vicepresidente'
            );
        }

        if (value === 'presidente') {
            return this.translate.instant(
                'solicitudCreditoLista.approval.presidente'
            );
        }

        return codigo;
    }


    private formatDateApi(value: string | Date | null | undefined): string {
        if (!value) return '';

        if (typeof value === 'string') {
            const raw = value.substring(0, 10);

            if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
                return raw;
            }

            const parts = raw.split('/');
            if (parts.length === 3) {
                const [dd, mm, yyyy] = parts;
                return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
            }
        }

        const date = value instanceof Date
            ? value
            : new Date(`${value}T00:00:00`);

        if (Number.isNaN(date.getTime())) return '';

        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');

        return `${yyyy}-${mm}-${dd}`;
    }


}