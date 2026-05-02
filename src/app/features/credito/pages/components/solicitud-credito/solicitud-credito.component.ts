import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize, Subscription } from 'rxjs';

import {
  JMartAutoFocusDirective,
  JMartAutoFocusNextDirective,
  JMartEngineSyncDirective,
  JMartErrorNotifyDirective,
  JMartMassiveValidationService,
  JMartNumberFormatDirective
} from '@JairMartinez86/jmartinez-validator';

import { NotificationService } from '../../../../../core/services/notification.service';
import { AppConfigService } from '../../../../../core/services/app-config.service';
import { Breadcrumb } from '../../../../../shared/components/breadcrumb/breadcrumb';
import { SolicitudCreditoService } from '../../../services/solicitud-credito.service';
import {
  SocioCreditoResumen,
  SolicitudCreditoForm,
  TipoCreditoItem,
  TipoCreditoReglaItem
} from '../../../interface/solicitud-credito.interface';

interface PropositoCreditoItem {
  id: string;
  tipoCreditoId: string;
  nombre: string;
}

interface ProveedorItem {
  id: string;
  codigo: string;
  nombre: string;
}

@Component({
  selector: 'app-solicitud-credito',
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
    JMartNumberFormatDirective
  ],
  templateUrl: './solicitud-credito.component.html',
  styleUrl: './solicitud-credito.component.scss'
})
export class SolicitudCreditoComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly translate = inject(TranslateService);
  private readonly engine = inject(JMartMassiveValidationService);
  private readonly service = inject(SolicitudCreditoService);

  public readonly notify = inject(NotificationService);
  public readonly appConfigService = inject(AppConfigService);

  private readonly subs = new Subscription();
  private readonly isBrowser: boolean;

  breadcrumbs: any[] = [];
  socioId = '';

  loading = false;
  saving = false;

  estadoSolicitud = 'EN_EVALUACION';

  socio: SocioCreditoResumen | null = null;

  tiposCredito: TipoCreditoItem[] = [];
  propositosCredito: PropositoCreditoItem[] = [];
  propositosCreditoFiltrados: PropositoCreditoItem[] = [];
  proveedores: ProveedorItem[] = [];
  reglasCredito: TipoCreditoReglaItem[] = [];
  reglaCreditoActual: TipoCreditoReglaItem | null = null;

  requiereProveedor = false;

  solicitud: SolicitudCreditoForm & { proveedorId?: string } = {
    tipoCredito: '',
    proposito: '',
    proveedorId: '',
    fechaInicioPago: '',
    montoSolicitado: null,
    plazo: null,
    tasaInteresAnual: 0,
    comisionDesembolso: 0,
    numeroFactura: ''
  };

  laboral = {
    departamento: '',
    nomina: '',
    ingresoEmpresa: 0,
    antiguedadLaboral: ''
  };

  deducciones = {
    cuotaCreditoTiendas: 0,
    pensionAlimenticia: 0,
    otrasCxC: 0,
    cuotaBdf: 0,
    cuotaCoopacsem: 0
  };

  flujoAprobacion = [
    { orden: 1, labelKey: 'solicitudCredito.approval.comiteCredito', estado: 'Pendiente' },
    { orden: 2, labelKey: 'solicitudCredito.approval.comiteVigilancia', estado: 'Pendiente' },
    { orden: 3, labelKey: 'solicitudCredito.approval.juntaDirectiva', estado: 'Pendiente' },
    { orden: 4, labelKey: 'solicitudCredito.approval.desembolso', estado: 'Pendiente' }
  ];

  cuotaDisponibleApi = 0;
  nivelEndeudamientoApi = 0;
  totalDeduccionesApi = 0;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.setBreadcrumbs();

    this.subs.add(
      this.translate.onLangChange.subscribe(() => this.setBreadcrumbs())
    );

    this.socioId =
      this.route.snapshot.paramMap.get('socioId') ??
      this.route.snapshot.paramMap.get('id') ??
      '';

    this.cargarNuevo();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private setBreadcrumbs(): void {
    const value = this.translate.instant('solicitudCredito.breadcrumbs');

    this.breadcrumbs = Array.isArray(value)
      ? value
      : [
          { label: 'Créditos' },
          { label: 'Solicitud de crédito' }
        ];
  }

  get settings(): any {
    return this.appConfigService.getCurrentSettings();
  }

  get currency(): string {
    return this.settings?.currency || 'C$';
  }

  get totalDeducciones(): number {
    return this.totalDeduccionesApi;
  }

  get nivelEndeudamiento(): number {
    return this.nivelEndeudamientoApi * 100;
  }

  get cuotaDisponible(): number {
    return this.cuotaDisponibleApi;
  }

  get interesesTotales(): number {
    const monto = this.toNumber(this.solicitud.montoSolicitado);
    const tasa = this.toNumber(this.solicitud.tasaInteresAnual);
    const plazo = this.toNumber(this.solicitud.plazo);

    if (monto <= 0 || tasa <= 0 || plazo <= 0) return 0;

    const anios = plazo / 24;
    return monto * (tasa / 100) * anios;
  }

  get totalPagar(): number {
    return this.toNumber(this.solicitud.montoSolicitado) + this.interesesTotales;
  }

  get cuotaQuincenal(): number {
    const plazo = this.toNumber(this.solicitud.plazo);

    if (plazo <= 0) return 0;

    return this.totalPagar / plazo;
  }

  get capacidadPagoPorcentaje(): number {
    if (this.cuotaDisponible <= 0) return 100;

    return (this.cuotaQuincenal / this.cuotaDisponible) * 100;
  }

  get montoExcedeLimite(): boolean {
    return this.toNumber(this.solicitud.montoSolicitado) >
      Number(this.socio?.limiteCreditoDisponible ?? 0);
  }

  get montoSinRegla(): boolean {
    const monto = this.toNumber(this.solicitud.montoSolicitado);

    return !!this.solicitud.tipoCredito &&
      monto > 0 &&
      !this.reglaCreditoActual;
  }

  get montoInvalidoPorTipoCredito(): boolean {
    return this.montoSinRegla;
  }

  get excedenteLimite(): number {
    const exceso =
      this.toNumber(this.solicitud.montoSolicitado) -
      Number(this.socio?.limiteCreditoDisponible ?? 0);

    return exceso > 0 ? exceso : 0;
  }

  get cuotaExcedeCapacidad(): boolean {
    return this.cuotaQuincenal > this.cuotaDisponible;
  }

  get esViable(): boolean {
    return !this.montoExcedeLimite &&
      !this.cuotaExcedeCapacidad &&
      !this.montoInvalidoPorTipoCredito;
  }

  get resultadoEvaluacionKey(): string {
    return this.esViable
      ? 'solicitudCredito.evaluation.viable'
      : 'solicitudCredito.evaluation.notViable';
  }

  get capacidadProgress(): number {
    return Math.min(this.capacidadPagoPorcentaje, 100);
  }

  cargarNuevo(): void {
    if (!this.socioId) return;

    this.loading = true;

    this.service.getNuevo(this.socioId)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (res: any) => {
          const data = res?.data ?? res;
          const socio = data?.socio ?? {};

          this.socio = {
            id: String(socio?.id ?? this.socioId),
            codigoSocio: String(socio?.codigoSocio ?? ''),
            nombreCompleto: String(socio?.nombreCompleto ?? ''),
            numeroIdentificacion: String(socio?.numeroIdentificacion ?? ''),
            activo: Boolean(socio?.activo ?? true),
            antiguedadTexto: String(socio?.antiguedadTexto ?? ''),
            fechaIngreso: String(socio?.fechaIngresoTexto ?? socio?.fechaIngreso ?? ''),
            salarioMensual: Number(socio?.salarioMensual ?? 0),
            ahorrosDisponibles: Number(socio?.ahorrosDisponibles ?? socio?.ahorroDisponible ?? 0),
            creditosActivos: Number(socio?.creditosActivos ?? 0),
            limiteCreditoDisponible: Number(socio?.limiteCreditoDisponible ?? 0)
          };

          this.tiposCredito = (data?.tiposCredito ?? []).map((x: any) => ({
            id: String(x?.id ?? ''),
            tipo: String(x?.tipo ?? ''),
            nombre: String(x?.nombre ?? x?.tipoCreditoNombre ?? ''),
            tipoCreditoNombre: String(x?.tipoCreditoNombre ?? x?.nombre ?? ''),
            esQuincenal: Boolean(x?.esQuincenal ?? true),
            requiereProveedor: Boolean(x?.requiereProveedor ?? false)
          } as any));

          this.propositosCredito = (data?.propositosCredito ?? []).map((x: any) => ({
            id: String(x?.id ?? ''),
            tipoCreditoId: String(x?.tipoCreditoId ?? ''),
            nombre: String(x?.nombre ?? '')
          }));

          this.proveedores = (data?.proveedores ?? []).map((x: any) => ({
            id: String(x?.id ?? ''),
            codigo: String(x?.codigo ?? ''),
            nombre: String(x?.nombre ?? '')
          }));

          this.reglasCredito = (data?.reglasCredito ?? []).map((x: any) => ({
            id: String(x?.id ?? ''),
            tipoCreditoId: String(x?.tipoCreditoId ?? ''),
            montoDesde: Number(x?.montoDesde ?? 0),
            montoHasta: x?.montoHasta == null ? null : Number(x.montoHasta),
            comision: Number(x?.comision ?? 0),
            cuotaMaxima: Number(x?.cuotaMaxima ?? 0),
            porcInteresAnual: Number(x?.porcInteresAnual ?? 0),
            mesDesde: x?.mesDesde == null ? null : Number(x.mesDesde),
            mesHasta: x?.mesHasta == null ? null : Number(x.mesHasta),
            proveedorTipo: x?.proveedorTipo == null ? null : String(x.proveedorTipo),
            orden: Number(x?.orden ?? 0)
          } as any));

          this.laboral = {
            departamento: String(data?.laboral?.departamento ?? ''),
            nomina: String(data?.laboral?.nomina ?? ''),
            ingresoEmpresa: Number(data?.laboral?.ingresoEmpresa ?? this.socio.salarioMensual ?? 0),
            antiguedadLaboral: String(data?.laboral?.antiguedadLaboral ?? this.socio.antiguedadTexto ?? '')
          };

          this.deducciones = {
            cuotaCreditoTiendas: Number(data?.deducciones?.cuotaCreditoTiendas ?? 0),
            pensionAlimenticia: Number(data?.deducciones?.pensionAlimenticia ?? 0),
            otrasCxC: Number(data?.deducciones?.otrasCxC ?? 0),
            cuotaBdf: Number(data?.deducciones?.cuotaBdf ?? 0),
            cuotaCoopacsem: Number(data?.deducciones?.cuotaCoopacsem ?? 0)
          };

          this.totalDeduccionesApi = Number(data?.deducciones?.totalDeducciones ?? 0);
          this.cuotaDisponibleApi = Number(data?.deducciones?.cuotaDisponible ?? 0);
          this.nivelEndeudamientoApi = Number(data?.deducciones?.nivelEndeudamiento ?? 0);

          this.solicitud.fechaInicioPago = this.toDateInput(data?.fechaInicioPago ?? data?.fechaServidor);
          this.solicitud.montoSolicitado = null;
          this.solicitud.plazo = null;
          this.solicitud.tasaInteresAnual = 0;
          this.solicitud.comisionDesembolso = 0;

          if (this.tiposCredito.length > 0) {
            this.solicitud.tipoCredito = this.tiposCredito[0].id;
            this.onTipoCreditoChange();
          } else {
            this.propositosCreditoFiltrados = [];
            this.requiereProveedor = false;
            this.solicitud.tipoCredito = '';
            this.solicitud.proposito = '';
            this.solicitud.proveedorId = '';
            this.reglaCreditoActual = null;
          }
        },
        error: (err: any) => {
          this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
        }
      });
  }

  onTipoCreditoChange(): void {
    const tipo = this.tiposCredito.find(x => x.id === this.solicitud.tipoCredito) as any;

    if (!tipo) {
      this.propositosCreditoFiltrados = [];
      this.requiereProveedor = false;
      this.solicitud.proposito = '';
      this.solicitud.proveedorId = '';
      this.solicitud.tasaInteresAnual = 0;
      this.solicitud.comisionDesembolso = 0;
      this.solicitud.plazo = null;
      this.reglaCreditoActual = null;
      return;
    }

    this.requiereProveedor = Boolean(tipo.requiereProveedor);

    if (!this.requiereProveedor) {
      this.solicitud.proveedorId = '';
    }

    this.filtrarPropositosPorTipo();
    this.aplicarReglaCreditoPorMonto();
  }

  private filtrarPropositosPorTipo(): void {
    this.propositosCreditoFiltrados = this.propositosCredito
      .filter(x => x.tipoCreditoId === this.solicitud.tipoCredito);

    this.solicitud.proposito =
      this.propositosCreditoFiltrados.length > 0
        ? this.propositosCreditoFiltrados[0].id
        : '';
  }

  onMontoChange(): void {
    this.aplicarReglaCreditoPorMonto();
  }

  private aplicarReglaCreditoPorMonto(): void {
    const monto = this.toNumber(this.solicitud.montoSolicitado);

    if (!this.solicitud.tipoCredito || monto <= 0) {
      this.reglaCreditoActual = null;
      this.solicitud.tasaInteresAnual = 0;
      this.solicitud.comisionDesembolso = 0;
      this.solicitud.plazo = null;
      return;
    }

    const regla = this.reglasCredito
      .filter(x =>
        x.tipoCreditoId === this.solicitud.tipoCredito &&
        monto >= Number(x.montoDesde ?? 0) &&
        (
          x.montoHasta == null ||
          monto <= Number(x.montoHasta)
        )
      )
      .sort((a, b) => {
        const ordenA = Number((a as any).orden ?? 0);
        const ordenB = Number((b as any).orden ?? 0);

        if (ordenA !== ordenB) return ordenA - ordenB;

        return Number(a.montoDesde ?? 0) - Number(b.montoDesde ?? 0);
      })[0] ?? null;

    this.reglaCreditoActual = regla;

    if (!regla) {
      this.solicitud.tasaInteresAnual = 0;
      this.solicitud.comisionDesembolso = 0;
      this.solicitud.plazo = null;
      return;
    }

    this.solicitud.tasaInteresAnual = Number(regla.porcInteresAnual ?? 0);
    this.solicitud.comisionDesembolso = Number(regla.comision ?? 0);

    const cuotaMaxima = Number(regla.cuotaMaxima ?? 0);

    if (cuotaMaxima > 0) {
      this.solicitud.plazo = cuotaMaxima;
    } else {
      this.solicitud.plazo = null;
    }
  }

  onPlazoChange(): void {
    // recalculado por getters
  }

  ajustarMaximoPermitido(): void {
    this.solicitud.montoSolicitado = Number(this.socio?.limiteCreditoDisponible ?? 0);
    this.aplicarReglaCreditoPorMonto();
  }

  guardarBorrador(): void {
    console.log(this.buildPayload(false));
  }

  enviarAprobacion(): void {
    if (!this.esViable) {
      this.notify.show(
        this.translate.instant('solicitudCredito.messages.notViable'),
        '',
        'warning'
      );
      return;
    }

    console.log(this.buildPayload(true));
  }

  simular(): void {
    this.onMontoChange();
  }

  imprimir(): void {
    if (!this.isBrowser) return;
    window.print();
  }

  cancelar(): void {
    if (!this.isBrowser) return;
    history.back();
  }

  private buildPayload(enviarAprobacion: boolean): any {
    return {
      socioId: this.socioId,
      tipoCredito: this.solicitud.tipoCredito,
      proposito: this.solicitud.proposito,
      proveedorId: this.requiereProveedor ? this.solicitud.proveedorId : null,
      tipoCreditoReglaId: this.reglaCreditoActual?.id ?? null,
      fechaInicioPago: this.solicitud.fechaInicioPago,
      montoSolicitado: this.toNumber(this.solicitud.montoSolicitado),
      montoInvalidoPorTipoCredito: this.montoInvalidoPorTipoCredito,
      plazo: this.toNumber(this.solicitud.plazo),
      tasaInteresAnual: this.toNumber(this.solicitud.tasaInteresAnual),
      comisionDesembolso: this.toNumber(this.solicitud.comisionDesembolso),
      numeroFactura: this.solicitud.numeroFactura?.trim() ?? '',
      cuotaQuincenal: this.cuotaQuincenal,
      interesesTotales: this.interesesTotales,
      totalPagar: this.totalPagar,
      capacidadPagoPorcentaje: this.capacidadPagoPorcentaje,
      nivelEndeudamientoPorcentaje: this.nivelEndeudamiento,
      totalDeducciones: this.totalDeducciones,
      cuotaDisponible: this.cuotaDisponible,
      resultadoEvaluacion: this.esViable ? 'Viable' : 'NoViable',
      enviarAprobacion
    };
  }

  formatCurrency(value: number | null | undefined): string {
    const decimalSeparator = this.settings?.decimalSeparator ?? '.';
    const thousandSeparator = this.settings?.thousandSeparator ?? ',';

    const numberValue = Number(value ?? 0);

    const parts = numberValue.toFixed(2).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator);

    return parts.join(decimalSeparator);
  }

  formatPercent(value: number | null | undefined): string {
    return `${Number(value ?? 0).toFixed(2)} %`;
  }

  private toNumber(value: any): number {
    if (value == null || value === '') return 0;

    const decimalSeparator = this.settings?.decimalSeparator ?? '.';
    const thousandSeparator = this.settings?.thousandSeparator ?? ',';

    let text = String(value).trim();

    text = text.split(thousandSeparator).join('');

    if (decimalSeparator !== '.') {
      text = text.replace(decimalSeparator, '.');
    }

    const number = Number(text);

    return isNaN(number) ? 0 : number;
  }

  private toDateInput(value: any): string {
    if (!value) return '';

    const date = new Date(value);

    if (isNaN(date.getTime())) {
      return String(value).substring(0, 10);
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}