import { Inject, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { BrowserApiService } from '../../../core/services/browser-api.service';
import { ApiConfigService } from '../../../core/services/ApiConfigService ';

import {
  CreditosActivosFiltro
} from '../interface/creditos-activos.interface';

@Injectable({
  providedIn: 'root'
})
export class CreditosActivosService extends BrowserApiService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiConfigService);

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    super(platformId);
  }

  getKpis(filtro: Partial<CreditosActivosFiltro>, skipLoader = false): Observable<any> {
    return this.browserOnly(() => {
      const params = this.buildParams(filtro);

      const headers = skipLoader
        ? { 'X-Skip-Loader': 'false' }
        : undefined;

      return this.http.get<any>(
        `${this.api.baseUrl}/CreditosActivos/kpis`,
        {
          params,
          headers,
          withCredentials: true
        }
      );
    });
  }



  getAll(filtro: CreditosActivosFiltro, skipLoader = false): Observable<any> {
    return this.browserOnly(() => {

      let params = this.buildParams(filtro)
        .set('page', filtro.page)
        .set('pageSize', filtro.pageSize);

      if (filtro.search?.trim()) {
        params = params.set('search', filtro.search.trim());
      }

      const headers = skipLoader
        ? { 'X-Skip-Loader': 'false' }
        : undefined;

      return this.http.get<any>(
        `${this.api.baseUrl}/CreditosActivos`,
        {
          params,
          headers,
          withCredentials: true
        }
      );
    });
  }

  getDetalle(noCredito: string, filtro: Partial<CreditosActivosFiltro>, skipLoader = false): Observable<any> {
    return this.browserOnly(() => {
      const params = this.buildParams(filtro);

      const headers = skipLoader
        ? { 'X-Skip-Loader': 'false' }
        : undefined;

      return this.http.get<any>(
        `${this.api.baseUrl}/CreditosActivos/${encodeURIComponent(noCredito)}/detalle`,
        {
          params,
          headers,
          withCredentials: true
        }
      );
    });
  }

  private buildParams(filtro: Partial<CreditosActivosFiltro>): HttpParams {
    let params = new HttpParams();

    const fechaCorte = this.toApiDate(filtro.fechaCorte);

    if (fechaCorte) {
      params = params.set('fechaCorte', fechaCorte);
    }

    if (filtro.codSocio?.trim()) {
      params = params.set('codSocio', filtro.codSocio.trim());
    }

    if (filtro.codSocio?.trim()) {
      params = params.set('codSocio', filtro.codSocio.trim());
    }

    if (filtro.tipoPrestamo?.trim()) {
      params = params.set('tipoPrestamo', filtro.tipoPrestamo.trim());
    }

    if (filtro.estado?.trim()) {
      params = params.set('estado', filtro.estado.trim());
    }


    return params;
  }

  private toApiDate(value: string | null | undefined): string {
    if (!value?.trim()) return '';

    const text = value.trim();

    // Ya viene correcto: yyyy-MM-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return text;
    }

    // Viene como dd/MM/yyyy
    const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

    if (match) {
      const [, day, month, year] = match;
      return `${year}-${month}-${day}`;
    }

    return text;
  }



  getReporteSaldosCartera(
    fechaCorte: string,
    estado: string,
    formato: 'pdf' | 'excel',
  ) {

    let params = new HttpParams()
      .set('fechaCorte', fechaCorte)
      .set('formato', formato);



    if (estado) {
      params = params.set('estado', estado);
    }




    return this.http.get(
      `${this.api.baseUrl}/CreditosActivos/reporte/saldo-cartera`,
      {
        params,
        withCredentials: true
      }
    );
  }


  getReporteSaldosCarteraHistorico(
    fechaInicio: string,
    fechaFin: string,
    estado: string,
    formato: 'pdf' | 'excel',
  ) {

    let params = new HttpParams()
      .set('fechaInicio', fechaInicio)
      .set('fechaFin', fechaFin)
      .set('formato', formato);



    if (estado) {
      params = params.set('estado', estado);
    }




    return this.http.get(
      `${this.api.baseUrl}/CreditosActivos/reporte/saldo-cartera-historico`,
      {
        params,
        withCredentials: true
      }
    );
  }



  

  getReporteMontoDisponibleSocio(
    fechaCorte: string,
    formato: 'pdf' | 'excel',
  ) {

    let params = new HttpParams()
      .set('fechaCorte', fechaCorte)
      .set('formato', formato);


    return this.http.get(
      `${this.api.baseUrl}/CreditosActivos/reporte/monto-disponible-socio`,
      {
        params,
        withCredentials: true
      }
    );
  }


  
  getReporteMovimientoCredito(
     fechaInicio: string,
    fechaFin: string,
    formato: 'pdf' | 'excel',
  ) {

     let params = new HttpParams()
      .set('fechaInicio', fechaInicio)
      .set('fechaFin', fechaFin)
      .set('formato', formato);


    return this.http.get(
      `${this.api.baseUrl}/CreditosActivos/reporte/movimiento-credito`,
      {
        params,
        withCredentials: true
      }
    );
  }



}