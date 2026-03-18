// src/app/core/interceptors/loader-interceptor.ts
import { inject, Injectable } from '@angular/core';
import {
  HttpEvent, HttpHandler, HttpInterceptor, HttpRequest
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoaderService } from '../services/loader.service';

@Injectable()
export class LoaderInterceptor implements HttpInterceptor {
  private active = 0;
private loader = inject(LoaderService);

  constructor() {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    // (Opcional) excluir endpoints si quieres:
    // if (req.url.includes('/Auth/Refresh')) return next.handle(req);

    this.active++;
    this.loader.show();

    return next.handle(req).pipe(
      finalize(() => {
        this.active--;
        if (this.active <= 0) {
          this.active = 0;
          this.loader.hide();
        }
      })
    );
  }
}