export interface SocioCambioCuota {
  socioId: string;
  FechaServidor : string;
  tipoCuenta: 'corriente' | 'navideno';
  tipoMovimiento: 'incremento' | 'disminucion';
  cuotaActual: number | null;
  nuevaCuota: number | null;
  vigencia: string;
  aplicaDesde: 'inmediato' | 'quincena';
  observacion: string;
}