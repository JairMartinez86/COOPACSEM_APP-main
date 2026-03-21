export interface ProveedorForm {
  id: string | null;
  idCompany: string | null;

  codigo: string;
  nombre: string;
  tratamiento: string;
  sector: string;
  tipoIdentificacion: string;
  numeroIdentificacion: string;

  paisId: string | null;

  direccion: string;
  telefono: string;
  correo: string;

  planCuentaId: string | null;
  planCuentaNombre: string;

  cuentaContableId: string | null;
  cuentaContableNombre: string;

  activo: boolean;
}

export const EMPTY_PROVEEDOR: ProveedorForm = {
  id: null,
  idCompany: null,

  codigo: '',
  nombre: '',
  tratamiento: '',
  sector: '',
  tipoIdentificacion: '',
  numeroIdentificacion: '',

  paisId: null,

  direccion: '',
  telefono: '',
  correo: '',

  planCuentaId: null,
  planCuentaNombre: '',

  cuentaContableId: null,
  cuentaContableNombre: '',

  activo: true
};