import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AppConfigService } from '../../../../../../core/services/app-config.service';
import { PlanRow } from '../../../../interface/ahorro.models';


@Component({ selector: 'app-planes-table', standalone: true, imports: [CommonModule, TranslateModule], templateUrl: './planes-table.component.html', styleUrl: './planes-table.component.scss' })
export class PlanesTableComponent {
  private readonly appConfigService = inject(AppConfigService);
  @Input() rows: PlanRow[] = [];
  get corrienteRows(): PlanRow[] { return (this.rows || []).filter(x => x.tipoCuenta === 'Corriente'); }
  get navidenaRows(): PlanRow[] { return (this.rows || []).filter(x => x.tipoCuenta === 'Navidena'); }
  formatCurrency(v: number | null | undefined): string { const c = this.appConfigService.getCurrentSettings().currency || 'NIO'; return `${c} ${Number(v ?? 0).toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
}
