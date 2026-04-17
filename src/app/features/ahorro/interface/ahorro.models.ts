
export type SocioDetalleTab =
  | 'ahorros'
  | 'retiros'
  | 'depositos'
  | 'cambiosCuota'
  | 'solicitudes'
  | 'afiliacion'
  | 'planes';

export interface SummaryCard {
  icon: string;
  titleKey: string;
  amount: number;
  subtitleKey: string;
  accent: 'teal' | 'blue' | 'orange' | 'purple';
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  start: number;
  end: number;
}

export interface SocioRow {
  id: string;
  codigo: string;
  nombre: string;
  documento: string;
  telefono?: string | null;
  correo?: string | null;
  direccion?: string | null;
  empresa?: string | null;
  activo: boolean;
  tieneCuentaCorriente: boolean;
  tieneCuentaNavidena: boolean;
  ahorrado: number;
  retirado: number;
  depositos: number;
  ultimoMovimiento?: string | null;
  movimientoTipoKey?: string | null;
  alerts: SocioAlerts;
}

export interface SimpleMovimientoRow {
  id?: string;
  fecha: string;
  fechaRegistro?: string | null;
  descripcion: string;
  descripcionKey?: string | null;
  tipoCuenta: string;
  tipoCuentaKey?: string | null;
  monto: number;
  saldo?: number;
  noDeposito?: string | null;
  banco?: string | null;
  estadoKey?: string | null;
  estado?: string;
}

export interface CambioCuotaRow {
  id: string;
  fechaRegistro: string;
  tipoCuenta: string;
  cuotaAnterior: number;
  actual: number;
}

export interface AfiliacionMembresiaRow {
  id: string;
  tipo: 'Afiliacion' | 'Membresia';
  noCuota: number;
  fecha: string;
  monto: number;
  montoPagado: number;
  saldo: number;
  fechaPago?: string | null;
  estado: 'Pagado' | 'Pendiente' | 'Vencido';
  estadoKey: string;
}

export interface PlanRow {
  numero: number;
  fecha: string;
  cuota: number;
  estado: 'Pendiente' | 'Pagado' | 'Vencido';
  estadoKey: string;
  tipoCuenta: 'Corriente' | 'Navidena';
  saldo: number;
}

export interface SocioAlerts {
  count: number;
  hasAlerts: boolean;
  isExpired: boolean;
  highestSeverity: 'info' | 'warning' | 'danger';
  items: SocioAlertItem[];
}

export interface SocioAlertItem {
  code: string;
  messageKey: string;
  severity: 'info' | 'warning' | 'danger';
  params?: Record<string, string>;
}

export interface ReportItem {
  titleKey: string;
  subtitleKey: string;
}

export interface ActionItem {
  icon: string;
  titleKey: string;
  accent:
    | 'green'
    | 'blue'
    | 'violet'
    | 'cyan'
    | 'amber'
    | 'emerald'
    | 'red'
    | 'orange'
    | 'pink'
    | 'indigo'
    | 'teal'
    | 'gray'
    | 'teal';
  order: number;
}

export interface SocioDetail {
  id: string;
  codigo: string;
  nombre: string;
  documento: string;
  telefono?: string | null;
  correo?: string | null;
  direccion?: string | null;
  empresa?: string | null;
  tieneCuentaCorriente: boolean;
  tieneCuentaNavidena: boolean;
  totalAhorro: number;
  totalRetirado: number;
  totalDepositado: number;
  cuentaCorrienteActiva: boolean;
  activo: boolean;
}

export interface AhorroDashboardResponse {
  summary: {
    totalAhorrado: number;
    totalRetirado: number;
    totalDepositado: number;
    solicitudesPendientes: number;
  };
  socios: {
    items: SocioRow[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  selectedSocio: SocioDetail | null;
  detail: {
    ahorros: SimpleMovimientoRow[];
    retiros: SimpleMovimientoRow[];
    depositos: SimpleMovimientoRow[];
    cambiosCuota: CambioCuotaRow[];
    solicitudes: SimpleMovimientoRow[];
    planes: PlanRow[];
    afiliacionMembresia: AfiliacionMembresiaRow[];
  };
  alerts: SocioAlerts | null;
}