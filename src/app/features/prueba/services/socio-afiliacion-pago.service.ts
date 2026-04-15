import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiConfigService } from '../../../core/services/ApiConfigService ';

@Injectable({ providedIn: 'root' })
export class SocioAfiliacioPagoService {
    private readonly http = inject(HttpClient);
    private readonly api = inject(ApiConfigService);

    getDetail(socioId: string, skipLoader = false): Observable<any> {
        const headers = skipLoader ? { 'X-Skip-Loader': 'true' } : undefined;

        return this.http.get<any>(
            `${this.api.baseUrl}/socio-afiliacion-pago/detail/${socioId}`,
            {
                headers,
                withCredentials: true
            }
        );
    }


    createPago(payload: any) {
        return this.http.post<any>(
            `${this.api.baseUrl}/socio-afiliacion-pago/pago`,
            payload,
            { withCredentials: true }
        );
    }
}