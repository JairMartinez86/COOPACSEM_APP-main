export interface CatalogoItem {
  id: string;
  nombre: string;
}

export interface MunicipioItem extends CatalogoItem {
  departamentoId: string;
}


export interface Banco {
  codigo: string;
  nombreBanco: string;
  cuentaContable?: string;
}