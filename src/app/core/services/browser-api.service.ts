// core/services/browser-api.service.ts
import { Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { EMPTY, Observable } from 'rxjs';

export abstract class BrowserApiService {
  constructor(@Inject(PLATFORM_ID) protected platformId: object) {}

  protected browserOnly<T>(call: () => Observable<T>): Observable<T> {
    if (!isPlatformBrowser(this.platformId)) {
      return EMPTY;
    }
    return call();
  }
}