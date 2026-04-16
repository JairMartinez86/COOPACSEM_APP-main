export interface AfiliacionMembresiaPagoRow {
  id: string;
  tipo: 'Afiliacion' | 'Membresia';
  noCuota: number;
  fecha: string;
  monto: number;
  montoPagado: number;
  saldo: number;
  fechaPago?: string | null;
  estado: 'Pagada' | 'Pendiente' | 'Vencido';
  estadoKey: string;
}

export interface SocioAfiliacionPagoDashboard {
  creditoPendiente: number;
}

export interface SocioAfiliacionPagoResumen {
  id: string;
  codigoSocio: string;
  nombreCompleto: string;
  numeroIdentificacion: string;
  sociedadLabora?: string;
  telefono?: string;
  celular?: string;
  correo?: string;
  direccionDomiciliar?: string;
  fechaIngreso?: string | null;
  activo: boolean;
  dashboard?: SocioAfiliacionPagoDashboard | null;
}

export interface SocioAfiliacionPagoDetailResponse {
  socio: SocioAfiliacionPagoResumen | null;
  detail: {
    afiliacion: AfiliacionMembresiaPagoRow[];
    membresia: AfiliacionMembresiaPagoRow[];
    cuotas: AfiliacionMembresiaPagoRow[];
  };
}