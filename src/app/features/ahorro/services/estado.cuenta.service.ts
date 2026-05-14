import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ApiConfigService } from '../../../core/services/ApiConfigService ';

@Injectable({
    providedIn: 'root'
})
export class EstadoCuentaService {

    private readonly http = inject(HttpClient);
    private readonly api = inject(ApiConfigService);

    private get baseUrl(): string {
        return `${this.api.baseUrl}/EstadoCuentaLista`;
    }

    getAll(
        page = 1,
        pageSize = 20,
        search = '',
        tipoCuenta = '',
        estado = ''
    ) {

        let params = new HttpParams()
            .set('page', page)
            .set('pageSize', pageSize);

        if (search?.trim()) {
            params = params.set('search', search.trim());
        }

        if (tipoCuenta) {
            params = params.set('tipoCuenta', tipoCuenta);
        }

        if (estado) {
            params = params.set('estado', estado);
        }

        return this.http.get(this.baseUrl, {
            params,
            withCredentials: true
        });
    }

    getDetalle(
        socioId: string,
        filtros?: {
            tipoReporte?: string;
            tipoCuenta?: string;
            fechaCorte?: string;
            fechaDesde?: string;
            fechaHasta?: string;
            mes?: number;
            anio?: number;
        }
    ) {

        let params = new HttpParams();

        if (filtros?.tipoReporte) {
            params = params.set('tipoReporte', filtros.tipoReporte);
        }

        if (filtros?.tipoCuenta) {
            params = params.set('tipoCuenta', filtros.tipoCuenta);
        }

        if (filtros?.fechaCorte) {
            params = params.set('fechaCorte', filtros.fechaCorte);
        }

        if (filtros?.fechaDesde) {
            params = params.set('fechaDesde', filtros.fechaDesde);
        }

        if (filtros?.fechaHasta) {
            params = params.set('fechaHasta', filtros.fechaHasta);
        }

        if (filtros?.mes) {
            params = params.set('mes', filtros.mes);
        }

        if (filtros?.anio) {
            params = params.set('anio', filtros.anio);
        }

        return this.http.get(
            `${this.baseUrl}/${socioId}/detalle`,
            {
                params,
                withCredentials: true
            }
        );
    }

    getReporteSaldosAhorroActual(
        tipoCuenta: string,
        formato: 'pdf' | 'excel',
        fechaInicio?: string | null,
        fechaFin?: string | null,
        estado?: string | null
    ) {

        let params = new HttpParams()
            .set('tipoCuenta', tipoCuenta)
            .set('formato', formato);

        if (fechaInicio) {
            params = params.set('fechaInicio', fechaInicio);
        }

        if (fechaFin) {
            params = params.set('fechaFin', fechaFin);
        }

        if (estado !== null && estado !== undefined && estado !== '') {
            params = params.set('estado', estado);
        }

        return this.http.get(
            `${this.baseUrl}/reporte/saldos-ahorro-actual`,
            {
                params,
                withCredentials: true
            }
        );
    }

    getReporteSaldosHistoricosAhorro(
        tipoCuenta: string,
        formato: 'pdf' | 'excel',
        fechaInicio?: string | null,
        fechaFin?: string | null,
        estado?: string | null
    ) {

        let params = new HttpParams()
            .set('tipoCuenta', tipoCuenta)
            .set('formato', formato);

        if (fechaInicio) {
            params = params.set('fechaInicio', fechaInicio);
        }

        if (fechaFin) {
            params = params.set('fechaFin', fechaFin);
        }

        if (estado) {
            params = params.set('estado', estado);
        }

        return this.http.get(
            `${this.baseUrl}/reporte/saldos-historicos-ahorro`,
            {
                params,
                withCredentials: true
            }
        );
    }

    getReporteAfiliacionMembresia(
        formato: 'pdf' | 'excel',
        fechaFin?: string | null,
        estado?: string | null
    ) {

        let params = new HttpParams()
            .set('formato', formato);

        if (fechaFin) {
            params = params.set('fechaFin', fechaFin);
        }

        if (estado !== null && estado !== undefined && estado !== '') {
            params = params.set('estado', estado);
        }

        return this.http.get(
            `${this.baseUrl}/reporte/afiliacion-membresia`,
            {
                params,
                withCredentials: true
            }
        );
    }

    getReporteIntegracionAhorro(
        formato: 'pdf' | 'excel',
        anio: number,
        tipoCuenta: string,
        estado?: string | null
    ) {

        let params = new HttpParams()
            .set('formato', formato)
            .set('anio', anio)
            .set('tipoCuenta', tipoCuenta);

        if (estado) {
            params = params.set('estado', estado);
        }

        return this.http.get(
            `${this.baseUrl}/reporte/integracion-ahorro`,
            {
                params,
                withCredentials: true
            }
        );
    }

    getReportePagosAfiliaciones(
        formato: 'pdf' | 'excel',
        fechaInicio?: string | null,
        fechaFin?: string | null,
        estado?: string | null
    ) {

        let params = new HttpParams()
            .set('formato', formato);

        if (fechaInicio) {
            params = params.set('fechaInicio', fechaInicio);
        }

        if (fechaFin) {
            params = params.set('fechaFin', fechaFin);
        }

        if (estado) {
            params = params.set('estado', estado);
        }

        return this.http.get(
            `${this.baseUrl}/reporte/pagos-afiliaciones`,
            {
                params,
                withCredentials: true
            }
        );
    }
}