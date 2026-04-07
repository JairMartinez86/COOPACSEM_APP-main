export interface SocioAperturaCuentaNavidena {
  SocioId: string;
  TipoCuenta: 'navidena';
  FechaApertura: string;
  MontoCuota: number | null;
  Observacion: string;
}

export interface PlanCuotaItem {
  fechaProgramada: string;
  montoCuota: number;
  estado: 'Pagada' | 'Pendiente';
  pagado: boolean;
  montoPagado: number;
  fechaPago?: string | null;
  referencia?: string | null;
}
