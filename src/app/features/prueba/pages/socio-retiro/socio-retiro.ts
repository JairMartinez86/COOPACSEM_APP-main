import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize, Subscription } from 'rxjs';

import { Breadcrumb } from '../../../../shared/components/breadcrumb/breadcrumb';
import { AppConfigService } from '../../../../core/services/app-config.service';
import { SociosService } from '../../services/socios.service';
import { SocioRetiroService } from '../../services/socio-retiro.service';
import { TableFilterService } from '../../../../core/services/table-filter.service';

import {
    JMartAutoFocusDirective,
    JMartAutoFocusNextDirective,
    JMartDateFormatDirective,
    JMartEngineSyncDirective,
    JMartErrorNotifyDirective,
    JMartMassiveValidationService,
    JMartNumberFormatDirective
} from '@JairMartinez86/jmartinez-validator';

import { AppPermissionDirective } from '../../../../core/services/app-permission.directive';
import { NotificationService } from '../../../../core/services/notification.service';
import { SocioRetiro } from '../../interface/socio.retiro.model';

interface BancoOption {
    codigo: string;
    nombreBanco: string;
    cuentaContable?: string | null;
    activo: boolean;
}

interface SocioDashboard {
    totalAhorro?: number;
    ahorroNavideno?: number;
    creditoPendiente?: number;
}

interface SocioResumen {
    id: string;
    codigoSocio: string;
    nombreCompleto: string;
    numeroIdentificacion: string;
    sociedadLabora?: string;
    telefono?: string;
    celular?: string;
    correo?: string;
    direccionDomiciliar?: string;
    FechaIngreso?: string | null;
    salarioMensual?: number;
    cuotaActual?: number;
    totalAhorrado?: number;
    totalRetirado?: number;
    saldoActual?: number;
    indemnizacionEstimada?: number;
    dashboard?: SocioDashboard | null;
}

interface SocioRetiroForm {
    socioId: string;
    destino: string;
    monto: number | null;
    bancoCodigo: string;
    noRetiro: string;
    fechaRetiro: string;
    referencia: string;
    observacion: string;
}

interface HistorialItem {
    id: string;
    fecha: string;
    monto: number;
    destino: string;
    estado: string;
    referencia?: string;
}

@Component({
    selector: 'app-socio-retiro',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        Breadcrumb,
        JMartAutoFocusNextDirective,
        JMartErrorNotifyDirective,
        JMartEngineSyncDirective,
        JMartAutoFocusDirective,
        AppPermissionDirective,
        JMartDateFormatDirective,
        JMartNumberFormatDirective,
    ],
    templateUrl: './socio-retiro.html',
    styleUrl: './socio-retiro.scss'
})
export class SocioRetiroComponent implements OnInit, OnDestroy {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly translate = inject(TranslateService);
    private readonly sociosService = inject(SociosService);
    private readonly socioRetiroService = inject(SocioRetiroService);
    private readonly filterSvc = inject(TableFilterService);
    public notify = inject(NotificationService);
    private engine = inject(JMartMassiveValidationService);

    private readonly isBrowser: boolean;
    private readonly subs = new Subscription();
    private readonly filterKey = 'socio-retiro';

    mode: 'create' | 'view' | 'edit' = 'create';

    public appConfigService = inject(AppConfigService);

    breadcrumbs: any[] = [
        { label: '', url: '/' },
        { label: '', url: '' },
        { label: '' }
    ];

    socioId = '';

    loading = false;
    loadingHistory = false;
    loadingBanks = false;

    historial: HistorialItem[] = [];
    historialAll: HistorialItem[] = [];

    historialCurrentPage = 1;
    historialPageSize = 5;
    historialCurrentTerm = '';

    socio: SocioResumen | null = null;

    retiro: SocioRetiroForm = this.createEmptyForm();

    bancos: BancoOption[] = [];

    destinos = [
        { value: 'retiroCorriente', labelKey: 'socioRetiro.destinos.retiroCorriente' },
        { value: 'retiroNavideno', labelKey: 'socioRetiro.destinos.retiroNavideno' }
    ];

    constructor(
        @Inject(PLATFORM_ID) private platformId: object
    ) {
        this.isBrowser = isPlatformBrowser(this.platformId);
    }

    ngOnInit(): void {
        this.subs.add(
            this.filterSvc.query$(this.filterKey).subscribe(query => {
                this.historialCurrentTerm = (query || '').trim().toLowerCase();
                this.applyFilter();
            })
        );

        this.subs.add(
            this.translate.onLangChange.subscribe(() => {
                this.breadcrumbs = this.translate.instant('socioRetiro.breadcrumbs') || [];
                this.loadConfig();
            })
        );

        this.breadcrumbs = this.translate.instant('socioRetiro.breadcrumbs') || [];

        this.socioId = this.route.snapshot.paramMap.get('socioId') ?? '';
        this.retiro.socioId = this.socioId;

        if (!this.socioId) {
            this.onCancel();
            return;
        }

        this.engine.addControl('FechaServidor');

        this.engine.setControlValue(
            'FechaServidor',
            this.appConfigService.getCurrentSettings().fechaServidor
        );
        this.retiro.fechaRetiro = this.formatDate(this.appConfigService.getCurrentSettings().fechaServidor);

        this.loadSocio(this.socioId);
        this.loadHistorial(this.socioId);
        this.loadBancos();
    }

    ngAfterViewInit(): void {
        if (!this.isBrowser) return;

        this.loadConfig();
        this.initRouteModeAndLoad();
    }

    ngOnDestroy(): void {
        this.subs.unsubscribe();
    }

    private initRouteModeAndLoad(): void {
        const url = this.router.url.toLowerCase();

        this.mode = 'view';

        if (url.includes('/new')) {
            this.mode = 'create';
        }
    }

    loadConfig(): void {
        this.engine.resetRules?.();
        this.engine.clearFieldsMeta?.();

        const fieldMeta = this.translate.instant('socioRetiro.form.fieldMeta') || {};
        const validations = this.translate.instant('socioRetiro.form.validations') || {};

        for (const [fieldId, meta] of Object.entries(fieldMeta as Record<string, any>)) {
            this.engine.addFieldMeta?.({
                id: fieldId,
                label: meta?.label ?? '',
                tooltip: meta?.tooltip ?? '',
                tooltipIconClass: meta?.tooltipIconClass ?? '',
            });
        }

        for (const [fieldId, fieldConfig] of Object.entries(validations as Record<string, any>)) {
            const rules = fieldConfig?.data || {};

            for (const rule of Object.values(rules) as any[]) {
                this.engine.addRule?.({
                    id: fieldId,
                    condition: String(rule?.rule ?? '').trim(),
                    when: String(rule?.when ?? '').trim(),
                    value: rule?.value ?? '',
                    message: String(rule?.msj ?? ''),
                });
            }
        }

        this.engine.validateAll?.();
        this.engine.clearErrors?.();
    }

    private createEmptyForm(): SocioRetiroForm {
        return {
            socioId: '',
            destino: 'retiroCorriente',
            monto: null,
            bancoCodigo: '',
            noRetiro: '',
            fechaRetiro: '',
            referencia: '',
            observacion: ''
        };
    }

    public applyFilter(): void {
        const term = this.historialCurrentTerm;

        this.historial = !term
            ? [...this.historialAll]
            : this.historialAll.filter((item) =>
                [
                    item.fecha ?? '',
                    item.destino ?? '',
                    item.estado ?? '',
                    item.referencia ?? '',
                    String(item.monto ?? '')
                ]
                    .join(' ')
                    .toLowerCase()
                    .includes(term)
            );

        this.historialCurrentPage = 1;
    }

    loadSocio(id: string): void {
        this.loading = true;

        this.sociosService.getById(id)
            .pipe(finalize(() => (this.loading = false)))
            .subscribe({
                next: (res: any) => {
                    const data = res?.data?.socio ?? res?.data ?? {};

                    this.socio = {
                        id: data?.id ?? '',
                        codigoSocio: data?.codigoSocio ?? '',
                        nombreCompleto: data?.nombreCompleto ?? '',
                        numeroIdentificacion: data?.numeroIdentificacion ?? '',
                        sociedadLabora: data?.sociedadLabora ?? '',
                        telefono: data?.telefono ?? '',
                        celular: data?.celular ?? '',
                        correo: data?.correo ?? '',
                        direccionDomiciliar: data?.direccionDomiciliar ?? '',
                        FechaIngreso: data?.fechaIngreso ?? null,

                        salarioMensual: Number(data?.salarioMensual ?? 0),
                        cuotaActual: Number(data?.cuotaActual ?? 0),
                        totalAhorrado: Number(data?.totalAhorrado ?? 0),
                        totalRetirado: Number(data?.totalRetirado ?? 0),
                        saldoActual: Number(data?.saldoActual ?? 0),
                        indemnizacionEstimada: Number(data?.indemnizacionEstimada ?? 0),

                        dashboard: {
                            totalAhorro: Number(data?.dashboard?.totalAhorro ?? 0),
                            ahorroNavideno: Number(data?.dashboard?.ahorroNavideno ?? 0),
                            creditoPendiente: Number(data?.dashboard?.creditoPendiente ?? 0)
                        }
                    };
                },
                error: (err) => {
                    this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
                    this.socio = null;
                }
            });
    }

    loadBancos(): void {
        this.loadingBanks = true;

        this.socioRetiroService.getBancos()
            .pipe(finalize(() => (this.loadingBanks = false)))
            .subscribe({
                next: (res: any) => {
                    const items = res?.data?.bancos ?? res?.data ?? res ?? [];

                    this.bancos = Array.isArray(items)
                        ? items.map((x: any) => ({
                            codigo: String(x?.codigo ?? ''),
                            nombreBanco: String(x?.nombreBanco ?? x?.nombre ?? ''),
                            cuentaContable: x?.cuentaContable ?? null,
                            activo: Boolean(x?.activo ?? true)
                        }))
                        : [];
                },
                error: (err) => {
                    this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
                    this.bancos = [];
                }
            });
    }

    loadHistorial(socioId: string): void {
        this.loadingHistory = true;

        this.socioRetiroService.getHistorial(socioId)
            .pipe(finalize(() => (this.loadingHistory = false)))
            .subscribe({
                next: (res: any) => {
                    const items = res?.data?.historial ?? res?.historial ?? res ?? [];

                    this.historialAll = Array.isArray(items)
                        ? items.map((x: any) => ({
                            id: String(x?.id ?? ''),
                            fecha: String(x?.fecha ?? ''),
                            monto: Number(x?.monto ?? 0),
                            destino: String(x?.destino ?? ''),
                            aplicado: Number(x?.aplicado ?? 0),
                            estado: String(x?.estado ?? ''),
                            referencia: x?.referencia ?? ''
                        }))
                        : [];

                    this.applyFilter();
                },
                error: (err) => {
                    this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
                    this.historialAll = [];
                    this.historial = [];
                    this.historialCurrentPage = 1;
                }
            });
    }

    onCancel(): void {
        this.router.navigate(['/socios']);
    }

    onSave(): void {
        if (this.mode === 'view') {
            return;
        }

        const ok = this.engine.validateAll?.();

        if (!ok) {
            this.notify.show?.(this.engine.getGroupedErrorsHtmlSnapshot?.(), '', 'warning');
            return;
        }

        const payload: SocioRetiro = {
            SocioId: this.retiro.socioId,
            Destino: this.retiro.destino,
            Monto: Number(this.retiro.monto),
            BancoCodigo: this.retiro.bancoCodigo.trim(),
            NoRetiro: this.retiro.noRetiro.trim(),
            FechaRetiro: this.normalizeDate(this.retiro.fechaRetiro)!,
            Referencia: this.retiro.referencia.trim(),
            Observacion: this.retiro.observacion.trim()
        };

        this.socioRetiroService.create(payload)
            .subscribe({
                next: (res: any) => {
                    this.retiro = {
                        ...this.createEmptyForm(),
                        socioId: this.socioId
                    };

                    this.loadSocio(this.socioId);
                    this.loadHistorial(this.socioId);

                    this.notify.showFromApiResponse?.(res, 'success');
                },
                error: (err) => {
                    this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
                }
            });
    }

    private normalizeDate(value: string | null): string | null {
        if (!value) return null;

        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return value;
        }

        const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (match) {
            const [, dd, mm, yyyy] = match;
            return `${yyyy}-${mm}-${dd}`;
        }

        return value;
    }

    formatCurrency(value?: number | null): string {
        const amount = Number(value ?? 0);

        const settings = this.appConfigService.getCurrentSettings();

        const decimalSeparator = settings.decimalSeparator || '.';
        const thousandSeparator = settings.thousandSeparator || ',';

        const fixed = amount.toFixed(2);

        const parts = fixed.split('.');
        let integerPart = parts[0];
        const decimalPart = parts[1];

        integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator);

        return `${integerPart}${decimalSeparator}${decimalPart}`;
    }

    formatDate(value?: string | null): string {
        if (!value) return '-';

        const date = this.parseLocalDate(value);
        if (!date) return '-';

        const format = (this.appConfigService.getCurrentSettings().dateFormat || 'dd/MM/yyyy').trim();

        const dd = `${date.getDate()}`.padStart(2, '0');
        const MM = `${date.getMonth() + 1}`.padStart(2, '0');
        const yyyy = `${date.getFullYear()}`;

        return format
            .replace('dd', dd)
            .replace('MM', MM)
            .replace('yyyy', yyyy);
    }

    private parseLocalDate(value: string): Date | null {
        if (!value) return null;

        const raw = String(value).trim();
        const systemFormat = (this.appConfigService.getCurrentSettings().dateFormat || 'dd/MM/yyyy').trim();

        const isoDateTime = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
        if (isoDateTime) {
            const [, yyyy, MM, dd] = isoDateTime;
            return new Date(Number(yyyy), Number(MM) - 1, Number(dd));
        }

        if (systemFormat === 'dd/MM/yyyy') {
            const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
            if (match) {
                const [, dd, MM, yyyy] = match;
                return new Date(Number(yyyy), Number(MM) - 1, Number(dd));
            }
        }

        if (systemFormat === 'MM/dd/yyyy') {
            const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
            if (match) {
                const [, MM, dd, yyyy] = match;
                return new Date(Number(yyyy), Number(MM) - 1, Number(dd));
            }
        }

        if (systemFormat === 'yyyy-MM-dd') {
            const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (match) {
                const [, yyyy, MM, dd] = match;
                return new Date(Number(yyyy), Number(MM) - 1, Number(dd));
            }
        }

        const es = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (es) {
            const [, dd, MM, yyyy] = es;
            return new Date(Number(yyyy), Number(MM) - 1, Number(dd));
        }

        const us = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (us) {
            const [, MM, dd, yyyy] = us;
            return new Date(Number(yyyy), Number(MM) - 1, Number(dd));
        }

        return null;
    }


    get historialTotalPages(): number {
        return Math.max(1, Math.ceil(this.historial.length / this.historialPageSize));
    }

    get pagedHistorial(): HistorialItem[] {
        const start = (this.historialCurrentPage - 1) * this.historialPageSize;
        return this.historial.slice(start, start + this.historialPageSize);
    }

    get historialVisibleStart(): number {
        if (this.historial.length === 0) return 0;
        return (this.historialCurrentPage - 1) * this.historialPageSize + 1;
    }

    get historialVisibleEnd(): number {
        return Math.min(this.historialCurrentPage * this.historialPageSize, this.historial.length);
    }

    get historialPageNumbers(): (number | string)[] {
        const total = this.historialTotalPages;
        const current = this.historialCurrentPage;

        if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);

        if (current <= 3) return [1, 2, 3, '...', total];
        if (current >= total - 2) return [1, '...', total - 2, total - 1, total];

        return [1, '...', current - 1, current, current + 1, '...', total];
    }

    goToHistorialPage(page: number): void {
        if (page < 1 || page > this.historialTotalPages) return;
        this.historialCurrentPage = page;
    }
}