export interface SocioForm {
  id: string | null;

  nombreCompleto: string;
  nombrePublico: string;
  tipoIdentificacion: string;
  numeroIdentificacion: string;
  paisEmisor: string;
  fechaEmision: string | null;
  fechaVencimiento: string | null;
  paisNacimiento: string;
  fechaNacimiento: string | null;

  nacionalidad: string;
  departamento: string;
  municipio: string;
  direccionDomiciliar: string;
  telefono: string;
  celular: string;
  correo: string;

  sociedadLabora: string;
  area: string;
  cargo: string;
  fechaIngreso: string | null;
  numeroIp: string;
  correoLaboral: string;
  jefeInmediato: string;
  ingresosMensuales: number | null;
  otrosIngresos: number | null;
  ingresosAnuales: number | null;

  conyugeNombreCompleto: string;
  conyugeTipoIdentificacion: string;
  conyugeNumeroIdentificacion: string;
  conyugePaisNacimiento: string;
  conyugeNacionalidad: string;

  beneficiario1Nombre: string;
  beneficiario1Porcentaje: number | null;
  beneficiario1Parentesco: string;
  beneficiario1Cedula: string;

  beneficiario2Nombre: string;
  beneficiario2Porcentaje: number | null;
  beneficiario2Parentesco: string;
  beneficiario2Cedula: string;

  beneficiario3Nombre: string;
  beneficiario3Porcentaje: number | null;
  beneficiario3Parentesco: string;
  beneficiario3Cedula: string;
   activo: boolean;
}

export const EMPTY_SOCIO: SocioForm = {
  id: null,

  nombreCompleto: '',
  nombrePublico: '',
  tipoIdentificacion: '',
  numeroIdentificacion: '',
  paisEmisor: '',
  fechaEmision: null,
  fechaVencimiento: null,
  paisNacimiento: '',
  fechaNacimiento: null,

  nacionalidad: '',
  departamento: '',
  municipio: '',
  direccionDomiciliar: '',
  telefono: '',
  celular: '',
  correo: '',

  sociedadLabora: '',
  area: '',
  cargo: '',
  fechaIngreso: null,
  numeroIp: '',
  correoLaboral: '',
  jefeInmediato: '',
  ingresosMensuales: null,
  otrosIngresos: null,
  ingresosAnuales: null,

  conyugeNombreCompleto: '',
  conyugeTipoIdentificacion: '',
  conyugeNumeroIdentificacion: '',
  conyugePaisNacimiento: '',
  conyugeNacionalidad: '',

  beneficiario1Nombre: '',
  beneficiario1Porcentaje: null,
  beneficiario1Parentesco: '',
  beneficiario1Cedula: '',

  beneficiario2Nombre: '',
  beneficiario2Porcentaje: null,
  beneficiario2Parentesco: '',
  beneficiario2Cedula: '',

  beneficiario3Nombre: '',
  beneficiario3Porcentaje: null,
  beneficiario3Parentesco: '',
  beneficiario3Cedula: '',
   activo:  true,
};