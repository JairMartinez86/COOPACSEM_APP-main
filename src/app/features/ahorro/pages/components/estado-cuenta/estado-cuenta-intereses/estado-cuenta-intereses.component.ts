import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize, Subscription } from 'rxjs';

import { Breadcrumb } from '../../../../../../shared/components/breadcrumb/breadcrumb';
import { EstadoCuentaService } from '../../../../services/estado.cuenta.service';
import { NotificationService } from '../../../../../../core/services/notification.service';
import { AppConfigService } from '../../../../../../core/services/app-config.service';

type TipoConsultaInteres = 'Corte' | 'Rango' | 'Mes' | 'Anio' | 'Trimestre';

interface InteresSocio {
    id: string;
    codigoSocio: string;
    nombreCompleto: string;
    numeroIdentificacion?: string | null;
    activo: boolean;
}

interface InteresResumen {
    saldoInteresesAhorros: number;
    ahorrosCorriente: number;
    ahorrosNavidena: number;
    tasaInteresAnual: number;
    interesesPagados: number;
    interesesAplicadosAhorro: number;
    totalInteresesGenerados: number;
    interesesPendientesPagar: number;
}

interface InteresMovimiento {
    id: string;
    fecha?: string | null;
    concepto: string;
    ahorroCorriente: number;
    ahorroNavidena: number;
    saldoInteresCorriente: number;
    saldoInteresNavidena: number;
    debito: number;
    credito: number;
    aplicadoAhorro: number;
    observaciones: string;
}

@Component({
    selector: 'app-estado-cuenta-intereses',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule, Breadcrumb],
    templateUrl: './estado-cuenta-intereses.component.html',
    styleUrls: ['./estado-cuenta-intereses.component.scss']
})
export class EstadoCuentaInteresesComponent implements OnInit, OnDestroy {
    private readonly route = inject(ActivatedRoute);
    private readonly service = inject(EstadoCuentaService);
    private readonly notify = inject(NotificationService);
    private readonly translate = inject(TranslateService);
    public readonly appConfig = inject(AppConfigService);

    private readonly subs = new Subscription();

    breadcrumbs: any[] = [];
    loading = false;
    socioId = '';
    requestTime = 0;
    meses = Array.from({ length: 12 }, (_, i) => i + 1);

    socio: InteresSocio | null = null;

    tipoConsulta: TipoConsultaInteres = 'Trimestre';

    fechaServidor: Date = new Date();
    fechaDesde = '';
    fechaHasta = '';
    fechaCorte = '';
    

    mes = 1;
    anio = 2026;
    trimestre = 1;
    anios: number[] = [];

    pdf: string | null = null;
    excel: string | null = null;

    resumen: InteresResumen = {
        saldoInteresesAhorros: 0,
        ahorrosCorriente: 0,
        ahorrosNavidena: 0,
        tasaInteresAnual: 0,
        interesesPagados: 0,
        interesesAplicadosAhorro: 0,
        totalInteresesGenerados: 0,
        interesesPendientesPagar: 0
    };

    movimientos: InteresMovimiento[] = [];

    movPage = 1;
    movPageSize = 10;
    readonly movPageSizeOptions = [10, 20, 50, 100];

    ngOnInit(): void {
        this.setBreadcrumbs();

        this.subs.add(
            this.translate.onLangChange.subscribe(() => this.setBreadcrumbs())
        );

        this.socioId = this.route.snapshot.paramMap.get('id') ?? '';

        if (!this.socioId) {
            this.notify.show(
                this.translate.instant('estadoCuentaIntereses.messages.invalidSocio'),
                '',
                'warning'
            );
            return;
        }

        const fechaServidorStr = this.appConfig.getCurrentSettings().fechaServidor;

        this.fechaServidor = fechaServidorStr
            ? new Date(fechaServidorStr)
            : new Date();

        if (isNaN(this.fechaServidor.getTime())) {
            this.fechaServidor = new Date();
        }

        this.anio = this.fechaServidor.getFullYear();
        this.mes = this.fechaServidor.getMonth() + 1;

        this.trimestre =
            Math.floor(this.fechaServidor.getMonth() / 3) + 1;

        this.tipoConsulta = 'Trimestre';
        this.fechaCorte = this.toDateInputValue(this.fechaServidor);

        this.generarAnios();
        this.setFechasPorTrimestre();

        this.loadData();
    }

    ngOnDestroy(): void {
        this.subs.unsubscribe();
    }

    setBreadcrumbs(): void {
        this.breadcrumbs =
            this.translate.instant('estadoCuentaIntereses.breadcrumbs') || [];
    }

    generarAnios(): void {

        const anioActual = this.fechaServidor.getFullYear();

        this.anios = [];

        for (let y = anioActual; y >= 1900; y--) {
            this.anios.push(y);
        }

        if (!this.anios.includes(this.anio)) {
            this.anio = anioActual;
        }
    }

seleccionarConsulta(tipo: TipoConsultaInteres): void {

  this.tipoConsulta = tipo;
  this.movPage = 1;

  const anioServidor = this.fechaServidor.getFullYear();

  if (tipo === 'Corte') {

    this.fechaCorte =
      this.fechaCorte ||
      this.toDateInputValue(this.fechaServidor);

    this.fechaDesde = this.toDateInputValue(
      new Date(anioServidor, 0, 1)
    );

    this.fechaHasta = this.fechaCorte;
  }

  if (tipo === 'Rango') {

    this.fechaDesde =
      this.fechaDesde ||
      this.toDateInputValue(
        new Date(anioServidor, 0, 1)
      );

    this.fechaHasta =
      this.fechaHasta ||
      this.toDateInputValue(this.fechaServidor);
  }

  if (tipo === 'Mes') {
    this.setFechasPorMes();
  }

  if (tipo === 'Anio') {
    this.setFechasPorAnio();
  }

  if (tipo === 'Trimestre') {
    this.setFechasPorTrimestre();
  }
}

aplicarFiltros(): void {

  this.movPage = 1;

  if (this.tipoConsulta === 'Trimestre') {
    this.setFechasPorTrimestre();
  }

  if (this.tipoConsulta === 'Mes') {
    this.setFechasPorMes();
  }

  if (this.tipoConsulta === 'Anio') {
    this.setFechasPorAnio();
  }

  if (this.tipoConsulta === 'Corte') {

    this.fechaDesde = this.toDateInputValue(
      new Date(
        this.fechaServidor.getFullYear(),
        0,
        1
      )
    );

    this.fechaHasta = this.fechaCorte;
  }

  this.loadData();
}

    setFechasPorTrimestre(): void {
        const inicioMes = (this.trimestre - 1) * 3;
        const desde = new Date(this.anio, inicioMes, 1);
        const hasta = new Date(this.anio, inicioMes + 3, 0);

        this.fechaDesde = this.toDateInputValue(desde);
        this.fechaHasta = this.toDateInputValue(hasta);
    }

    setFechasPorMes(): void {
        const desde = new Date(this.anio, this.mes - 1, 1);
        const hasta = new Date(this.anio, this.mes, 0);

        this.fechaDesde = this.toDateInputValue(desde);
        this.fechaHasta = this.toDateInputValue(hasta);
    }

    setFechasPorAnio(): void {

  const desde = new Date(this.anio, 0, 1);
  const hasta = new Date(this.anio, 11, 31);

  this.fechaDesde = this.toDateInputValue(desde);
  this.fechaHasta = this.toDateInputValue(hasta);
}

    loadData(): void {
       // const start = performance.now();
        this.loading = true;

        this.service.getDetalleIntereses(this.socioId, {
            tipoConsulta: this.tipoConsulta,
            fechaDesde: this.fechaDesde,
            fechaHasta: this.fechaHasta,
            mes: this.mes,
            anio: this.anio,
            trimestre: this.trimestre
        })
            .pipe(finalize(() => {
                this.loading = false;
               /* this.requestTime = Number((performance.now() - start).toFixed(2));
                console.log(this.requestTime )*/
            }))
            .subscribe({
                next: (res: any) => {
                    const data = res?.data?.data ?? {};

                    this.socio = data?.socio ?? null;

                    this.resumen = {
                        saldoInteresesAhorros: Number(data?.resumen?.saldoInteresesAhorros ?? 0),
                        ahorrosCorriente: Number(data?.resumen?.ahorrosCorriente ?? 0),
                        ahorrosNavidena: Number(data?.resumen?.ahorrosNavidena ?? 0),
                        tasaInteresAnual: Number(data?.resumen?.tasaInteresAnual ?? 0),
                        interesesPagados: Number(data?.resumen?.interesesPagados ?? 0),
                        interesesAplicadosAhorro: Number(data?.resumen?.interesesAplicadosAhorro ?? 0),
                        totalInteresesGenerados: Number(data?.resumen?.totalInteresesGenerados ?? 0),
                        interesesPendientesPagar: Number(data?.resumen?.interesesPendientesPagar ?? 0)
                    };

              
                    
                    this.movimientos = Array.isArray(data?.movimientos)
                        ? data.movimientos.map((x: any) => ({
                            id: x?.id ?? crypto.randomUUID(),
                            fecha: x?.fecha ?? null,
                            concepto: x?.concepto ?? '',
                            ahorroCorriente: Number(x?.ahorroCorriente ?? 0),
                            ahorroNavidena: Number(x?.ahorroNavidena ?? 0),
                            saldoInteresCorriente: Number(x?.saldoInteresCorriente ?? 0),
                            saldoInteresNavidena: Number(x?.saldoInteresNavidena ?? 0),
                            debito: Number(x?.debito ?? 0),
                            credito: Number(x?.credito ?? 0),
                            aplicadoAhorro: Number(x?.aplicadoAhorro ?? 0),
                            observaciones: x?.observaciones ?? ''
                        }))
                        : [];

          

                    this.pdf = data?.pdf ?? res?.data?.pdf ?? null;
                    this.excel = data?.excel ?? res?.data?.excel ?? null;
                    this.movPage = 1;
                },
                error: (err) => {
                    this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
                }
            });
    }

    getSaldoInteresTotal(mov: InteresMovimiento): number {
        return Number(mov.saldoInteresCorriente ?? 0) +
            Number(mov.saldoInteresNavidena ?? 0);
    }

    get movimientosPaginados(): InteresMovimiento[] {
        const start = (this.movPage - 1) * this.movPageSize;
        return this.movimientos.slice(start, start + this.movPageSize);
    }

    get movTotalRecords(): number {
        return this.movimientos.length;
    }

    get movTotalPages(): number {
        return this.movTotalRecords > 0
            ? Math.ceil(this.movTotalRecords / this.movPageSize)
            : 0;
    }

    get movVisibleStart(): number {
        if (!this.movTotalRecords) return 0;
        return (this.movPage - 1) * this.movPageSize + 1;
    }

    get movVisibleEnd(): number {
        return Math.min(this.movPage * this.movPageSize, this.movTotalRecords);
    }

    get movPageNumbers(): Array<number | string> {
        const total = this.movTotalPages;
        const current = this.movPage;
        const pages: Array<number | string> = [];

        if (total <= 7) {
            for (let i = 1; i <= total; i++) pages.push(i);
            return pages;
        }

        pages.push(1);
        if (current > 4) pages.push('...');

        const start = Math.max(2, current - 1);
        const end = Math.min(total - 1, current + 1);

        for (let i = start; i <= end; i++) pages.push(i);

        if (current < total - 3) pages.push('...');
        pages.push(total);

        return pages;
    }

    goToMovPage(page: number): void {
        if (page < 1 || page > this.movTotalPages || page === this.movPage) return;
        this.movPage = page;
    }

    changeMovPageSize(value: number | string): void {
        const size = Number(value);
        if (!size || size === this.movPageSize) return;

        this.movPageSize = size;
        this.movPage = 1;
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

    formatPercent(value?: number | null): string {
        return `${this.formatAmount(value)} %`;
    }

    formatDate(value?: string | null): string {
        if (!value) return '-';

        const date = new Date(value);
        if (isNaN(date.getTime())) return '-';

        return date.toLocaleDateString('es-NI', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
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
        const codigo = this.socio?.codigoSocio || 'SIN-CODIGO';
        const nombre = (this.socio?.nombreCompleto || 'SOCIO')
            .replace(/[\\/:*?"<>|]/g, '')
            .trim();

        return `${this.appConfig.getCurrentSettings().companyName} - ESTADO_CUENTA_INTERESES_${codigo} - ${nombre}`;
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

    private toDateInputValue(date: Date): string {
        const fixed = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        return fixed.toISOString().substring(0, 10);
    }
}