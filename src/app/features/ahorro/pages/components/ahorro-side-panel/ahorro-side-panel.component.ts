import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnDestroy, OnInit } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  ActionItem,
  PlanRow,
  ReportItem,
  SocioAlerts,
  SocioDetail
} from '../../../interface/ahorro.models';
import { Router } from '@angular/router';
import { AppConfigService } from '../../../../../core/services/app-config.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { AppPermissionDirective } from '../../../../../core/services/app-permission.directive';

import {
  ApexChart,
  ApexDataLabels,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexResponsive,
  ApexTooltip,
  ChartComponent
} from 'ng-apexcharts';
import { finalize, Subscription } from 'rxjs';
import { EstadoCuentaService } from '../../../services/estado.cuenta.service';
import { FormsModule } from '@angular/forms';
import { JMartAutoFocusNextDirective } from '@JairMartinez86/jmartinez-validator';

export interface SocioAlertItem {
  code: string;
  messageKey: string;
  severity: 'info' | 'warning' | 'danger';
  params?: Record<string, string>;
}


@Component({
  selector: 'app-ahorro-side-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    AppPermissionDirective,
    ChartComponent,
   JMartAutoFocusNextDirective,
  ],
  templateUrl: './ahorro-side-panel.component.html',
  styleUrl: './ahorro-side-panel.component.scss',
})
export class AhorroSidePanelComponent implements OnInit, OnDestroy {
  @Input() actions: ActionItem[] = [];
  @Input() alerts: SocioAlerts | null = null;
  @Input() reports: ReportItem[] = [];
  @Input() planesRows: PlanRow[] = [];
  @Input() selectedSocio: SocioDetail | null = null;

  private langChangeSub?: Subscription;

  private readonly router = inject(Router);
  private readonly appConfigService = inject(AppConfigService);
  private readonly notify = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly service = inject(EstadoCuentaService);

  public pieLabels: string[] = [];


  tipoCuentaReporte: 'Corriente' | 'Navidena' | '' = '';
    reporteSeleccionado: any | null = null;
    modalReporteOpen = false;
    procesandoReporte = false;
    fechaInicioReporte: string | null = null;
    fechaFinReporte: string | null = null;
    estadoReporte: '' | 'Activo' | 'Inactivo' = '';
    anioReporte: number = 0;


  get navidenaRows(): PlanRow[] {
    return (this.planesRows || []).filter(x => x.tipoCuenta === 'Navidena');
  }

  get alertItems(): SocioAlertItem[] {
    return this.alerts?.items ?? [];
  }

  ngOnInit(): void {
    this.setLabels();

    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.setLabels();
    });
  }

  ngOnDestroy(): void {
    this.langChangeSub?.unsubscribe();
  }

  private setLabels(): void {
    this.pieLabels = [
      this.translate.instant('ahorro.chart.labels.saved'),
      this.translate.instant('ahorro.chart.labels.withdrawn'),
      this.translate.instant('ahorro.chart.labels.interests')
    ];
  }

  public pieChart: ApexChart = {
    type: 'pie',
    height: 280,
    background: 'transparent'
  };

  public pieColors: string[] = [
    '#10b981',
    '#f59e0b',
    '#3b82f6'
  ];

  public pieLegend: ApexLegend = {
    position: 'bottom'
  };

  public pieDataLabels: ApexDataLabels = {
    enabled: true,
    formatter: (_val: number, opts?: any) => {
      const value = opts?.w?.config?.series?.[opts.seriesIndex] ?? 0;
      return this.formatCurrency(value);
    }
  };

  public pieTooltip: ApexTooltip = {
    y: {
      formatter: (value: number) => this.formatCurrency(value)
    }
  };

  public pieResponsive: ApexResponsive[] = [
    {
      breakpoint: 576,
      options: {
        chart: { height: 240 },
        legend: { position: 'bottom' }
      }
    }
  ];

  get chartSeries(): ApexNonAxisChartSeries {
    return [
      Number(this.selectedSocio?.totalAhorro ?? 0),
      Number(this.selectedSocio?.totalRetirado ?? 0),
      Number((this.selectedSocio as any)?.totalIntereses ?? 0)
    ];
  }

  formatCurrency(v: number | null | undefined): string {
    const c = this.appConfigService.getCurrentSettings().currency || 'NIO';
    return `${c} ${Number(v ?? 0).toLocaleString('es-NI', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  getAlertBadgeClass(severity: 'info' | 'warning' | 'danger'): string {
    switch (severity) {
      case 'danger':
        return 'badge-soft-danger';
      case 'warning':
        return 'badge-soft-warning';
      default:
        return 'badge-soft-info';
    }
  }

  getAlertIcon(severity: 'info' | 'warning' | 'danger'): string {
    switch (severity) {
      case 'danger':
      case 'warning':
        return 'fa-triangle-exclamation';
      default:
        return 'fa-circle-info';
    }
  }

  onActionClick(action: ActionItem): void {
    if (this.selectedSocio == null) {
      this.notify.show(
        this.translate.instant('ahorro.messages.selectRequired'),
        this.translate.instant('ahorro.common.info'),
        'warning'
      );
      return;
    }

    if (!this.selectedSocio.activo) {
      this.notify.show(
        this.translate.instant('ahorro.messages.inactive'),
        this.translate.instant('ahorro.common.info'),
        'warning'
      );
      return;
    }

    if (!this.selectedSocio.cuentaCorrienteActiva) {
      this.notify.show(
        this.translate.instant('socios.messages.noActiveCurrentAccount'),
        this.translate.instant('socios.common.info'),
        'warning'
      );
      return;
    }

    switch (action.titleKey) {
      case 'ahorro.actions.newDeposit':
        this.router.navigate(['/socio-ahorro/new', this.selectedSocio.id]);
        break;

      case 'ahorro.actions.newWithdrawal':
        this.router.navigate(['/socio-retiro/new', this.selectedSocio.id]);
        break;

      case 'ahorro.actions.newSaving':
        this.router.navigate(['/apertura-cuenta-navidena', this.selectedSocio.id]);
        break;

      case 'ahorro.actions.affiliation':
        this.router.navigate(['/socio-afiliacion-pago/new', this.selectedSocio.id]);
        break;

      case 'ahorro.actions.increaseInstallment':
        this.router.navigate(['/cambio-cuota/new', this.selectedSocio.id, 'Incremento']);
        break;

      case 'ahorro.actions.decreaseInstallment':
        this.router.navigate(['/cambio-cuota/new', this.selectedSocio.id, 'Disminucion']);
        break;
    }
  }

  get orderedActions() {
    return [...this.actions].sort((a, b) => a.order - b.order);
  }





  //REPORTES
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
  
          return `AL ${this.appConfigService.getCurrentSettings().fechaServidor}`;
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
          return this.appConfigService.getCurrentSettings().fechaServidor;
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
          const actual = new Date(this.appConfigService.getCurrentSettings().fechaServidor).getFullYear();
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