import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Planes } from '../../../ahorro.models';


export interface PlanCuotaRowView extends Planes {
  saldo: number;
}

@Component({
  selector: 'app-planes-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './planes-table.component.html',
  styleUrl: './planes-table.component.scss',
})
export class PlanesTableComponent {
  @Input() rows: Planes[] = [];

  get corrienteRows(): PlanCuotaRowView[] {
    return this.buildRowsWithSaldo(
      (this.rows || []).filter(x => x.tipoCuenta === 'Corriente')
    );
  }

  get navidenaRows(): PlanCuotaRowView[] {
    return this.buildRowsWithSaldo(
      (this.rows || []).filter(x => x.tipoCuenta === 'Navidena')
    );
  }

  private buildRowsWithSaldo(rows: Planes[]): PlanCuotaRowView[] {
    let acumulado = 0;

    return rows.map(row => {
      acumulado += Number(row.cuota || 0);

      return {
        ...row,
        saldo: acumulado,
      };
    });
  }
}