import { Component, inject, signal } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter, Observable } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

import { Modal } from './shared/components/modal/modal';
import { LoaderComponent } from './shared/components/loader/loader.component';
import { AppStateService } from './core/services/app-state.service';
import { RouteFilterContext } from './core/services/route-filter-context';
import { LanguageService } from './core/services/languageService';
import { AppConfigService } from './core/services/app-config.service';

import { es } from '../i18n/es';
import { en } from '../i18n/en';
import { ModalState, NotificationService } from './core/services/notification.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, LoaderComponent, Modal],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('Mi Empresa S.A.');

  notify = inject(NotificationService);
  modal$: Observable<ModalState> = this.notify.state$;
  ctx = inject(RouteFilterContext);

  private configService = inject(AppConfigService);
  public appState = inject(AppStateService);
  private langService = inject(LanguageService);
  private translate = inject(TranslateService);

  constructor() {
    this.translate.setTranslation('es', es);
    this.translate.setTranslation('en', en);

    this.translate.setFallbackLang('es');

    const lang =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('lang') || 'es'
        : 'es';

    this.translate.use(lang);

    this.appState.appName.set(this.title());
    this.langService.init();
    this.ctx.init();
  }

  debugModalResult(result: number): void {
    this.notify.resolve(result);
  }



ngOnInit(): void {
  this.configService.getPublicSettings().subscribe({
    next: (res) => {
      const data = res?.data;

      this.title.set(data?.companyName || 'Mi Empresa S.A.');
      this.appState.setAppName(data?.companyName || 'Mi Empresa S.A.');
      this.appState.setLogo(data?.logoUrl || '', data?.logoFileName || '');
    },
    error: () => {
      this.title.set('Mi Empresa S.A.');
      this.appState.setAppName('Mi Empresa S.A.');
      this.appState.clearLogo();
    }
  });
}

}