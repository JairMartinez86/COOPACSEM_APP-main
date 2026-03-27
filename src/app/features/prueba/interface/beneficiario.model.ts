export interface BeneficiarioForm {
  id: string | null;
  socioId: string | null;
  benefnombre: string | null;
  porcentaje: number | null;
  parentesco: string | null;
  cedula: string | null;
  activo: boolean;
  createdAtUtc?: string | null;
  updatedAtUtc?: string | null;
  isNew?: boolean;
  isDeleted?: boolean;
}

export const EMPTY_BENEFICIARIO: BeneficiarioForm = {
  id: null,
  socioId: null,
  benefnombre: null,
  porcentaje: null,
  parentesco: null,
  cedula: null,
  activo: true,
  createdAtUtc: null,
  updatedAtUtc: null,
  isNew: true,
  isDeleted: false,
};
