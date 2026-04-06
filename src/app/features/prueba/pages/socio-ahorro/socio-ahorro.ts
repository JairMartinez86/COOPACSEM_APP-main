import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize, Subscription } from 'rxjs';

import { Breadcrumb } from '../../../../shared/components/breadcrumb/breadcrumb';
import { AppConfigService } from '../../../../core/services/app-config.service';
import { SociosService } from '../../services/socios.service';
import { SocioAhorroService } from '../../services/socio-ahorro.service';
import { TableFilterService } from '../../../../core/services/table-filter.service';
import { JMartAutoFocusDirective, JMartAutoFocusNextDirective, JMartDateFormatDirective, JMartEngineSyncDirective, JMartErrorNotifyDirective, JMartMassiveValidationService, JMartNumberFormatDirective } from '@JairMartinez86/jmartinez-validator';
import { AppPermissionDirective } from '../../../../core/services/app-permission.directive';
import { NotificationService } from '../../../../core/services/notification.service';
import { SocioAhorro } from '../../interface/socio.ahorro.model';

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
    dashboard?: SocioDashboard | null;
}

interface SocioAhorroForm {
    socioId: string;
    destino: string;
    monto: number | null;
    bancoCodigo: string;
    noDeposito: string;
    fechaDeposito: string;
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
    selector: 'app-socio-ahorro',
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
    templateUrl: './socio-ahorro.html',
    styleUrl: './socio-ahorro.scss'
})
export class SocioAhorroComponent implements OnInit, OnDestroy {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly translate = inject(TranslateService);
    private readonly sociosService = inject(SociosService);
    private readonly socioAhorroService = inject(SocioAhorroService);
    private readonly filterSvc = inject(TableFilterService);
    public notify = inject(NotificationService);
    private engine = inject(JMartMassiveValidationService);

    private readonly isBrowser: boolean;

    private readonly subs = new Subscription();
    private readonly filterKey = 'socio-ahorro';
    mode: 'create' | 'view' | 'edit' = 'create';

    public appConfigService = inject(AppConfigService);

    breadcrumbs: any[] = [
        { label: 'Inicio', url: '/' },
        { label: 'Socios', url: '/socios' },
        { label: 'Depósito de ahorro' }
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

    ahorro: SocioAhorroForm = this.createEmptyForm();

    bancos: BancoOption[] = [];

    destinos = [
        { value: 'ahorroCorriente', labelKey: 'socioAhorro.destinos.ahorroCorriente' },
        { value: 'ahorroNavideno', labelKey: 'socioAhorro.destinos.ahorroNavideno' },
        { value: 'creditoActivo', labelKey: 'socioAhorro.destinos.creditoActivo' }
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
                this.breadcrumbs = this.translate.instant('socioAhorro.breadcrumbs') || [];
                this.loadConfig();
            })
        );

        this.breadcrumbs = this.translate.instant('socioAhorro.breadcrumbs') || [];



        this.socioId = this.route.snapshot.paramMap.get('socioId') ?? '';
        this.ahorro.socioId = this.socioId;

        if (!this.socioId) {
            this.onCancel();
            return;
        }

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
        const id = this.route.snapshot.paramMap.get('id');
        const url = this.router.url.toLowerCase();
        this.mode = 'view';
        if (url.includes('/new')) {
            this.mode = 'create';
        }

    }

    loadConfig(): void {
        this.engine.resetRules?.();
        this.engine.clearFieldsMeta?.();

        const fieldMeta = this.translate.instant('socioAhorro.form.fieldMeta') || {};
        const validations = this.translate.instant('socioAhorro.form.validations') || {};

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
                const value = rule?.value ?? '';

                this.engine.addRule?.({
                    id: fieldId,
                    condition: String(rule?.rule ?? '').trim(),
                    when: String(rule?.when ?? '').trim(),
                    value,
                    message: String(rule?.msj ?? '').replace('{value}', String(value ?? '')),
                    classIconSuccess: rule?.classIconSuccess ?? '',
                    classIconError: rule?.classIconError ?? '',
                });
            }
        }

        this.engine.validateAll?.();
        this.engine.clearErrors?.();

    }



    private createEmptyForm(): SocioAhorroForm {
        return {
            socioId: '',
            destino: 'ahorroCorriente',
            monto: null,
            bancoCodigo: '',
            noDeposito: '',
            fechaDeposito: '',
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
                        dashboard: {
                            totalAhorro: Number(data?.dashboard?.totalAhorro ?? 0),
                            ahorroNavideno: Number(data?.dashboard?.ahorroNavideno ?? 0),
                            creditoPendiente: Number(data?.dashboard?.creditoPendiente ?? 0)
                        }
                    };
                },
                error: (err) => {
                    console.error('Error loading socio', err);
                    this.socio = null;
                }
            });
    }

    loadBancos(): void {
        this.loadingBanks = true;

        this.socioAhorroService.getBancos()
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
                    console.error('Error loading bancos', err);
                    this.bancos = [];
                }
            });
    }

    loadHistorial(socioId: string): void {
        this.loadingHistory = true;

        this.socioAhorroService.getHistorial(socioId)
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
                    console.error('Error loading historial', err);
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


        const payload: SocioAhorro = {
            SocioId: this.ahorro.socioId,
            Destino: this.ahorro.destino,
            Monto: Number(this.ahorro.monto),
            BancoCodigo: this.ahorro.bancoCodigo.trim(),
            NoDeposito: this.ahorro.noDeposito.trim(),
            FechaDeposito: this.normalizeDate(this.ahorro.fechaDeposito)!,
            Referencia: this.ahorro.referencia.trim(),
            Observacion: this.ahorro.observacion.trim()
        };



        this.socioAhorroService.create(payload)
            .pipe(finalize(() => {}))
            .subscribe({
                next: (res: any) => {
                    const ahorro = res?.data?.ahorro ?? res?.ahorro ?? res ?? null;

                    this.ahorro = {
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

    // ya viene yyyy-MM-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    // viene dd/MM/yyyy
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

    // agregar separador de miles manual
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator);

    return `${integerPart}${decimalSeparator}${decimalPart}`;
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

        if (total <= 5) {
            return Array.from({ length: total }, (_, i) => i + 1);
        }

        if (current <= 3) {
            return [1, 2, 3, '...', total];
        }

        if (current >= total - 2) {
            return [1, '...', total - 2, total - 1, total];
        }

        return [1, '...', current - 1, current, current + 1, '...', total];
    }

    goToHistorialPage(page: number): void {
        if (page < 1 || page > this.historialTotalPages) return;
        this.historialCurrentPage = page;
    }
}