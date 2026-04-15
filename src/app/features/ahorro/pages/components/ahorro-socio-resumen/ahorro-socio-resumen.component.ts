import { CommonModule } from '@angular/common';
import { Component, Input, inject, OnChanges, SimpleChanges } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { AhorrosTableComponent } from '../tables/ahorros-table/ahorros-table.component';
import { RetirosTableComponent } from '../tables/retiros-table/retiros-table.component';
import { DepositosTableComponent } from '../tables/depositos-table/depositos-table.component';
import { SolicitudesTableComponent } from '../tables/solicitudes-table/solicitudes-table.component';
import { PlanesTableComponent } from '../tables/planes-table/planes-table.component';
import { AppConfigService } from '../../../../../core/services/app-config.service';
import { AfiliacionMembresiaRow, PlanRow, SimpleMovimientoRow, SocioDetail, SocioDetalleTab } from '../../../interface/ahorro.models';
import { AfiliacionTableComponent } from "../tables/afiliacion-table/afiliacion-table.component";


@Component({
  selector: 'app-ahorro-socio-resumen',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    AhorrosTableComponent,
    RetirosTableComponent,
    DepositosTableComponent,
    SolicitudesTableComponent,
    PlanesTableComponent,
    AfiliacionTableComponent
],
  templateUrl: './ahorro-socio-resumen.component.html',
  styleUrl: './ahorro-socio-resumen.component.scss',
})
export class AhorroSocioResumenComponent implements OnChanges {
  private readonly appConfigService = inject(AppConfigService);

  @Input() socio: SocioDetail | null = null;
  @Input() ahorrosRows: SimpleMovimientoRow[] = [];
  @Input() retirosRows: SimpleMovimientoRow[] = [];
  @Input() depositosRows: SimpleMovimientoRow[] = [];
  @Input() solicitudesRows: SimpleMovimientoRow[] = [];
   @Input() afiliacionMembresiaRows: AfiliacionMembresiaRow[] = [];
  @Input() planesRows: PlanRow[] = [];

  detailTab: SocioDetalleTab = 'ahorros';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['socio']) {
      this.detailTab = 'ahorros';
    }
  }

  setDetailTab(tab: SocioDetalleTab): void {
    this.detailTab = tab;
  }

  get initials(): string {
    const name = this.socio?.nombre?.trim() || '';
    if (!name) return 'NA';
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map(x => x[0]?.toUpperCase() || '')
      .join('');
  }

  formatCurrency(value: number | null | undefined): string {
    const currency = this.appConfigService.getCurrentSettings().currency || 'NIO';
    return `${currency} ${Number(value ?? 0).toLocaleString('es-NI', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }
}