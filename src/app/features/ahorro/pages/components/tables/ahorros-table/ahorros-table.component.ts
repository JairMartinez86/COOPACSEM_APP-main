import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AppConfigService } from '../../../../../../core/services/app-config.service';
import { SimpleMovimientoRow } from '../../../../interface/ahorro.models';


@Component({
  selector: 'app-ahorros-table',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './ahorros-table.component.html',
  styleUrl: './ahorros-table.component.scss',
})
export class AhorrosTableComponent {
  private readonly appConfigService = inject(AppConfigService);
  @Input() rows: SimpleMovimientoRow[] = [];
  formatCurrency(v: number | null | undefined): string { const c = this.appConfigService.getCurrentSettings().currency || 'NIO'; return `${c} ${Number(v ?? 0).toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
}
