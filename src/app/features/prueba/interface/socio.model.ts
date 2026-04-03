import { BeneficiarioForm } from './beneficiario.model';

export interface SocioForm {
  id: string | null;

  codigoSocio: string | null;
  sexo: string | null;
  numeroInss: string | null;
  estadoCivil: string | null;
  observaciones: string | null;

  nombreCompleto: string | null;
  nombrePublico: string | null;
  tipoIdentificacion: string | null;
  numeroIdentificacion: string | null;
  paisEmisor: string | null;
  fechaEmision: string | null;
  fechaVencimiento: string | null;
  paisNacimiento: string | null;
  fechaNacimiento: string | null;

  nacionalidadId: string | null;
  departamentoId: string | null;
  municipioId: string | null;

  direccionDomiciliar: string | null;
  telefono: string | null;
  celular: string | null;
  correo: string | null;

  sociedadLabora: string | null;
  area: string | null;
  cargo: string | null;
  fechaIngreso: string | null;
  numeroIp: string | null;
  correoLaboral: string | null;
  jefeInmediato: string | null;
  ingresosMensuales: number | null;
  otrosIngresos: number | null;
  ingresosAnuales: number | null;

  conyugeNombreCompleto: string | null;
  conyugeTipoIdentificacion: string | null;
  conyugeNumeroIdentificacion: string | null;
  conyugePaisNacimiento: string | null;
  conyugeNacionalidadId: string | null;

  afiliacionTipoPago: string | null;
  afiliacionBancoCodigo: string | null;
  afiliacionVoucherNumero: string | null;
  afiliacionFechaDeposito: string | null;
  afiliacionCuotas: number | null;
  afiliacionCostoTotal: number | null;
  afiliacionCapitalOrdinario: number | null;
  afiliacionOtrosIngresosDiferidos: number | null;

  cuentaCorrienteActiva: boolean;
  cuentaCorrienteFechaInicioDeduccion: string | null;
  cuentaCorrienteMontoCuota: number | null;
  cuentaCorrienteEsMensual: boolean;

  cuentaNavidenaActiva: boolean;
  cuentaNavidenaFechaInicioDeduccion: string | null;
  cuentaNavidenaMontoCuota: number | null;
  cuentaNavidenaEsMensual: boolean;

  beneficiarios: BeneficiarioForm[];
  activo: boolean;

  beneficiarioPorcentaje :  number | null;
}

export const EMPTY_SOCIO: SocioForm = {
  id: null,

  codigoSocio: null,
  sexo: null,
  numeroInss: null,
  estadoCivil: null,
  observaciones: null,

  nombreCompleto: null,
  nombrePublico: null,
  tipoIdentificacion: null,
  numeroIdentificacion: null,
  paisEmisor: null,
  fechaEmision: null,
  fechaVencimiento: null,
  paisNacimiento: null,
  fechaNacimiento: null,

  nacionalidadId: null,
  departamentoId: null,
  municipioId: null,

  direccionDomiciliar: null,
  telefono: null,
  celular: null,
  correo: null,

  sociedadLabora: null,
  area: null,
  cargo: null,
  fechaIngreso: null,
  numeroIp: null,
  correoLaboral: null,
  jefeInmediato: null,
  ingresosMensuales: null,
  otrosIngresos: null,
  ingresosAnuales: null,

  conyugeNombreCompleto: null,
  conyugeTipoIdentificacion: null,
  conyugeNumeroIdentificacion: null,
  conyugePaisNacimiento: null,
  conyugeNacionalidadId: null,


  afiliacionTipoPago: null,
  afiliacionBancoCodigo: null,
  afiliacionVoucherNumero: null,
  afiliacionFechaDeposito: null,
  afiliacionCuotas: null,
  afiliacionCostoTotal: null,
  afiliacionCapitalOrdinario: null,
  afiliacionOtrosIngresosDiferidos: null,

  cuentaCorrienteActiva: false,
  cuentaCorrienteFechaInicioDeduccion: null,
  cuentaCorrienteMontoCuota: null,
  cuentaCorrienteEsMensual: false,

  cuentaNavidenaActiva: false,
  cuentaNavidenaFechaInicioDeduccion: null,
  cuentaNavidenaMontoCuota: null,
  cuentaNavidenaEsMensual: false,

  beneficiarios: [],
  activo: true,

  beneficiarioPorcentaje: 0,
};
