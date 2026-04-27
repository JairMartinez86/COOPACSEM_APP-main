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

type TipoCuentaSeleccionada = 'Corriente' | 'Navidena' | 'Consolidado';
type TipoReporte = 'Acumulado' | 'Rango' | 'Mes' | 'Anio';

interface EstadoCuentaSocio {
  id: string;
  codigoSocio: string;
  nombreCompleto: string;
  numeroIdentificacion: string;
  fechaIngreso?: string | null;
  activo: boolean;
  cuentaCorrienteActiva: boolean;
  cuentaNavidenaActiva: boolean;
  fechaInicioCorriente?: string | null;
  fechaInicioNavidena?: string | null;
  salarioMensual: number;
  cuotaCorriente: number;
  cuotaNavidena: number;
}

interface EstadoCuentaResumen {
  totalAhorrado: number;
  totalRetirado: number;
  saldoActual: number;
  totalCuotas: number;
  totalRetiros: number;
  porcentajeAhorro: number;
}

interface EstadoCuentaMovimiento {
  id: string;
  fecha?: string | null;
  tipoCuenta: string;
  tipoMovimiento: string;
  concepto: string;
  documento?: string | null;
  debito: number;
  credito: number;
  saldo: number;
}

@Component({
  selector: 'app-estado-cuenta-detalle',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    Breadcrumb
  ],
  templateUrl: './estado-cuenta-detalle.component.html',
  styleUrls: ['./estado-cuenta-detalle.component.scss']
})
export class EstadoCuentaDetalleComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(EstadoCuentaService);
  private readonly notify = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  public readonly appConfig = inject(AppConfigService);

  private readonly subs = new Subscription();

  breadcrumbs: any[] = [];
  loading = false;
  socioId = '';

  socio: EstadoCuentaSocio | null = null;

  tipoCuentaSeleccionada: TipoCuentaSeleccionada = 'Corriente';
  tipoReporte: TipoReporte = 'Acumulado';

  mostrarSaldoInicial = false;

  resumen: EstadoCuentaResumen = {
    totalAhorrado: 0,
    totalRetirado: 0,
    saldoActual: 0,
    totalCuotas: 0,
    totalRetiros: 0,
    porcentajeAhorro: 0
  };

  movimientos: EstadoCuentaMovimiento[] = [];

  fechaServidor: Date = new Date();
  modalExportacionOpen = false;
  pdf: any;
  excel: any;

  fechaCorte = '';
  fechaDesde = '';
  fechaHasta = '';

  mes = new Date().getMonth() + 1;
  anio = new Date().getFullYear();
  anios: number[] = [];

  movPage = 1;
  movPageSize = 10;
  readonly movPageSizeOptions = [5, 10, 20, 50];

  ngOnInit(): void {
    this.setBreadcrumbs();

    this.subs.add(
      this.translate.onLangChange.subscribe(() => this.setBreadcrumbs())
    );

    this.socioId = this.route.snapshot.paramMap.get('id') ?? '';

    if (!this.socioId) {
      this.notify.show(
        this.translate.instant('estadoCuentaDetalle.messages.invalidSocio'),
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

    this.fechaCorte = this.toDateInputValue(this.fechaServidor);

    this.fechaDesde = this.toDateInputValue(
      new Date(
        this.fechaServidor.getFullYear(),
        this.fechaServidor.getMonth(),
        1
      )
    );

    this.fechaHasta = this.toDateInputValue(this.fechaServidor);

    this.generarAnios();

    this.loadData(false);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private generarAnios(): void {
    const anioActual = this.fechaServidor.getFullYear();
    const anioMin = 2010;

    this.anios = [];

    for (let y = anioActual; y >= anioMin; y--) {
      this.anios.push(y);
    }

    if (!this.anios.includes(this.anio)) {
      this.anio = anioActual;
    }
  }

  private toDateInputValue(date: Date): string {
    const fixed = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return fixed.toISOString().substring(0, 10);
  }

  loadData(preservarCuentaSeleccionada = true): void {
    const cuentaAnterior = this.tipoCuentaSeleccionada;

    this.loading = true;

    this.service.getDetalle(this.socioId, {
      tipoReporte: this.tipoReporte,
      tipoCuenta: this.tipoCuentaSeleccionada === 'Consolidado'
        ? 'Acumulado'
        : this.tipoCuentaSeleccionada,
      fechaCorte: this.fechaCorte,
      fechaDesde: this.fechaDesde,
      fechaHasta: this.fechaHasta,
      mes: this.mes,
      anio: this.anio
    })
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (res: any) => {
          const data = res?.data.data ?? {};


          this.socio = data?.socio ?? null;
          this.pdf = res?.data?.pdf;
          this.excel = res?.data?.excel;

          this.resumen = {
            totalAhorrado: Number(data?.resumen?.totalAhorrado ?? 0),
            totalRetirado: Number(data?.resumen?.totalRetirado ?? 0),
            saldoActual: Number(data?.resumen?.saldoActual ?? 0),
            totalCuotas: Number(data?.resumen?.totalCuotas ?? 0),
            totalRetiros: Number(data?.resumen?.totalRetiros ?? 0),
            porcentajeAhorro: Number(data?.resumen?.totalRetiros ?? 0),
          };

          this.mostrarSaldoInicial = !!data?.mostrarSaldoInicial;

          if (data?.fechaCorte) {
            this.fechaCorte = String(data.fechaCorte).substring(0, 10);
          }

          this.movimientos = Array.isArray(data?.movimientos)
            ? data.movimientos
              .map((x: any) => ({
                id: x?.id ?? '',
                fecha: x?.fecha ?? null,
                tipoCuenta: x?.tipoCuenta ?? 'Consolidado',
                tipoMovimiento: x?.tipoMovimiento ?? '',
                concepto: x?.concepto ?? '',
                documento: x?.documento ?? null,
                debito: Number(x?.debito ?? 0),
                credito: Number(x?.credito ?? 0),
                saldo: Number(x?.saldo ?? 0)
              }))
              .sort((a: EstadoCuentaMovimiento, b: EstadoCuentaMovimiento) => {
                const fechaA = new Date(a.fecha ?? '').getTime() || 0;
                const fechaB = new Date(b.fecha ?? '').getTime() || 0;

                if (fechaA !== fechaB) {
                  return fechaB - fechaA; // fecha descendente
                }

                return Number(b.saldo ?? 0) - Number(a.saldo ?? 0); // saldo descendente
              })
            : [];

          this.movPage = 1;

          this.resolverCuentaSeleccionada(cuentaAnterior, preservarCuentaSeleccionada);
        },
        error: (err) => {
          this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
        }
      });
  }

  private resolverCuentaSeleccionada(
    cuentaAnterior: TipoCuentaSeleccionada,
    preservarCuentaSeleccionada: boolean
  ): void {
    if (!this.socio) {
      this.tipoCuentaSeleccionada = 'Consolidado';
      return;
    }

    if (preservarCuentaSeleccionada) {
      if (cuentaAnterior === 'Corriente' && this.socio.cuentaCorrienteActiva) {
        this.tipoCuentaSeleccionada = 'Corriente';
        return;
      }

      if (cuentaAnterior === 'Navidena' && this.socio.cuentaNavidenaActiva) {
        this.tipoCuentaSeleccionada = 'Navidena';
        return;
      }

      if (cuentaAnterior === 'Consolidado') {
        this.tipoCuentaSeleccionada = 'Consolidado';
        return;
      }
    }

    if (this.socio.cuentaCorrienteActiva) {
      this.tipoCuentaSeleccionada = 'Corriente';
      return;
    }

    if (this.socio.cuentaNavidenaActiva) {
      this.tipoCuentaSeleccionada = 'Navidena';
      return;
    }

    this.tipoCuentaSeleccionada = 'Consolidado';
  }

  setBreadcrumbs(): void {
    this.breadcrumbs = this.translate.instant('estadoCuentaDetalle.breadcrumbs') || [];
  }

  seleccionarTipoCuenta(tipo: TipoCuentaSeleccionada): void {
    this.tipoCuentaSeleccionada = tipo;
    this.movPage = 1;
    this.loadData(true);
  }
  aplicarFiltros(): void {
    this.movPage = 1;
    this.loadData(true);
  }


  get movimientosFiltrados(): EstadoCuentaMovimiento[] {
    return this.movimientos;
  }

  get movimientosPaginados(): EstadoCuentaMovimiento[] {
    const start = (this.movPage - 1) * this.movPageSize;
    return this.movimientosFiltrados.slice(start, start + this.movPageSize);
  }

  get movTotalRecords(): number {
    return this.movimientosFiltrados.length;
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

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

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

  get resumenActual(): EstadoCuentaResumen {
    const movimientos = this.movimientosFiltrados;

    const totalAhorrado = movimientos.reduce((acc, x) => acc + Number(x.credito ?? 0), 0);
    const totalRetirado = movimientos.reduce((acc, x) => acc + Number(x.debito ?? 0), 0);

    const saldoFinal = movimientos.length
      ? Number(movimientos[0]?.saldo ?? 0)
      : totalAhorrado - totalRetirado;

    const porcentajeAhorro = this.resumen?.porcentajeAhorro ?? 0;

    return {
      totalAhorrado,
      totalRetirado,
      saldoActual: saldoFinal,
      totalCuotas: movimientos.filter(x => Number(x.credito ?? 0) > 0).length,
      totalRetiros: movimientos.filter(x => Number(x.debito ?? 0) > 0).length,
      porcentajeAhorro
    };
  }

  get tituloDetalleMovimientos(): string {
    const cuenta =
      this.tipoCuentaSeleccionada === 'Corriente'
        ? this.translate.instant('estadoCuentaDetalle.accounts.currentSaving')
        : this.tipoCuentaSeleccionada === 'Navidena'
          ? this.translate.instant('estadoCuentaDetalle.accounts.christmasSaving')
          : this.translate.instant('estadoCuentaDetalle.accounts.consolidatedSaving');

    const label =
      this.tipoReporte === 'Acumulado'
        ? this.translate.instant('estadoCuentaDetalle.report.accumulatedAt')
        : this.tipoReporte === 'Rango'
          ? this.translate.instant('estadoCuentaDetalle.report.byRange')
          : this.tipoReporte === 'Mes'
            ? this.translate.instant('estadoCuentaDetalle.report.byMonth')
            : this.translate.instant('estadoCuentaDetalle.report.byYear');

    return `${this.translate.instant('estadoCuentaDetalle.movements.title')} - ${cuenta} (${label} ${this.formatDate(this.fechaCorte)})`;
  }

  get currency(): string {
    return this.appConfig.getCurrentSettings().currency || 'C$';
  }

  formatCurrency(value?: number | null): string {
    const amount = Number(value ?? 0);

    return `${this.currency} ${amount.toLocaleString('es-NI', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  formatAmount(value?: number | null): string {
    return Number(value ?? 0).toLocaleString('es-NI', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
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

  get cuotaSeleccionada(): number {
    if (!this.socio) return 0;

    if (this.tipoCuentaSeleccionada === 'Corriente') {
      return this.socio.cuotaCorriente ?? 0;
    }

    if (this.tipoCuentaSeleccionada === 'Navidena') {
      return this.socio.cuotaNavidena ?? 0;
    }

    return Number(this.socio.cuotaCorriente ?? 0) + Number(this.socio.cuotaNavidena ?? 0);
  }

  get fechaInicioSeleccionada(): string | null {
    if (!this.socio) return null;

    if (this.tipoCuentaSeleccionada === 'Corriente') {
      return this.socio.fechaInicioCorriente ?? null;
    }

    if (this.tipoCuentaSeleccionada === 'Navidena') {
      return this.socio.fechaInicioNavidena ?? null;
    }

    return this.socio.fechaInicioCorriente ?? this.socio.fechaInicioNavidena ?? null;
  }

  get tipoCuentaTexto(): string {
    if (this.tipoCuentaSeleccionada === 'Corriente') {
      return this.translate.instant('estadoCuentaDetalle.accounts.current');
    }

    if (this.tipoCuentaSeleccionada === 'Navidena') {
      return this.translate.instant('estadoCuentaDetalle.accounts.christmas');
    }

    return this.translate.instant('estadoCuentaDetalle.accounts.consolidatedSaving');
  }


  abrirModalExportacion(): void {
    this.modalExportacionOpen = true;
  }

  cerrarModalExportacion(): void {
    this.modalExportacionOpen = false;
  }




  exportarComoPdf(): void {
    this.descargarPdfBase64(
      this.pdf,
      this.buildPrintFileName(this.translate.instant('fichaSocio.fileNames.affiliationLetter'))
    );
  }

  exportarComoExcel(): void {

    this.descargarExcelBase64(
      this.excel,
      this.buildPrintFileName(this.translate.instant('fichaSocio.fileNames.memberRecord'))
    );
  }


  private buildPrintFileName(tipo: string): string {
    const codigo = (this.socio?.codigoSocio || 'SIN-CODIGO').trim();

    const nombre = (this.socio?.nombreCompleto || 'SOCIO')
      .trim()
      .replace(/[\\/:*?"<>|]/g, '');


    return `${this.appConfig.getCurrentSettings().companyName} - ESTADO_DE_CUENTA_AHORROS_${codigo} - ${nombre}`;
  }


  private descargarExcelBase64(base64: string | null | undefined, fileName: string): void {
    if (!base64) return;

    const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
    const byteCharacters = atob(cleanBase64);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);

    const blob = new Blob([byteArray], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    window.URL.revokeObjectURL(url);
  }

  private descargarPdfBase64(base64: string | null | undefined, fileName: string): void {
    if (!base64) return;

    const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
    const byteCharacters = atob(cleanBase64);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);

    const blob = new Blob([byteArray], {
      type: 'application/pdf'
    });

    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.pdf`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    window.URL.revokeObjectURL(url);
  }



  imprimirPdfFicha(): void {
    const base64 = this.pdf;
    if (!base64) return;

    this.openBase64PdfForPrint(base64);
  }


  private openBase64PdfForPrint(base64: string): void {
    const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
    const byteCharacters = atob(cleanBase64);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);

    const win = window.open(url, '_blank');

    if (!win) return;

    win.onload = () => {
      win.focus();
      win.print();
    };
  }




}