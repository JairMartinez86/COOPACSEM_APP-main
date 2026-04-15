import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AppConfigService } from '../../../../../../core/services/app-config.service';
import { AfiliacionMembresiaRow } from '../../../../interface/ahorro.models';


@Component({
  selector: 'app-afiliacion-table',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './afiliacion-table.component.html',
   styleUrl: './afiliacion-table.component.scss',
})
export class AfiliacionTableComponent {

  private readonly appConfigService = inject(AppConfigService);

  @Input() rows: AfiliacionMembresiaRow[] = [];

  get afiliacionRows(): AfiliacionMembresiaRow[] {
    return (this.rows || []).filter(x => x.tipo === 'Afiliacion');
  }

  get membresiaRows(): AfiliacionMembresiaRow[] {
    return (this.rows || []).filter(x => x.tipo === 'Membresia');
  }

  formatCurrency(v: number | null | undefined): string {
    const c = this.appConfigService.getCurrentSettings().currency || 'NIO';
    return `${c} ${Number(v ?? 0).toLocaleString('es-NI', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }
}