export interface CreditosActivosFiltro {
  page: number;
  pageSize: number;
  search?: string;
  codSocio?: string;
  fechaCorte?: string;
  tipoPrestamo?: string;
  estado?: string;
}

export interface CreditosActivosKpis {
  total_corto_plazo: number;
  total_largo_plazo: number;
  total_afiliacion: number;
  total_general: number;
}

export interface CreditosActivosGraficoItem {
  grupo: string;
  etiqueta: string;
  monto: number;
  cantidad: number;
  porcentaje: number;
  orden: number;
}

export interface CreditosActivosGraficos {
  moraRangos: CreditosActivosGraficoItem[];
  tipoCredito: CreditosActivosGraficoItem[];
}

export interface CreditoActivoItem {
  id: string;
  noCredito: string;
  noSolicitud: string;
  codSocio: string;
  nombreSocio: string;
  cedula: string;
  tipoCredito: string;
  proposito: string;
  fechaCredito: string | null;
  fechaInicioPago: string | null;
  fechaCancelacion: string | null;
  montoAprobado: number;
  saldoCapital: number;
  tasaInteres: number;
  cuota: number;
  cuotasPagadas: number;
  cuotasPendientes: number;
  plazo: number;
  proximaCuotaNo: number | null;
  proximaCuotaFecha: string | null;
  proximaCuotaMonto: number;
  saldoVencido: number;
  diasMora: number;
  estadoCartera: string;
  porcentajePagado: number;
  tipo :string;
}

export interface CreditosActivosListaResponse {
  items: CreditoActivoItem[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreditoActivoDetalle extends CreditoActivoItem {
  progresoPago?: any[];
  cuotas?: any[];
  graficos?: CreditosActivosGraficos;
}