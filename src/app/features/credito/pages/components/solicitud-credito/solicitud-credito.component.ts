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
  PlanPagoItem,
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
  montoTouched = false;

  estadoSolicitud = 'EN_EVALUACION';

  socio: SocioCreditoResumen | null = null;

  tiposCredito: TipoCreditoItem[] = [];
  propositosCredito: PropositoCreditoItem[] = [];
  propositosCreditoFiltrados: PropositoCreditoItem[] = [];
  proveedores: ProveedorItem[] = [];
  reglasCredito: TipoCreditoReglaItem[] = [];
  reglaCreditoActual: TipoCreditoReglaItem | null = null;

  planPagos: PlanPagoItem[] = [];
  mostrarModalPlan = false;

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

    this.configurarValidacionesCredito();

    this.subs.add(
      this.translate.onLangChange.subscribe(() => {
        this.setBreadcrumbs();
        this.configurarValidacionesCredito();
        this.sincronizarValoresValidacion();
      })
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
    const totalApi = Number(this.totalDeduccionesApi ?? 0);

    if (totalApi > 0) {
      return totalApi;
    }

    return this.totalDeduccionesCalculadas;
  }

  get totalDeduccionesCalculadas(): number {
    return (
      Number(this.deducciones.cuotaCreditoTiendas ?? 0) +
      Number(this.deducciones.pensionAlimenticia ?? 0) +
      Number(this.deducciones.otrasCxC ?? 0) +
      Number(this.deducciones.cuotaBdf ?? 0) +
      Number(this.deducciones.cuotaCoopacsem ?? 0)
    );
  }

  get nivelEndeudamiento(): number {
    return this.normalizarPorcentaje(this.nivelEndeudamientoApi);
  }

  get nivelEndeudamientoBase(): number {
    return this.normalizarPorcentaje(this.nivelEndeudamientoApi);
  }

  get cuotaDisponible(): number {
    return this.cuotaDisponibleApi;
  }

  get tipoCreditoActual(): TipoCreditoItem | null {
    return this.tiposCredito.find(x =>
      String(x.id) === String(this.solicitud.tipoCredito)
    ) ?? null;
  }

  get esQuincenal(): boolean {
    return this.toBoolean((this.tipoCreditoActual as any)?.esQuincenal ?? true);
  }

  get etiquetaPeriodoKey(): string {
    return this.esQuincenal
      ? 'solicitudCredito.fields.quincenas'
      : 'solicitudCredito.fields.meses';
  }

  get planPreview(): PlanPagoItem[] {
    return this.generarPlanPagos();
  }

  get cuotaQuincenal(): number {
    const plan = this.planPreview;

    if (plan.length === 0) return 0;

    return plan[0].cuota;
  }

  get cuotaNuevoCredito(): number {
    return this.cuotaQuincenal;
  }

  get interesesTotales(): number {
    const plan = this.planPreview;

    return this.round2(plan.reduce((sum, x) => sum + Number(x.pagoInteres ?? 0), 0));
  }

  get totalPagar(): number {
    const plan = this.planPreview;

    return this.round2(plan.reduce((sum, x) => sum + Number(x.cuota ?? 0), 0));
  }

  get totalDeduccionesProyectadas(): number {
    return this.totalDeducciones + this.cuotaNuevoCredito;
  }

  get nivelEndeudamientoProyectado(): number {
    const salario = Number((this.socio as any)?.salarioMensual ?? 0);

    if (salario <= 0) return 0;

    return (this.totalDeduccionesProyectadas / salario) * 100;
  }

  get capacidadPagoPorcentaje(): number {
    if (this.cuotaDisponible <= 0) return 100;

    return (this.cuotaQuincenal / this.cuotaDisponible) * 100;
  }

  get montoExcedeLimite(): boolean {
    const monto = this.toNumber(this.solicitud.montoSolicitado);

    if (monto <= 0) return false;

    return monto > Number((this.socio as any)?.limiteCreditoDisponible ?? 0);
  }

  get montoInvalidoPorTipoCredito(): boolean {
    const monto = this.toNumber(this.solicitud.montoSolicitado);

    if (!this.solicitud.tipoCredito || monto <= 0) return false;

    return this.reglaCreditoActual == null;
  }

  get montoSolicitadoInvalido(): boolean {
    if (!this.montoTouched) return false;

    const monto = this.toNumber(this.solicitud.montoSolicitado);
    return monto <= 0;
  }


  get excedenteLimite(): number {
    const exceso =
      this.toNumber(this.solicitud.montoSolicitado) -
      Number((this.socio as any)?.limiteCreditoDisponible ?? 0);

    return exceso > 0 ? exceso : 0;
  }

  get cuotaExcedeCapacidad(): boolean {
    const monto = this.toNumber(this.solicitud.montoSolicitado);

    if (monto <= 0) return false;

    return this.cuotaQuincenal > this.cuotaDisponible;
  }

  get mesNoPermitidoPorRegla(): boolean {
    if (!this.reglaCreditoActual) return false;

    const mesDesde = Number((this.reglaCreditoActual as any).mesDesde ?? 0);
    const mesHasta = Number((this.reglaCreditoActual as any).mesHasta ?? 0);

    if (mesDesde <= 0 && mesHasta <= 0) return false;

    const fecha = this.solicitud.fechaInicioPago
      ? new Date(this.solicitud.fechaInicioPago + 'T00:00:00')
      : new Date();

    const mesActual = fecha.getMonth() + 1;

    if (mesDesde > 0 && mesActual < mesDesde) return true;
    if (mesHasta > 0 && mesActual > mesHasta) return true;

    return false;
  }

  get porcMinPrincipalPagadoTipo(): number {
    return Number((this.tipoCreditoActual as any)?.porcMinPrincipalPagado ?? 0);
  }

  get noTieneCreditosVigentes(): boolean {
    const porcMin = this.porcMinPrincipalPagadoTipo;

    if (porcMin <= 0) return false;

    return !this.toBoolean((this.socio as any)?.tieneCreditosVigentes ?? false);
  }

  get noCumplePorcentajePrincipalPagado(): boolean {
    const porcMin = this.porcMinPrincipalPagadoTipo;

    if (porcMin <= 0) return false;

    const porcentaje = Number((this.socio as any)?.porcentajePrincipalPagado ?? 0);

    return porcentaje < porcMin;
  }

  get plazoExcedeMaximoRegla(): boolean {
    if (!this.reglaCreditoActual) return false;

    const plazo = this.toNumber(this.solicitud.plazo);
    const maximo = Number((this.reglaCreditoActual as any)?.cuotaMaxima ?? 0);

    if (plazo <= 0 || maximo <= 0) return false;

    return plazo > maximo;
  }

  get esViable(): boolean {
    return !this.montoExcedeLimite &&
      !this.cuotaExcedeCapacidad &&
      !this.montoInvalidoPorTipoCredito &&
      !this.mesNoPermitidoPorRegla &&
      !this.noCumplePorcentajePrincipalPagado &&
      !this.noTieneCreditosVigentes &&
      !this.plazoExcedeMaximoRegla;
  }

  get resultadoEvaluacionKey(): string {
    return this.esViable
      ? 'solicitudCredito.evaluation.viable'
      : 'solicitudCredito.evaluation.notViable';
  }

  get capacidadProgress(): number {
    return Math.min(this.capacidadPagoPorcentaje, 100);
  }

  get totalPlanCuota(): number {
    return this.round2(this.planPagos.reduce((sum, x) => sum + x.cuota, 0));
  }

  get totalPlanPrincipal(): number {
    return this.round2(this.planPagos.reduce((sum, x) => sum + x.pagoPrincipal, 0));
  }

  get totalPlanInteres(): number {
    return this.round2(this.planPagos.reduce((sum, x) => sum + x.pagoInteres, 0));
  }

  cargarNuevo(): void {
    if (!this.socioId) return;

    this.loading = true;

    this.service.getNuevo(this.socioId)
      .pipe(finalize(() => {
        this.loading = false;
        this.sincronizarValoresValidacion();
        this.engine.clearErrors();
      }))
      .subscribe({
        next: (res: any) => {
          const data = res?.data ?? res;
          const socio = data?.socio ?? {};

          this.socio = {
            id: String(socio?.id ?? this.socioId),
            codigoSocio: String(socio?.codigoSocio ?? ''),
            nombreCompleto: String(socio?.nombreCompleto ?? ''),
            numeroIdentificacion: String(socio?.numeroIdentificacion ?? ''),
            activo: this.toBoolean(socio?.activo ?? true),
            antiguedadTexto: String(socio?.antiguedadTexto ?? ''),
            fechaIngreso: String(socio?.fechaIngresoTexto ?? socio?.fechaIngreso ?? ''),
            salarioMensual: Number(socio?.salarioMensual ?? 0),
            ahorrosDisponibles: Number(socio?.ahorrosDisponibles ?? socio?.ahorroDisponible ?? 0),
            creditosActivos: Number(socio?.creditosActivos ?? 0),
            limiteCreditoDisponible: Number(socio?.limiteCreditoDisponible ?? 0),
            porcentajePrincipalPagado: Number(socio?.porcentajePrincipalPagado ?? 0),
            tieneCreditosVigentes: this.toBoolean(socio?.tieneCreditosVigentes ?? false)
          } as any;

          this.tiposCredito = (data?.tiposCredito ?? []).map((x: any) => ({
            id: String(x?.id ?? ''),
            tipo: String(x?.tipo ?? ''),
            nombre: String(x?.nombre ?? x?.tipoCreditoNombre ?? ''),
            tipoCreditoNombre: String(x?.tipoCreditoNombre ?? x?.nombre ?? ''),
            esQuincenal: this.toBoolean(x?.esQuincenal ?? true),
            requiereProveedor: this.toBoolean(x?.requiereProveedor ?? false),
            porcMinPrincipalPagado: Number(x?.porcMinPrincipalPagado ?? 0)
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
            idProposito: x?.idProposito == null ? null : String(x.idProposito),
            tipoCreditoId: String(x?.tipoCreditoId ?? ''),
            montoDesde: Number(x?.montoDesde ?? 0),
            montoHasta: x?.montoHasta == null ? null : Number(x.montoHasta),
            comision: Number(x?.comision ?? 0),
            cuotaMaxima: Number(x?.cuotaMaxima ?? 0),
            porcInteresAnual: Number(x?.porcInteresAnual ?? 0),
            mesDesde: x?.mesDesde == null ? null : Number(x.mesDesde),
            mesHasta: x?.mesHasta == null ? null : Number(x.mesHasta),
            orden: Number(x?.orden ?? 0)
          } as any));

          this.laboral = {
            departamento: String(data?.laboral?.departamento ?? ''),
            nomina: String(data?.laboral?.nomina ?? ''),
            ingresoEmpresa: Number(data?.laboral?.ingresoEmpresa ?? (this.socio as any)?.salarioMensual ?? 0),
            antiguedadLaboral: String(data?.laboral?.antiguedadLaboral ?? (this.socio as any)?.antiguedadTexto ?? '')
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

          this.solicitud.fechaInicioPago = this.getFechaInicioDefault();
          this.solicitud.montoSolicitado = null;
          this.solicitud.plazo = null;
          this.solicitud.tasaInteresAnual = 0;
          this.solicitud.comisionDesembolso = 0;
          this.solicitud.proveedorId = '';
          this.solicitud.numeroFactura = '';
          this.planPagos = [];

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

  private getFechaInicioDefault(): string {
    const fechaServidor = new Date(
      this.appConfigService.getCurrentSettings().fechaServidor
    );

    const year = fechaServidor.getFullYear();
    const month = fechaServidor.getMonth();
    const day = fechaServidor.getDate();

    let fechaResult: Date;

    if (day <= 15) {
      // 👉 último día del mes actual
      fechaResult = new Date(year, month + 1, 0);
    } else {
      // 👉 día 15 del siguiente mes
      fechaResult = new Date(year, month + 1, 15);
    }

    return this.toDateInput(fechaResult);
  }

  onTipoCreditoChange(): void {
    const tipo = this.tiposCredito.find(x =>
      String(x.id) === String(this.solicitud.tipoCredito)
    ) as any;

    this.limpiarReglaCredito(true);

    if (!tipo) {
      this.propositosCreditoFiltrados = [];
      this.requiereProveedor = false;
      this.solicitud.proposito = '';
      this.solicitud.proveedorId = '';

      this.sincronizarValoresValidacion();
      this.engine.validateByIds([
        'TipoCredito',
        'Proposito',
        'Proveedor',
        'MontoSolicitado',
        'Plazo'
      ]);

      return;
    }

    this.requiereProveedor = this.toBoolean(tipo.requiereProveedor);

    if (!this.requiereProveedor) {
      this.solicitud.proveedorId = '';
    }

    this.filtrarPropositosPorTipo();
    this.aplicarReglaCreditoPorMonto(true);

    this.sincronizarValoresValidacion();

    this.engine.validateByIds([
      'TipoCredito',
      'Proposito',
      'Proveedor',
      'MontoSolicitado',
      'Plazo'
    ]);
  }
  onPropositoChange(): void {
    this.aplicarReglaCreditoPorMonto(true);
    this.sincronizarValoresValidacion();
    this.engine.validateByIds(['Proposito', 'MontoSolicitado', 'Plazo']);
  }

  onMontoChange(): void {
    this.aplicarReglaCreditoPorMonto(false);
    this.sincronizarValoresValidacion();
    this.engine.validateById('MontoSolicitado');
  }


  onFechaInicioPagoChange(): void {
    this.aplicarReglaCreditoPorMonto(false);

    // 🔥 sincroniza valores con JMart
    this.sincronizarValoresValidacion();

    // 🔥 revalida fecha + reglas relacionadas
    this.engine.validateByIds([
      'FechaInicioPago',
      'MontoSolicitado',
      'Plazo'
    ]);

    // 🔥 limpia plan
    this.planPagos = [];
  }


  onPlazoChange(): void {
    this.aplicarReglaCreditoPorMonto(false);
    this.sincronizarValoresValidacion();
    this.engine.validateById('Plazo');
    this.planPagos = [];
  }

  private filtrarPropositosPorTipo(): void {
    this.propositosCreditoFiltrados = this.propositosCredito
      .filter(x => String(x.tipoCreditoId) === String(this.solicitud.tipoCredito));

    this.solicitud.proposito =
      this.propositosCreditoFiltrados.length > 0
        ? this.propositosCreditoFiltrados[0].id
        : '';
  }

  private aplicarReglaCreditoPorMonto(asignarPlazoSiVacio: boolean = false): void {
    const monto = this.toNumber(this.solicitud.montoSolicitado);
    const plazoActual = this.toNumber(this.solicitud.plazo);

    this.limpiarReglaCredito(false);

    if (!this.solicitud.tipoCredito) {
      return;
    }

    const reglas = this.reglasCredito
      .filter(x => this.reglaAplicaPorTipoYProposito(x))
      .sort((a, b) => this.ordenarReglas(a, b));

    const regla = monto > 0
      ? reglas.find(x => this.montoAplicaEnRegla(x, monto)) ?? null
      : reglas[0] ?? null;

    if (!regla) {
      return;
    }

    this.reglaCreditoActual = regla;
    this.solicitud.tasaInteresAnual = Number(regla.porcInteresAnual ?? 0);
    this.solicitud.comisionDesembolso = Number(regla.comision ?? 0);

    const cuotaMaxima = Number(regla.cuotaMaxima ?? 0);

    if (asignarPlazoSiVacio && cuotaMaxima > 0 && plazoActual <= 0) {
      this.solicitud.plazo = cuotaMaxima;
    } else if (plazoActual > 0) {
      this.solicitud.plazo = plazoActual;
    }
  }

  private reglaAplicaPorTipoYProposito(regla: TipoCreditoReglaItem): boolean {
    const tipoCoincide =
      String(regla.tipoCreditoId) === String(this.solicitud.tipoCredito);

    if (!tipoCoincide) return false;

    const idPropositoRegla = (regla as any).idProposito;

    const esReglaGeneral =
      idPropositoRegla == null ||
      String(idPropositoRegla).trim() === '';

    const propositoSeleccionado = String(this.solicitud.proposito ?? '').trim();

    return esReglaGeneral ||
      (
        propositoSeleccionado !== '' &&
        String(idPropositoRegla) === propositoSeleccionado
      );
  }

  private ordenarReglas(a: TipoCreditoReglaItem, b: TipoCreditoReglaItem): number {
    const aEspecifica = this.esReglaConProposito(a) ? 1 : 0;
    const bEspecifica = this.esReglaConProposito(b) ? 1 : 0;

    if (aEspecifica !== bEspecifica) {
      return bEspecifica - aEspecifica;
    }

    const ordenA = Number((a as any).orden ?? 0);
    const ordenB = Number((b as any).orden ?? 0);

    if (ordenA !== ordenB) {
      return ordenA - ordenB;
    }

    return Number(a.montoDesde ?? 0) - Number(b.montoDesde ?? 0);
  }

  private esReglaConProposito(regla: TipoCreditoReglaItem): boolean {
    const idProposito = (regla as any).idProposito;

    return idProposito != null && String(idProposito).trim() !== '';
  }

  private montoAplicaEnRegla(regla: TipoCreditoReglaItem, monto: number): boolean {
    const desde = Number(regla.montoDesde ?? 0);
    const hasta = regla.montoHasta == null ? null : Number(regla.montoHasta);

    return monto >= desde && (hasta == null || monto <= hasta);
  }

  private limpiarReglaCredito(limpiarPlazo: boolean): void {
    this.reglaCreditoActual = null;
    this.solicitud.tasaInteresAnual = 0;
    this.solicitud.comisionDesembolso = 0;
    this.planPagos = [];

    if (limpiarPlazo) {
      this.solicitud.plazo = null;
    }
  }

  ajustarMaximoPermitido(): void {
    this.solicitud.montoSolicitado = Number((this.socio as any)?.limiteCreditoDisponible ?? 0);
    this.aplicarReglaCreditoPorMonto(true);
  }


  guardarBorrador(): void {
    this.guardar("Borrador");
  }


  private guardar(estado: string): void {


    if (estado != "Borrador") {
      const ok = this.engine.validateAll();

      if (!ok) {
        this.notify.show(this.engine.getGroupedErrorsHtmlSnapshot(), '', 'warning');
        return;
      }


      this.engine.clearErrors();
      this.notify.close();

    }




    const plan = this.generarPlanPagos();

    if (!plan || plan.length === 0) {
      this.notify.show(
        this.translate.instant('solicitudCredito.messages.planNotGenerated'),
        '',
        'warning'
      );
      return;
    }

    const payload = this.buildPayloadFromPlan(plan, estado);

    this.saving = true;



    this.service.postSolicitudCredito(payload)
      .pipe(finalize(() => this.saving = false))
      .subscribe({
        next: (res: any) => {
          this.notify.showFromApiResponse?.(res, 'success');
          this.planPagos = [];
          this.limpiarFormularioCredito();
        },
        error: (err: any) => {
          this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
        }
      });
  }



  private toIsoDateFromFormatted(value: string): string {
    if (!value) return '';

    const parts = value.split('/');

    if (parts.length !== 3) {
      return '';
    }

    const day = parts[0]?.padStart(2, '0');
    const month = parts[1]?.padStart(2, '0');
    const year = parts[2];

    return `${year}-${month}-${day}`;
  }



  private buildPayloadFromPlan(plan: PlanPagoItem[], estado: string): any {
    return {
      codSocio: this.socio?.codigoSocio ?? '',
      estado: estado,
      tipoCreditoId: this.solicitud.tipoCredito,
      propositoId: this.solicitud.proposito || null,
      proveedorId: this.requiereProveedor ? this.solicitud.proveedorId : null,
      tipoCreditoReglaId: this.reglaCreditoActual?.id ?? null,
      fechaInicioPago: this.solicitud.fechaInicioPago,
      montoSolicitado: this.toNumber(this.solicitud.montoSolicitado),
      plazo: this.toNumber(this.solicitud.plazo),
      esQuincenal: this.esQuincenal,
      tasaInteresAnual: this.toNumber(this.solicitud.tasaInteresAnual),
      comisionDesembolso: this.toNumber(this.solicitud.comisionDesembolso),
      cuota: plan[0]?.cuota ?? 0,
      interesesTotales: this.round2(plan.reduce((s, x) => s + x.pagoInteres, 0)),
      totalPagar: this.round2(plan.reduce((s, x) => s + x.cuota, 0)),
      salarioMensual: Number((this.socio as any)?.salarioMensual ?? 0),
      totalDeducciones: this.totalDeducciones,
      cuotaDisponible: this.cuotaDisponible,
      nivelEndeudamiento: this.nivelEndeudamientoProyectado,
      capacidadPagoPorcentaje: this.capacidadPagoPorcentaje,
      montoExcedeLimite: this.montoExcedeLimite,
      cuotaExcedeCapacidad: this.cuotaExcedeCapacidad,
      mesNoPermitidoPorRegla: this.mesNoPermitidoPorRegla,
      noTieneCreditosVigentes: this.noTieneCreditosVigentes,
      noCumplePorcentajePrincipalPagado: this.noCumplePorcentajePrincipalPagado,
      plazoExcedeMaximoRegla: this.plazoExcedeMaximoRegla,
      planPagos: plan.map(x => ({
        noCuota: x.noCuota,
        fechaPago: this.toIsoDateFromFormatted(x.fechaPago),
        cuota: x.cuota,
        principalPendiente: x.principalPendiente,
        pagoPrincipal: x.pagoPrincipal,
        pagoInteres: x.pagoInteres,
        principalCancelado: x.principalCancelado
      }))
    };
  }



  enviarAprobacion(): void {
    this.guardar("EnEvaluacion");
  }

  simular(): void {
    this.aplicarReglaCreditoPorMonto(false);

    if (!this.esViable) {
      this.notify.show(
        this.translate.instant('solicitudCredito.messages.notViable'),
        '',
        'warning'
      );
      return;
    }

    this.planPagos = this.generarPlanPagos();
    this.mostrarModalPlan = true;
  }

  cerrarModalPlan(): void {
    this.mostrarModalPlan = false;
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
    const plan = this.generarPlanPagos();

    return {
      socioId: this.socioId,
      tipoCredito: this.solicitud.tipoCredito,
      proposito: this.solicitud.proposito,
      proveedorId: this.requiereProveedor ? this.solicitud.proveedorId : null,
      tipoCreditoReglaId: this.reglaCreditoActual?.id ?? null,
      fechaInicioPago: this.solicitud.fechaInicioPago,
      montoSolicitado: this.toNumber(this.solicitud.montoSolicitado),
      montoInvalidoPorTipoCredito: this.montoInvalidoPorTipoCredito,
      montoExcedeLimite: this.montoExcedeLimite,
      mesNoPermitidoPorRegla: this.mesNoPermitidoPorRegla,
      noTieneCreditosVigentes: this.noTieneCreditosVigentes,
      noCumplePorcentajePrincipalPagado: this.noCumplePorcentajePrincipalPagado,
      plazoExcedeMaximoRegla: this.plazoExcedeMaximoRegla,
      porcMinPrincipalPagado: this.porcMinPrincipalPagadoTipo,
      porcentajePrincipalPagado: Number((this.socio as any)?.porcentajePrincipalPagado ?? 0),
      plazo: this.toNumber(this.solicitud.plazo),
      esQuincenal: this.esQuincenal,
      tasaInteresAnual: this.toNumber(this.solicitud.tasaInteresAnual),
      comisionDesembolso: this.toNumber(this.solicitud.comisionDesembolso),
      numeroFactura: this.solicitud.numeroFactura?.trim() ?? '',
      cuotaQuincenal: plan.length > 0 ? plan[0].cuota : 0,
      interesesTotales: this.round2(plan.reduce((sum, x) => sum + x.pagoInteres, 0)),
      totalPagar: this.round2(plan.reduce((sum, x) => sum + x.cuota, 0)),
      capacidadPagoPorcentaje: this.capacidadPagoPorcentaje,
      nivelEndeudamientoPorcentaje: this.nivelEndeudamientoProyectado,
      totalDeducciones: this.totalDeducciones,
      cuotaDisponible: this.cuotaDisponible,
      resultadoEvaluacion: this.esViable ? 'Viable' : 'NoViable',
      planPagos: plan,
      enviarAprobacion
    };
  }

  private generarPlanPagos(): PlanPagoItem[] {
    const principal = this.round4(this.toNumber(this.solicitud.montoSolicitado));
    const tasaAnual = this.toNumber(this.solicitud.tasaInteresAnual) / 100;
    const plazo = this.toNumber(this.solicitud.plazo);

    if (principal <= 0 || plazo <= 0) return [];

    const tasaPeriodo = this.esQuincenal
      ? tasaAnual / 24
      : tasaAnual / 12;

    const cuotaSinRedondear = tasaPeriodo > 0
      ? principal * tasaPeriodo / (1 - Math.pow(1 + tasaPeriodo, -plazo))
      : principal / plazo;

    const cuota = this.round4(cuotaSinRedondear);

    let saldo = principal;
    let principalCancelado = 0;

    const fechaBase = this.solicitud.fechaInicioPago
      ? new Date(this.solicitud.fechaInicioPago + 'T00:00:00')
      : new Date();

    const plan: PlanPagoItem[] = [];

    for (let i = 1; i <= plazo; i++) {
      const saldoAntes = this.round4(saldo);

      // interés con 10 decimales
      const pagoInteres = this.round10(saldoAntes * tasaPeriodo);

      // montos con 4 decimales
      let pagoPrincipal = this.round4(cuota - pagoInteres);
      let cuotaFila = cuota;

      if (i === plazo) {
        pagoPrincipal = saldoAntes;
        cuotaFila = this.round4(pagoPrincipal + pagoInteres);
      }

      principalCancelado = this.round4(principalCancelado + pagoPrincipal);
      saldo = this.round4(saldoAntes - pagoPrincipal);

      if (saldo < 0.0001) saldo = 0;

      const fechaPago = this.esQuincenal
        ? this.getFechaQuincenal(fechaBase, i)
        : this.getFechaMensual(fechaBase, i);

      plan.push({
        noCuota: i,
        fechaPago: this.formatDateOnly(fechaPago),
        cuota: cuotaFila,
        principalPendiente: saldoAntes,
        pagoPrincipal,
        pagoInteres,
        principalCancelado
      });
    }

    return plan;
  }

  private round4(value: number): number {
    return Math.round((Number(value ?? 0) + Number.EPSILON) * 10000) / 10000;
  }

  private round10(value: number): number {
    return Math.round((Number(value ?? 0) + Number.EPSILON) * 10000000000) / 10000000000;
  }

  private getFechaQuincenal(fechaBase: Date, noCuota: number): Date {
    const baseYear = fechaBase.getFullYear();
    const baseMonth = fechaBase.getMonth();
    const baseDay = fechaBase.getDate();

    const index = noCuota - 1;
    const monthOffset = Math.floor(index / 2);
    const esPrimeraFechaDelPar = index % 2 === 0;

    const fecha = new Date(baseYear, baseMonth + monthOffset, 1);

    if (baseDay <= 15) {
      fecha.setDate(esPrimeraFechaDelPar ? 15 : this.getUltimoDiaMes(fecha));
      return fecha;
    }

    if (esPrimeraFechaDelPar) {
      fecha.setDate(this.getUltimoDiaMes(fecha));
      return fecha;
    }

    fecha.setMonth(fecha.getMonth() + 1);
    fecha.setDate(15);

    return fecha;
  }

  private getFechaMensual(fechaBase: Date, noCuota: number): Date {
    return new Date(
      fechaBase.getFullYear(),
      fechaBase.getMonth() + (noCuota - 1),
      fechaBase.getDate()
    );
  }

  private getUltimoDiaMes(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
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

  private toBoolean(value: any): boolean {
    if (typeof value === 'boolean') return value;

    if (value == null) return false;

    const text = String(value).trim().toLowerCase();

    return text === 'true' || text === '1' || text === 'yes' || text === 'si' || text === 'sí';
  }

  private normalizarPorcentaje(value: any): number {
    const n = Number(value ?? 0);

    if (n <= 1) return n * 100;

    return n;
  }

  private round2(value: number): number {
    return Math.round((Number(value ?? 0) + Number.EPSILON) * 100) / 100;
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

  private formatDateOnly(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  }





  private configurarValidacionesCredito(): void {
    this.engine.resetRules();
    this.engine.clearFieldsMeta();

    this.engine.addFieldsMeta([
      { id: 'TipoCredito', label: this.translate.instant('solicitudCredito.fields.tipoCredito') },
      { id: 'FechaInicioPago', label: this.translate.instant('solicitudCredito.fields.fechaInicioPago') },
      { id: 'Proposito', label: this.translate.instant('solicitudCredito.fields.proposito') },
      { id: 'MontoSolicitado', label: this.translate.instant('solicitudCredito.fields.montoSolicitado') },
      { id: 'Plazo', label: this.translate.instant('solicitudCredito.fields.plazo') },
      { id: 'Proveedor', label: this.translate.instant('solicitudCredito.fields.proveedor') }
    ]);

    this.engine.addRules([
      { id: 'TipoCredito', condition: 'REQUIRED', value: '', message: this.translate.instant('solicitudCredito.messages.creditTypeRequired') },
      { id: 'FechaInicioPago', condition: 'REQUIRED', value: '', message: this.translate.instant('solicitudCredito.messages.paymentStartDateRequired') },
      { id: 'FechaInicioPago', condition: 'DATE>=', value: '{FechaServidor}', message: this.translate.instant('solicitudCredito.messages.paymentStartDateMin') },
      { id: 'MontoSolicitado', condition: 'REQUIRED', value: '', message: this.translate.instant('solicitudCredito.messages.amountRequired') },
      { id: 'MontoSolicitado', condition: 'NUM>', value: 0, message: this.translate.instant('solicitudCredito.messages.invalidAmount') },
      { id: 'MontoSolicitado', condition: 'NUM>=', value: '{MontoMinimoPermitido}', message: this.translate.instant('solicitudCredito.messages.invalidAmountForType') },
      { id: 'MontoSolicitado', condition: 'NUM<=', value: '{MontoMaximoPermitido}', message: this.translate.instant('solicitudCredito.messages.invalidAmountForType') },
      { id: 'Plazo', condition: 'REQUIRED', value: '', message: this.translate.instant('solicitudCredito.messages.termRequired') },
      { id: 'Plazo', condition: 'NUM>', value: 0, message: this.translate.instant('solicitudCredito.messages.invalidTerm') },
      { id: 'Plazo', condition: 'NUM<=', value: '{CuotaMaximaRegla}', message: this.translate.instant('solicitudCredito.messages.maxTermExceeded') },
      { id: 'Proposito', condition: 'REQUIRED', value: '', when: '{PropositoRequerido}=true', message: this.translate.instant('solicitudCredito.messages.purposeRequired') },
      { id: 'Proveedor', condition: 'REQUIRED', value: '', when: '{ProveedorRequerido}=true', message: this.translate.instant('solicitudCredito.messages.providerRequired') }
    ]);

    this.engine.clearErrors();
  }

  private sincronizarValoresValidacion(): void {

    const reglasAplicables = this.reglasCredito
      .filter(x => this.reglaAplicaPorTipoYProposito(x));

    const montoMinimoPermitido = reglasAplicables.length > 0
      ? Math.min(...reglasAplicables.map(x => Number(x.montoDesde ?? 0)))
      : 0;

    const montoMaximoPermitido = reglasAplicables.length > 0
      ? Math.max(...reglasAplicables.map(x =>
        x.montoHasta == null ? 999999999999 : Number(x.montoHasta)
      ))
      : 999999999999;

    const cuotaMaximaRegla = Number(this.reglaCreditoActual?.cuotaMaxima ?? 999999);

    this.engine.patchValues({
      TipoCredito: this.solicitud.tipoCredito,
      FechaInicioPago: this.solicitud.fechaInicioPago,
      FechaServidor: this.appConfigService.getCurrentSettings()?.fechaServidor,
      Proposito: this.solicitud.proposito,
      MontoSolicitado: this.solicitud.montoSolicitado,
      Plazo: this.solicitud.plazo,
      Proveedor: this.solicitud.proveedorId,

      PropositoRequerido: this.propositosCreditoFiltrados.length > 0 ? 'true' : 'false',
      ProveedorRequerido: this.requiereProveedor ? 'true' : 'false',

      MontoMinimoPermitido: montoMinimoPermitido,
      MontoMaximoPermitido: montoMaximoPermitido,
      CuotaMaximaRegla: cuotaMaximaRegla
    });
  }


  private limpiarFormularioCredito(): void {
    this.solicitud.tipoCredito = '';
    this.solicitud.proposito = '';
    this.solicitud.proveedorId = '';
    this.solicitud.montoSolicitado = null;
    this.solicitud.plazo = null;
    this.solicitud.tasaInteresAnual = 0;
    this.solicitud.comisionDesembolso = 0;
    this.solicitud.numeroFactura = '';
    this.solicitud.fechaInicioPago = this.getFechaInicioDefault();

    this.propositosCreditoFiltrados = [];
    this.requiereProveedor = false;
    this.reglaCreditoActual = null;
    this.planPagos = [];
    this.montoTouched = false;

    if (this.tiposCredito.length > 0) {
      this.solicitud.tipoCredito = this.tiposCredito[0].id;
      this.onTipoCreditoChange();
    } else {
      this.sincronizarValoresValidacion();
    }

    
    this.engine.clearErrors();

  }

}