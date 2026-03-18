import { Component, inject, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { LoaderService } from '../../../core/services/loader.service';
import { AppStateService } from '../../../core/services/app-state.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  standalone: true,
  selector: 'app-loader',
  imports: [CommonModule, TranslateModule],
  templateUrl: './loader.component.html',
  styleUrls: ['./loader.component.css']
})
export class LoaderComponent implements OnDestroy {
  public loader = inject(LoaderService);

  public appState = inject(AppStateService);

  // Texto animado
  public loadingText = signal('');

  private baseText = 'Cargando';
  private index = 0;
  private dots = 0;

  private timerId: any = null;
  private sub: Subscription;

  constructor() {
    // ✅ Inicia / detiene la animación según el estado del loader
    this.sub = this.loader.loading$.subscribe(isLoading => {
      if (isLoading) this.startTyping();
      else this.stopTyping();
    });
  }

  ngOnDestroy(): void {
    this.stopTyping();
    this.sub.unsubscribe();
  }

  private startTyping() {
    // evita duplicar intervalos
    if (this.timerId) return;

    // estado inicial
    this.index = 0;
    this.dots = 0;
    this.loadingText.set('');

    this.timerId = setInterval(() => {
      if (this.index < this.baseText.length) {
        this.index++;
        this.loadingText.set(this.baseText.substring(0, this.index));
      } else {
        // puntos: "", ".", "..", "..."
        this.dots = (this.dots + 1) % 4;
        this.loadingText.set(this.baseText + '.'.repeat(this.dots));

        // reinicia después de completar los puntos
        if (this.dots === 0) {
          this.index = 0;
        }
      }
    }, 160); // velocidad (ajusta a gusto)
  }

  private stopTyping() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.loadingText.set('');
  }
}