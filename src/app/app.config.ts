import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import {
  provideHttpClient,
  withInterceptorsFromDi,
  withFetch,
  HTTP_INTERCEPTORS
} from '@angular/common/http';

import { routes } from './app.routes';
import { AuthInterceptor } from './core/interceptors/auth-interceptor';
import { LoaderInterceptor } from './core/interceptors/loader.interceptor';

import { provideTranslateService } from '@ngx-translate/core';

import { MASSIVE_FORMS_NOTIFIER } from '@JairMartinez86/jmartinez-validator';
import { NotificationService } from './core/services/notification.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),

    provideHttpClient(
      withFetch(),
      withInterceptorsFromDi()
    ),

    provideTranslateService({
      fallbackLang: 'es',
      lang: 'es'
    }),

    { provide: HTTP_INTERCEPTORS, useClass: LoaderInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },

    {
      provide: MASSIVE_FORMS_NOTIFIER,
      useFactory: (n: NotificationService) => ({
        show: (message: string, title?: string, type?: 'success' | 'error' | 'warning') =>
          n.show(message, title ?? 'Validación', type ?? 'warning'),
      }),
      deps: [NotificationService],
    },
  ],
};