import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject, Observable } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { LoaderService } from './loader.service';

export interface ModalState {
  open: boolean;
  title: string;
  message: string;
  messageFormat: 'text' | 'html';
  type?: 'success' | 'error' | 'warning' | 'delete' | 'cancel' | 'info';
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private stateSubject = new BehaviorSubject<ModalState>({
    open: false,
    title: '',
    message: '',
    messageFormat: 'text',
    type: 'success',
  });

  state$ = this.stateSubject.asObservable();

  private isOpen = false;
  private resultSubject: Subject<number> | null = null;

  private closedSubject = new Subject<void>();
  closed$ = this.closedSubject.asObservable();

  constructor(
    private loader: LoaderService,
    private translate: TranslateService
  ) { }

  private t(key: string, params?: Record<string, any>): string {
    return this.translate.instant(key, params);
  }

  private detectFormat(message: string): 'text' | 'html' {
    const m = (message ?? '').trim();
    return /<\/?(ul|li|br|p|div|span|strong|em|b|i)\b[^>]*>/i.test(m)
      ? 'html'
      : 'text';
  }

  private getDefaultTitle(): string {
    return this.t('modal.services.defaultTitle');
  }

  private getConfirmTitle(): string {
    return this.t('modal.services.confirmTitle');
  }

  private getApiErrorMessage(code: number): string {


    switch (code) {
      case 400: return this.t('modal.services.badRequest');
      case 401: return this.t('modal.services.unauthorized');
      case 403: return this.t('modal.services.forbidden');
      case 404: return this.t('modal.services.notFound');
      case 409: return this.t('modal.services.conflict');
      case 422: return this.t('modal.services.validation');
      case 429: return this.t('modal.services.tooManyRequests');
      case 500: return this.t('modal.services.internalServerError');
      case 502: return this.t('modal.services.badGateway');
      case 503: return this.t('modal.services.serviceUnavailable');
      default: return this.t('modal.services.serverError');
    }
  }

  showFromApiResponse(api: any, title?: string) {
    // if (this.isOpen) return;





    this.isOpen = true;
    this.loader.hide();

    const code = Number(api?.codigo ?? api?.status ?? 0);

    const msg =
      api?.mensaje ||
      api?.message ||
      (typeof api === 'string' ? api : '') ||
      this.getApiErrorMessage(code);

    const resolvedTitle = title ?? this.getDefaultTitle();

    const type: 'success' | 'error' | 'warning' =
      api?.esError === 1 || code >= 400 ? 'error' : 'success';

    this.stateSubject.next({
      open: true,
      title: resolvedTitle,
      message: msg,
      messageFormat: this.detectFormat(msg),
      type
    });
  }

  show(
    message: string,
    title?: string,
    type: 'success' | 'error' | 'warning' | 'delete' | 'cancel' | 'info' = 'success'
  ) {


    if (this.isOpen) return;

    this.isOpen = true;
    this.loader.hide();

    const resolvedTitle = title ?? this.getDefaultTitle();

    this.stateSubject.next({
      open: true,
      title: resolvedTitle,
      message,
      messageFormat: this.detectFormat(message),
      type
    });
  }

  confirm(
    message: string,
    title?: string,
    type: 'warning' | 'delete' | 'cancel' = 'warning'
  ): Observable<number> | null {
    if (this.isOpen) return null;

    this.isOpen = true;
    this.loader.hide();

    this.resultSubject = new Subject<number>();

    const resolvedTitle = title ?? this.getConfirmTitle();

    this.stateSubject.next({
      open: true,
      title: resolvedTitle,
      message,
      messageFormat: this.detectFormat(message),
      type
    });

    return this.resultSubject.asObservable();
  }

 resolve(result: number) {

  if (this.resultSubject) {
    this.resultSubject.next(result);
    this.resultSubject.complete();
    this.resultSubject = null;
  }

  this.close();
}

  close() {

    const s = this.stateSubject.value;
    this.isOpen = false;
    this.loader.hide();

    this.stateSubject.next({ ...s, open: false });
    this.closedSubject.next();
  }


  public errorFortmat(errors: any[]): string {
    

    if (!errors || errors.length === 0) {
      return '';
    }

    const html = errors
      .map(e => {

        const messages = (e.messages || [])
          .map((m: string) => `<li>${m}</li>`)
          .join('');

        return `
        <li>
          <strong>${e.label}</strong>
          <ul>${messages}</ul>
        </li>
        `;
      })
      .join('');

    return `<ul class="validation-list">${html}</ul>`;
  }
}