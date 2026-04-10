import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiConfigService } from './ApiConfigService ';

export interface ConsecutivoPreview {
  fechaServidor: string;
  serie: string;
  numero: number;
  numeroFormateado: string;
  ceros: number;
  anio: number;
}

export interface ConsecutivoPreviewResponse {
  ok: boolean;
  codigo: number;
  data: ConsecutivoPreview;
}

@Injectable({ providedIn: 'root' })
export class ConsecutivoService {
  private http = inject(HttpClient);
  private api = inject(ApiConfigService);

  previewNext(serie: string): Observable<ConsecutivoPreviewResponse> {
    return this.http.get<ConsecutivoPreviewResponse>(
      `${this.api.baseUrl}/Consecutivo/preview?tipo=${encodeURIComponent((serie ?? '').trim())}`
    );
  }
}