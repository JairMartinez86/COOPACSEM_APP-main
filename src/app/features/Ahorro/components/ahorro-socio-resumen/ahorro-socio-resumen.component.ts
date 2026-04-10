import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { SocioDetalleTab, SimpleMovimientoRow, SocioRow, Planes } from '../../ahorro.models';
import { AhorrosTableComponent } from '../tables/ahorros-table/ahorros-table.component';
import { RetirosTableComponent } from '../tables/retiros-table/retiros-table.component';
import { DepositosTableComponent } from '../tables/depositos-table/depositos-table.component';
import { SolicitudesTableComponent } from '../tables/solicitudes-table/solicitudes-table.component';
import { PlanesTableComponent } from '../tables/planes-table/planes-table.component';

@Component({
  selector: 'app-ahorro-socio-resumen',
  standalone: true,
  imports: [
    CommonModule,
    AhorrosTableComponent,
    RetirosTableComponent,
    DepositosTableComponent,
    SolicitudesTableComponent,
    PlanesTableComponent,
  ],
  templateUrl: './ahorro-socio-resumen.component.html',
  styleUrl: './ahorro-socio-resumen.component.scss',
})
export class AhorroSocioResumenComponent {
  @Input() socio: SocioRow | null = null;
  @Input() ahorrosRows: SimpleMovimientoRow[] = [];
  @Input() retirosRows: SimpleMovimientoRow[] = [];
  @Input() depositosRows: SimpleMovimientoRow[] = [];
  @Input() solicitudesRows: SimpleMovimientoRow[] = [];
  @Input() planesRows: Planes[] = [];

  detailTab: SocioDetalleTab = 'ahorros';

  setDetailTab(tab: SocioDetalleTab): void {
    this.detailTab = tab;
  }
}