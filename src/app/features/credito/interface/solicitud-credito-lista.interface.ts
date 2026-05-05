export interface SolicitudCreditoListaResponse {
  items: SolicitudCreditoListaItem[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
  resumen: SolicitudCreditoListaResumen;
}

export interface SolicitudCreditoListaResumen {
  totalSolicitudes: number;
  borradores: number;
  enEvaluacion: number;
  aprobadas: number;
  rechazadas: number;
  desembolsadas: number;
  pendientesAprobacion: number;
}

export interface SolicitudCreditoListaItem {
  id: string;
  socioId: string;

  serie: string;
  noSolicitud: string;
  documento: string;

  codigoSocio: string;
  nombreSocio: string;
  identificacion: string;

  tipoCreditoId: string;
  tipoCredito: string;
  proposito: string;

  fechaSolicitud: string;
  fechaInicioPago: string;

  montoSolicitado: number;
  plazo: number;
  esQuincenal: boolean;

  cuota: number;
  interesesTotales: number;
  totalPagar: number;

  estado: string;
  etapaActual: string;
  etapaActualTexto: string;
  progreso: number;

  puedeAprobar: boolean;
  puedeRechazar: boolean;
  puedeDesembolsar: boolean;
  puedeEditar: boolean;
  puedeVerDetalle: boolean;

  aprobaciones: SolicitudCreditoAprobacionItem[];
}

export interface SolicitudCreditoAprobacionItem {
  codigo: string;
  orden: number;
  nombre: string;
  estado: string;
  usuario?: string;
  login?: string;
  fecha?: string;
  comentario?: string;
  actual: boolean;
}

export interface SolicitudCreditoListaFiltro {
  page: number;
  pageSize: number;
  search?: string;
  estado?: string;
  etapa?: string;
  fechaInicio?: string;
  fechaFin?: string;
}

export interface SolicitudCreditoAprobacionRequest {
  solicitudId: string;
  etapa: string;
  comentario?: string;
}