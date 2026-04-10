export type AhorroTab = 'socios' | 'ahorros' | 'retiros' | 'depositos' | 'cuentas';
export type SocioDetalleTab = 'ahorros' | 'retiros' | 'depositos' | 'solicitudes' | 'planes';

export interface SummaryCard {
  icon: string;
  title: string;
  amount: string;
  subtitle: string;
  accent: 'teal' | 'blue' | 'orange' | 'purple';
}

export interface SocioRow {
  id: string;
  codigo: string;
  nombre: string;
  documento: string;
  tipoCuenta: string;
  ahorrado: string;
  retirado: string;
  depositos: string;
  ultimoMovimiento: string;
  movimientoTipo: string;
}

export interface SimpleMovimientoRow {
  fecha: string;
  descripcion: string;
  tipoCuenta: string;
  monto: number;
  saldo?: string;
}

export interface AhorroMovimiento {
  id?: string;

  // 📅 Información básica
  fecha: string;
  descripcion: string;

  // 💰 Datos financieros
  monto: number;
  saldo?: number;

  // 🏦 Cuenta
  tipoCuenta: 'Corriente' | 'Navideña';

  // 🔄 Tipo de movimiento
  tipoMovimiento?: 'Ahorro' | 'Retiro' | 'Deposito' | 'Afiliacion';

  // 📌 Opcionales para crecimiento
  estado?: 'Activo' | 'Pendiente' | 'Anulado';
  referencia?: string;

  // 👤 Relación
  socioId?: string;
  codigoSocio?: string;
}


export interface CuentaRow {
  codigo: string;
  nombre: string;
  tipoCuenta: string;
  estado: string;
  saldo: string;
}

export interface AlertItem {
  color: 'warning' | 'info';
  title: string;
  description: string;
  code: string;
  date: string;
}

export interface ReportItem {
  title: string;
  subtitle: string;
}

export interface ActionItem {
  icon: string;
  title: string;
  accent: 'green' | 'blue' | 'violet' | 'cyan' | 'amber' | 'emerald';
}
