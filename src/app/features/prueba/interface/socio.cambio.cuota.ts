export interface SocioCambioCuota {
  socioId: string;
  tipoCuenta: 'Corriente' | 'Navideno';
  tipoMovimiento: 'Incremento' | 'Disminucion';
  cuotaActual: number | null;
  nuevaCuota: number | null;
  vigencia: string;
  aplicaDesde: 'Inmediato' | 'Quincena';
  observacion: string;
}