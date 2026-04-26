import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class EstadoCuentaListaService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = 'api/EstadoCuentaLista';

    getAll(page = 1, pageSize = 20, search = '', tipoCuenta = '', estado = '') {
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

        return this.http.get(this.baseUrl, { params });
    }
}