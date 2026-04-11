// src/app/core/interceptors/loader-interceptor.ts
import { inject, Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoaderService } from '../services/loader.service';

@Injectable()
export class LoaderInterceptor implements HttpInterceptor {
  private active = 0;
  private loader = inject(LoaderService);

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const skipLoader = req.headers.get('X-Skip-Loader') === 'true';

    if (!skipLoader) {
      this.active++;
      this.loader.show();
    }

    return next.handle(req).pipe(
      finalize(() => {
        if (skipLoader) {
          return;
        }

        this.active--;

        if (this.active <= 0) {
          this.active = 0;
          this.loader.hide();
        }
      })
    );
  }
}