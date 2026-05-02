import { SocioAlerts } from "../../../shared/interfaces/alert.model";

export interface SocioCreditoResumen {
  id: string;
  codigoSocio: string;
  nombreCompleto: string;
  numeroIdentificacion?: string;
  activo?: boolean;
  antiguedadTexto?: string;
  fechaIngreso?: string;
  salarioMensual?: number;
  ahorrosDisponibles?: number;
  creditosActivos?: number;
  limiteCreditoDisponible?: number;
  porcentajePrincipalPagado?: number;
  tieneCreditosVigentes?: boolean;
}

export interface TipoCreditoItem {
  id: string;
  tipo: string;
  nombre: string;
  tipoCreditoNombre: string;
  comision: number;
  cuotaMaxima: number;
  porcInteresAnual: number;
  esQuincenal: boolean;
  requiereProveedor : boolean;
}


export interface SolicitudCreditoForm {
  tipoCredito: string;
  proposito: string;
  fechaInicioPago: string;
  montoSolicitado: number | null;
  plazo: number | null;
  tasaInteresAnual: number;
  comisionDesembolso: number;
  numeroFactura: string;
}



export interface CuentaSocio {
  corriente: boolean;
  navidena: boolean;
}

export interface SolicitudCreditoSocioRow {
  id: string;
  codigoSocio: string;
  nombreCompleto: string;
  fechaIngreso?: string | null;
  estado: string;
  salarioMensual?: number;
  ahorroDisponible?: number;
  creditosActivos?: number;
  limiteCreditoDisponible?: number;
  cuentas: CuentaSocio;
  alerts: SocioAlerts;
}

export interface PropositoCreditoItem {
  id: string;
  tipoCreditoId: string;
  nombre: string;
}


export interface ProveedorItem {
  id: string;
  codigo: string;
  nombre: string;
}


export interface TipoCreditoReglaItem {
  id: string;
  tipoCreditoId: string;
  montoDesde: number;
  montoHasta: number | null;
  comision: number;
  cuotaMaxima: number;
  porcInteresAnual: number;
}


export interface PlanPagoItem {
  noCuota: number;
  fechaPago: string;
  cuota: number;
  principalPendiente: number;
  pagoPrincipal: number;
  pagoInteres: number;
  principalCancelado: number;
}