import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize, Subscription } from 'rxjs';

import { Breadcrumb } from '../../../../../shared/components/breadcrumb/breadcrumb';
import { NotificationService } from '../../../../../core/services/notification.service';
import { AppConfigService } from '../../../../../core/services/app-config.service';

import { SolicitudCreditoListaService } from '../../../services/solicitud-credito-lista.service';
import {
    SolicitudCreditoListaFiltro,
    SolicitudCreditoListaItem,
    SolicitudCreditoListaResumen
} from '../../../interface/solicitud-credito-lista.interface';

@Component({
    selector: 'app-solicitud-credito-lista',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        Breadcrumb
    ],
    templateUrl: './solicitud-credito-lista.component.html',
    styleUrl: './solicitud-credito-lista.component.scss'
})
export class SolicitudCreditoListaComponent implements OnInit, OnDestroy {
    private readonly service = inject(SolicitudCreditoListaService);
    private readonly router = inject(Router);
    private readonly translate = inject(TranslateService);
    private readonly notify = inject(NotificationService);

    public readonly appConfigService = inject(AppConfigService);

    private readonly subs = new Subscription();
    private readonly isBrowser: boolean;

    readonly permissionRoute = '/aprobaciones-credito';

    breadcrumbs: any[] = [];

    loading = false;
    processing = false;

    items: SolicitudCreditoListaItem[] = [];
    solicitudSeleccionada: SolicitudCreditoListaItem | null = null;
    solicitudFlujoSeleccionada: SolicitudCreditoListaItem | null = null;

    modalAprobacionOpen = false;
    accionModal: 'aprobar' | 'rechazar' | 'desembolsar' = 'aprobar';
    comentarioAccion = '';

    resumen: SolicitudCreditoListaResumen = {
        totalSolicitudes: 0,
        borradores: 0,
        enEvaluacion: 0,
        completadas: 0,
        rechazadas: 0,
        desembolsadas: 0,
        pendientesAprobacion: 0
    };

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
        this.setBreadcrumbs();

        this.subs.add(
            this.translate.onLangChange.subscribe(() => this.setBreadcrumbs())
        );

        this.cargarSolicitudes();
    }

    ngOnDestroy(): void {
        this.subs.unsubscribe();
    }

    private setBreadcrumbs(): void {
        const value = this.translate.instant('solicitudCreditoLista.breadcrumbs');

        this.breadcrumbs = Array.isArray(value)
            ? value
            : [
                { label: 'Créditos' },
                { label: 'Aprobaciones de crédito' }
            ];
    }

    get settings(): any {
        return this.appConfigService.getCurrentSettings();
    }

    get currency(): string {
        return this.settings?.currency || 'C$';
    }

    cargarSolicitudes(): void {
        this.loading = true;

        this.service.getAll(this.filtro)
            .pipe(finalize(() => this.loading = false))
            .subscribe({
                next: (res: any) => {
                    const data = res?.data ?? res;

                    this.items = (data?.items ?? []).map((x: SolicitudCreditoListaItem) => ({
                        ...x,
                        aprobaciones: x.aprobaciones ?? []
                    }));

                    this.totalRecords = Number(data?.totalRecords ?? 0);
                    this.totalPages = Number(data?.totalPages ?? 0);

                    this.resumen = {
                        totalSolicitudes: Number(data?.resumen?.totalSolicitudes ?? 0),
                        borradores: Number(data?.resumen?.borradores ?? 0),
                        enEvaluacion: Number(data?.resumen?.enEvaluacion ?? 0),
                        completadas: Number(data?.resumen?.completadas ?? 0),
                        rechazadas: Number(data?.resumen?.rechazadas ?? 0),
                        desembolsadas: Number(data?.resumen?.desembolsadas ?? 0),
                        pendientesAprobacion: Number(data?.resumen?.pendientesAprobacion ?? 0)
                    };

                    if (this.items.length > 0) {
                        const selected = this.items.find(x => x.id === this.solicitudFlujoSeleccionada?.id);
                        this.solicitudFlujoSeleccionada = selected ?? this.items[0];
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
        this.filtro = {
            page: 1,
            pageSize: 10,
            search: '',
            estado: '',
            etapa: '',
            fechaInicio: '',
            fechaFin: ''
        };

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
        this.router.navigate([
            '/solicitud-credito/view',
            row.socioId,
            row.id
        ]);
    }

    editar(row: SolicitudCreditoListaItem): void {
        this.router.navigate([
            '/solicitud-credito/edit',
            row.socioId,
            row.id
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
            .pipe(finalize(() => this.processing = false))
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
        if (value === 'anulado') return this.translate.instant('solicitudCreditoLista.status.anulado');

        return estado || '-';
    }

    getEstadoAprobacionTexto(estado: string): string {
        const value = this.normalize(estado);

        if (value === 'aprobado') return this.translate.instant('solicitudCreditoLista.status.aprobado');
        if (value === 'rechazado') return this.translate.instant('solicitudCreditoLista.status.rechazado');
        if (value === 'anulado') return this.translate.instant('solicitudCreditoLista.status.anulado');
        if (value === 'pendiente') return this.translate.instant('solicitudCreditoLista.status.pendiente');

        return estado || '-';
    }

    estadoBadgeClass(estado: string): string {
        const value = this.normalize(estado);

        if (value === 'borrador') return 'badge-soft-secondary';
        if (value === 'enevaluacion') return 'badge-soft-warning';
        if (value === 'tramitepago') return 'badge-soft-primary';
        if (value === 'completado') return 'badge-soft-success';
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

    progressClass(row: SolicitudCreditoListaItem): string {
        const estado = this.normalize(row.estado);

        if (estado === 'anulado') return 'progress-danger';
        if (estado === 'completado') return 'progress-success';
        if (estado === 'tramitepago') return 'progress-success';

        return 'progress-warning';
    }

    etapaActualIconClass(row: SolicitudCreditoListaItem): string {
        const actual = this.getAprobacionActual(row);
        return this.etapaIconClass(actual?.estado ?? 'Pendiente');
    }

    etapaIconClass(aprobacionEstado: string): string {
        const estado = this.normalize(aprobacionEstado);

        if (estado === 'aprobado') {
            return 'fa-circle-check text-success';
        }

        if (estado === 'rechazado' || estado === 'anulado') {
            return 'fa-circle-xmark text-danger';
        }

        return 'fa-clock text-warning';
    }

    getAprobacionActual(row: SolicitudCreditoListaItem): any {
        return (row.aprobaciones ?? []).find(x => x.actual) ?? null;
    }

    puedeMostrarAprobar(row: SolicitudCreditoListaItem): boolean {
        const estado = this.normalize(row.estado);
        return !!row.puedeAprobar && estado === 'enevaluacion';
    }

    puedeMostrarRechazar(row: SolicitudCreditoListaItem): boolean {
        const estado = this.normalize(row.estado);
        return !!row.puedeRechazar && estado === 'enevaluacion';
    }

    puedeMostrarDesembolsar(row: SolicitudCreditoListaItem): boolean {
        const estado = this.normalize(row.estado);
        return !!row.puedeDesembolsar && estado === 'tramitepago';
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

    getFlowProgress(row: SolicitudCreditoListaItem): number {
        const total = row.aprobaciones?.length ?? 0;
        if (total === 0) return 0;

        const estadoSolicitud = this.normalize(row.estado);

        if (estadoSolicitud === 'completado') return 100;
        if (estadoSolicitud === 'anulado') return 100;

        const aprobadas = row.aprobaciones.filter(x => {
            const estado = this.normalize(x.estado);
            return estado === 'aprobado';
        }).length;

        return Math.max(0, Math.min(100, (aprobadas / total) * 100));
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

    getStepProgressIcon(ap: any, index: number): string {
        const estado = this.normalize(ap.estado);

        if (estado === 'aprobado') return 'bi-check';
        if (estado === 'rechazado') return 'bi-x';
        if (estado === 'anulado') return 'bi-x-circle';

        if (this.isStepActualPendiente(ap, index)) {
            return 'bi-clock';
        }

        return 'bi-circle';
    }



    isStepCompleted(index: number): boolean {
  const item = this.aprobacionesFlujoSeleccionado[index];
  const estado = this.normalize(item?.estado);

  return estado === 'aprobado';
}

isStepRejected(index: number): boolean {
  const item = this.aprobacionesFlujoSeleccionado[index];
  const estado = this.normalize(item?.estado);

  return estado === 'rechazado' || estado === 'anulado';
}

getFlowLineClass(): string {
  return 'step-line-success';
}





}