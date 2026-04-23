export interface OtroIngresoForm {
  id: string | null;
  socioId: string | null;
  origen: string | null;
  ingresoMensual: number | null;
  observaciones: string | null;
  activo: boolean;
  isNew?: boolean;
  isDeleted?: boolean;
}

export const EMPTY_OTRO_INGRESO: OtroIngresoForm = {
  id: null,
  socioId: null,
  origen: null,
  ingresoMensual: null,
  observaciones: null,
  activo: true,
  isNew: true,
  isDeleted: false
};