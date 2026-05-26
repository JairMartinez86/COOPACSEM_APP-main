import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ApiConfigService } from '../../../core/services/ApiConfigService ';

export interface PagoInteresesFiltro {
  corteId?: string | null;
  fechaCorte?: string | null;
  tipoInteres?: string | null;
  estadoSocio?: string | null;
  search?: string | null;
  page?: number;
  pageSize?: number;
}


@Injectable({
  providedIn: 'root'
})
export class PagoInteresesService {

  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiConfigService);

  private get baseUrl(): string {
    return `${this.api.baseUrl}/PagoIntereses`;
  }

  getCortes() {
    return this.http.get(
      `${this.baseUrl}/cortes`,
      {
        withCredentials: true
      }
    );
  }

 getResumen(filtro: PagoInteresesFiltro) {
  let params = new HttpParams();

  if (filtro.fechaCorte) {
    params = params.set('fechaCorte', filtro.fechaCorte);
  }


  return this.http.get(
    `${this.baseUrl}/resumen`,
    {
      params,
      withCredentials: true
    }
  );
}

  procesarPago(data: any) {
    return this.http.post(
      `${this.baseUrl}/procesar`,
      data,
      {
        withCredentials: true
      }
    );
  }

  exportar(
    filtro: PagoInteresesFiltro,
    formato: 'pdf' | 'excel'
  ) {
    let params = new HttpParams()
      .set('formato', formato);

    if (filtro.corteId) {
      params = params.set('corteId', filtro.corteId);
    }

    if (filtro.fechaCorte) {
      params = params.set('fechaCorte', filtro.fechaCorte);
    }

    if (filtro.tipoInteres) {
      params = params.set('tipoInteres', filtro.tipoInteres);
    }

    if (filtro.estadoSocio) {
      params = params.set('estadoSocio', filtro.estadoSocio);
    }

    return this.http.get(
      `${this.baseUrl}/exportar`,
      {
        params,
        withCredentials: true
      }
    );
  }
}