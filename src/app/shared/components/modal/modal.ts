import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  ElementRef,
  ViewChild,
  Inject,
  PLATFORM_ID
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

type ModalType = 'success' | 'error' | 'warning' | 'delete' | 'cancel' | 'info';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './modal.html',
  styleUrl: './modal.scss'
})
export class Modal {
  private _open = false;
  private _btnModalAceptar?: ElementRef<HTMLButtonElement>;

  constructor(
    @Inject(PLATFORM_ID) private readonly platformId: object,
    @Inject(DOCUMENT) private readonly doc: Document
  ) {}

  @Input()
  set open(value: boolean) {
    this._open = value;

    if (value) {
      this.focusPrimaryButton();
    }
  }

  get open(): boolean {
    return this._open;
  }

  @Input() title = '';
  @Input() message = '';
  @Input() messageFormat: 'text' | 'html' = 'text';
  @Input() type: ModalType = 'info';

  @Output() result = new EventEmitter<number>();

  @ViewChild('btnModalAceptar')
  set btnModalAceptar(ref: ElementRef<HTMLButtonElement> | undefined) {
    this._btnModalAceptar = ref;

    if (ref && this.open) {
      this.focusPrimaryButton();
    }
  }

  get btnModalAceptar(): ElementRef<HTMLButtonElement> | undefined {
    return this._btnModalAceptar;
  }

  onClose(): void {
    this.result.emit(1);//si
  }

  onCancel(): void {
    this.result.emit(2);//no
  }

  private focusPrimaryButton(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const active = this.doc.activeElement as HTMLElement | null;
    active?.blur();

    queueMicrotask(() => {
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }

      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => {
          this._btnModalAceptar?.nativeElement?.focus();
        });
      } else {
        setTimeout(() => {
          this._btnModalAceptar?.nativeElement?.focus();
        }, 0);
      }
    });
  }
}