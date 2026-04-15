import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AppConfigService } from '../../../../../core/services/app-config.service';
import { AfiliacionMembresiaPagoRow } from '../../../interface/socio-afiliacion-pago.model';

@Component({
  selector: 'app-afiliacion-membresia-table',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './afiliacion-membresia-table.component.html',
  styleUrl: './afiliacion-membresia-table.component.scss'
})
export class AfiliacionMembresiaTableComponent {
  private readonly appConfigService = inject(AppConfigService);

  @Input() afiliacionRows: AfiliacionMembresiaPagoRow[] = [];
  @Input() membresiaRows: AfiliacionMembresiaPagoRow[] = [];

  formatCurrency(v: number | null | undefined): string {
    const c = this.appConfigService.getCurrentSettings().currency || 'NIO';
    return `${c} ${Number(v ?? 0).toLocaleString('es-NI', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }
}