import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  inject
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize, Subscription } from 'rxjs';
import { TableFilterService } from '../../../../../../core/services/table-filter.service';
import { AppConfigService } from '../../../../../../core/services/app-config.service';
import { NotificationService } from '../../../../../../core/services/notification.service';
import { CreditosActivosService } from '../../../../services/creditos-activos.service';



type CreditoFiltersValue = {
  search: string;
  tipoPrestamo: string;
  estado: string;
  fechaCorte: string;
};

type PeriodoReporte = 'corte' | 'rango' | 'mes' | 'anio';

@Component({
  selector: 'app-credito-filters',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule
  ],
  templateUrl: './credito-filters.component.html',
  styleUrl: './credito-filters.component.scss',
})
export class CreditoFiltersComponent implements OnInit, OnDestroy {
  @Output() filtersChange = new EventEmitter<CreditoFiltersValue>();
  @Input() tipoCredito: any[] = [];

  private readonly filterSvc = inject(TableFilterService);
  private readonly appConfigService = inject(AppConfigService);
  private readonly notify = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly service = inject(CreditosActivosService);

  private readonly subs = new Subscription();
  private readonly filterKey = 'creditos-activos';

  search = '';
  tipoPrestamo = 'Todos';
  estado = 'Todos';
  requireEnter = false;

  reports: any[] = [
    {
      titleKey: 'creditosActivos.reports.saldoActualCartera.title',
      subtitleKey: 'creditosActivos.reports.saldoActualCartera.subtitle',
      type: 'saldoActualCartera'
    },
    {
      titleKey: 'creditosActivos.reports.saldoHistoricoCartera.title',
      subtitleKey: 'creditosActivos.reports.saldoHistoricoCartera.subtitle',
      type: 'saldoHistoricoCartera'
    },
    {
      titleKey: 'creditosActivos.reports.montoDisponibleSocio.title',
      subtitleKey: 'creditosActivos.reports.montoDisponibleSocio.subtitle',
      type: 'montoDisponibleSocio'
    },
    {
      titleKey: 'creditosActivos.reports.movimientoCredito.title',
      subtitleKey: 'creditosActivos.reports.movimientoCredito.subtitle',
      type: 'movimientoCredito'
    }
  ];

  reporteSeleccionado: any | null = 'saldoActualCartera';
  procesandoReporte = false;


  estadoReporte: '' | 'Activo' | 'Inactivo' = '';

  fechaInicioReporte: string | null = null;
  fechaFinReporte: string | null = null;

  periodoReporte: PeriodoReporte = 'corte';

  mesReporte = new Date().getMonth() + 1;
  anioReporte = new Date().getFullYear();

  mesesReporte = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' }
  ];

  ngOnInit(): void {
    this.anioReporte = new Date(this.getFechaHoy()).getFullYear();
    this.fechaFinReporte = this.getFechaHoy();

    this.subs.add(
      this.filterSvc.requireEnter$(this.filterKey).subscribe(value => {
        this.requireEnter = value;
      })
    );

    this.subs.add(
      this.filterSvc.draft$(this.filterKey).subscribe((draft: string) => {
        const nextValue = this.toText(draft);

        if (this.search !== nextValue) {
          this.search = nextValue;
        }
      })
    );

    this.subs.add(
      this.filterSvc.query$(this.filterKey).subscribe((query: string) => {
        this.filtersChange.emit({
          search: this.toText(query).trim(),
          tipoPrestamo: this.toText(this.tipoPrestamo),
          estado: this.toText(this.estado),
          fechaCorte: this.toText(this.fechaFinReporte)
        });
      })
    );

    this.reporteSeleccionado = this.reports[0];

  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  onSearchInputChange(): void {
    const value = this.toText(this.search);
    this.filterSvc.setDraft(this.filterKey, value);

    if (this.requireEnter) {
      return;
    }

    this.applySearch(value);
  }

  onSearchKeyup(event: KeyboardEvent): void {
    if (!this.requireEnter) {
      return;
    }

    if (event.key !== 'Enter') {
      return;
    }

    this.applySearch(this.search);
  }

  onTipoPrestamoChange(): void {
    this.emitFiltersUsingCurrentSearch();
  }

  onEstadoChange(): void {
    this.estadoReporte = this.estado as any;
    this.emitFiltersUsingCurrentSearch();
  }

  clearFilters(): void {
    this.search = '';
    this.tipoPrestamo = '';
    this.estado = '';
    this.estadoReporte = '';

    this.filterSvc.clear(this.filterKey);

    this.filtersChange.emit({
      search: '',
      tipoPrestamo: '',
      estado: '',
      fechaCorte: this.toText(this.fechaFinReporte)
    });
  }
  seleccionarReporte(report: any): void {
    this.reporteSeleccionado = report;
   
    this.estadoReporte = this.estado as any;



    if (['saldoActualCartera', 'montoDisponibleSocio'].includes(String(report.type))) {
      this.periodoReporte = 'corte';
      this.fechaInicioReporte = null;
      this.fechaFinReporte = this.getFechaHoy();

      return;
    }



    this.periodoReporte = 'rango';
    this.fechaInicioReporte = this.getPrimerDiaMesActual();
    this.fechaFinReporte = this.getFechaHoy();

  }

  setPeriodoReporte(tipo: PeriodoReporte): void {
    this.periodoReporte = tipo;

    if (tipo === 'corte') {
      this.fechaInicioReporte = null;
      this.fechaFinReporte = this.getFechaHoy();
      return;
    }

    if (tipo === 'rango') {
      this.fechaInicioReporte = this.getPrimerDiaMesActual();
      this.fechaFinReporte = this.getFechaHoy();
      return;
    }

    if (tipo === 'mes') {
      const inicio = new Date(this.anioReporte, this.mesReporte - 1, 1);
      const fin = new Date(this.anioReporte, this.mesReporte, 0);

      this.fechaInicioReporte = this.formatDateInput(inicio);
      this.fechaFinReporte = this.formatDateInput(fin);
      return;
    }

    if (tipo === 'anio') {
      this.fechaInicioReporte = `${this.anioReporte}-01-01`;
      this.fechaFinReporte = `${this.anioReporte}-12-31`;
    }
  }

  onMesReporteChange(): void {
    if (this.periodoReporte === 'mes') {
      this.setPeriodoReporte('mes');
    }
  }

  onAnioReporteChange(): void {
    if (this.periodoReporte === 'mes') {
      this.setPeriodoReporte('mes');
      return;
    }

    if (this.periodoReporte === 'anio') {
      this.setPeriodoReporte('anio');
    }
  }

  procesarReporte(accion: 'print' | 'pdf' | 'excel'): void {


    switch (this.reporteSeleccionado.type) {
      case 'saldoActualCartera':
        this.procesarSaldoCartera(accion);
        return;

      case 'saldoHistoricoCartera':
        this.procesarSaldosHistoricosAhorro(accion);
        return;

      case 'montoDisponibleSocio':
        this.procesarIntegracionAhorro(accion);
        return;

      case 'movimientoCredito':
        this.procesarSaldosAfiliacion(accion);
        return;


      default:
        this.notify.show(
          this.translate.instant('creditosActivos.exportModal.notImplemented'),
          '',
          'warning'
        );
        return;
    }
  }

  private procesarSaldoCartera(accion: 'print' | 'pdf' | 'excel'): void {
    const formato: 'pdf' | 'excel' = accion === 'excel' ? 'excel' : 'pdf';

    this.procesandoReporte = true;
    console.log(this.estado);

    this.service.getReporteSaldosCartera(
      this.fechaFinReporte!,
      this.estado,
      formato,
    )
      .pipe(finalize(() => this.procesandoReporte = false))
      .subscribe({
        next: (res: any) => {
          const archivo = res?.data?.archivo ?? '';
          const base = this.getNombreBaseReporte('saldoActualCartera');

          this.procesarArchivoSalida(accion, archivo, `${base}`);
        },
        error: (err: any) => {
          this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
        }
      });
  }

  private procesarSaldosHistoricosAhorro(accion: 'print' | 'pdf' | 'excel'): void {
    const formato: 'pdf' | 'excel' = accion === 'excel' ? 'excel' : 'pdf';

    this.procesandoReporte = true;


    /* this.service.getReporteSaldosHistoricosAhorro(
       this.tipoCuentaReporte,
       formato,
       this.fechaInicioReporte,
       this.fechaFinReporte,
       this.estadoReporte
     )
       .pipe(finalize(() => this.procesandoReporte = false))
       .subscribe({
         next: (res: any) => {
           const archivo = res?.data?.archivo ?? '';
           const base = this.getNombreBaseReporte('saldosHistoricosAhorro');
           const cuenta = this.getNombreTipoCuenta(this.tipoCuentaReporte);
 
           this.procesarArchivoSalida(accion, archivo, `${base} - ${cuenta}`);
         },
         error: (err: any) => {
           this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
         }
       });*/
  }

  private procesarSaldosAfiliacion(accion: 'print' | 'pdf' | 'excel'): void {
    const formato: 'pdf' | 'excel' = accion === 'excel' ? 'excel' : 'pdf';

    this.procesandoReporte = true;


    /* this.service.getReporteAfiliacionMembresia(
       formato,
       this.fechaFinReporte,
       this.estadoReporte
     )
       .pipe(finalize(() => this.procesandoReporte = false))
       .subscribe({
         next: (res: any) => {
           const archivo = res?.data?.archivo ?? '';
           const base = this.getNombreBaseReporte('saldosAfiliacion');
 
           this.procesarArchivoSalida(accion, archivo, base);
         },
         error: (err: any) => {
           this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
         }
       });*/
  }

  private procesarPagosAfiliaciones(accion: 'print' | 'pdf' | 'excel'): void {
    const formato: 'pdf' | 'excel' = accion === 'excel' ? 'excel' : 'pdf';

    this.procesandoReporte = true;

    /* this.service.getReportePagosAfiliaciones(
       formato,
       this.fechaInicioReporte,
       this.fechaFinReporte,
       this.estadoReporte
     )
       .pipe(finalize(() => this.procesandoReporte = false))
       .subscribe({
         next: (res: any) => {
           const archivo = res?.data?.archivo ?? '';
           const base = this.getNombreBaseReporte('deduccionesAfiliacion');
 
           this.procesarArchivoSalida(accion, archivo, base);
         },
         error: (err: any) => {
           this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
         }
       });*/
  }

  private procesarIntegracionAhorro(accion: 'print' | 'pdf' | 'excel'): void {
    const formato: 'pdf' | 'excel' = accion === 'excel' ? 'excel' : 'pdf';

    this.procesandoReporte = true;

    /*this.service.getReporteIntegracionAhorro(
      formato,
      this.anioReporte,
      this.tipoCuentaReporte,
      this.estadoReporte
    )
      .pipe(finalize(() => this.procesandoReporte = false))
      .subscribe({
        next: (res: any) => {
          const archivo = res?.data?.archivo ?? '';
          const base = this.getNombreBaseReporte('integracionAhorro');

          this.procesarArchivoSalida(
            accion,
            archivo,
            `${base} - ${this.anioReporte}`
          );
        },
        error: (err: any) => {
          this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
        }
      });*/
  }

  private procesarArchivoSalida(
    accion: 'print' | 'pdf' | 'excel',
    archivo: string,
    nombreBase: string
  ): void {
    if (accion === 'print') {
      this.imprimirPdf(archivo);
      return;
    }

    if (accion === 'pdf') {
      this.descargarArchivo(
        archivo,
        this.getNombreArchivo(nombreBase, 'pdf'),
        'application/pdf'
      );
      return;
    }

    if (accion === 'excel') {
      this.descargarArchivo(
        archivo,
        this.getNombreArchivo(nombreBase, 'xlsx'),
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
    }
  }

  private descargarArchivo(base64: string, fileName: string, mimeType: string): void {
    if (!base64) {
      this.notify.show(
        this.translate.instant('creditosActivos.exportModal.fileNotAvailable'),
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
        this.translate.instant('creditosActivos.exportModal.fileNotAvailable'),
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

  private applySearch(value: unknown): void {
    const normalized = this.toText(value).trim();

    this.filterSvc.setDraft(this.filterKey, normalized);
    this.filterSvc.setQuery(this.filterKey, normalized);
  }

  public emitFiltersUsingCurrentSearch(): void {
    const currentQuery = this.toText(this.search).trim();

    this.filtersChange.emit({
      search: currentQuery,
      tipoPrestamo: this.toText(this.tipoPrestamo),
      estado: this.toText(this.estado),
      fechaCorte: this.toText(this.fechaFinReporte)
    });
  }

  private toText(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private getFechaHoy(): string {
    return this.appConfigService.getCurrentSettings().fechaServidor;
  }

  private getPrimerDiaMesActual(): string {
    const fecha = new Date();

    return this.formatDateInput(
      new Date(
        fecha.getFullYear(),
        fecha.getMonth(),
        1
      )
    );
  }

  private formatDateInput(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  get aniosReporte(): number[] {
    const actual = new Date(this.getFechaHoy()).getFullYear();
    const anios: number[] = [];

    for (let y = actual; y >= 2000; y--) {
      anios.push(y);
    }

    return anios;
  }


  private getNombreArchivo(base: string, extension: string): string {
    const rango = this.getTextoRangoFechas();
    const estado = this.getTextoEstado();

    return `COOPACSEM - ${base} ${rango} ${estado}.${extension}`;
  }

  private getNombreBaseReporte(type: string): string {
    switch (type) {
      case 'saldoActualCartera':
        return 'SALDO CARTERA';


      default:
        return 'REPORTE';
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

    return `AL ${this.getFechaHoy()}`;
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
    if (!fecha) return '';

    const raw = fecha.substring(0, 10);
    const parts = raw.split('-');

    if (parts.length === 3) {
      const [yyyy, mm, dd] = parts;
      return `${dd}/${mm}/${yyyy}`;
    }

    return fecha;
  }

  get permiteSoloCorte(): boolean {
    return [
      'saldoActualCartera',
      'montoDisponibleSocio'
    ].includes(this.reporteSeleccionado?.type);
  }




}