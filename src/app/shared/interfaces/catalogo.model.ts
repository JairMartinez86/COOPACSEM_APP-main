export interface CatalogoItem {
  id: string;
  nombre: string;
}

export interface MunicipioItem extends CatalogoItem {
  departamentoId: string;
}