export interface SocioForm {
  id: string | null;

  codigoSocio: string | null;
  sexo: string | null;
  numeroInss: string | null;
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

  cuentaCorrienteActiva: boolean;
  cuentaCorrienteFechaInicioDeduccion: string | null;
  cuentaCorrienteMontoCuota: number | null;
  cuentaCorrienteEsMensual: boolean;

  cuentaNavidenaActiva: boolean;
  cuentaNavidenaFechaInicioDeduccion: string | null;
  cuentaNavidenaMontoCuota: number | null;
  cuentaNavidenaEsMensual: boolean;

  beneficiario1Nombre: string | null;
  beneficiario1Porcentaje: number | null;
  beneficiario1Parentesco: string | null;
  beneficiario1Cedula: string | null;

  beneficiario2Nombre: string | null;
  beneficiario2Porcentaje: number | null;
  beneficiario2Parentesco: string | null;
  beneficiario2Cedula: string | null;

  beneficiario3Nombre: string | null;
  beneficiario3Porcentaje: number | null;
  beneficiario3Parentesco: string | null;
  beneficiario3Cedula: string | null;

  activo: boolean;
}

export const EMPTY_SOCIO: SocioForm = {
  id: null,

  codigoSocio: null,
  sexo: null,
  numeroInss: null,
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

  cuentaCorrienteActiva: false,
  cuentaCorrienteFechaInicioDeduccion: null,
  cuentaCorrienteMontoCuota: null,
  cuentaCorrienteEsMensual: false,

  cuentaNavidenaActiva: false,
  cuentaNavidenaFechaInicioDeduccion: null,
  cuentaNavidenaMontoCuota: null,
  cuentaNavidenaEsMensual: false,

  beneficiario1Nombre: null,
  beneficiario1Porcentaje: null,
  beneficiario1Parentesco: null,
  beneficiario1Cedula: null,

  beneficiario2Nombre: null,
  beneficiario2Porcentaje: null,
  beneficiario2Parentesco: null,
  beneficiario2Cedula: null,

  beneficiario3Nombre: null,
  beneficiario3Porcentaje: null,
  beneficiario3Parentesco: null,
  beneficiario3Cedula: null,

  activo: true
};