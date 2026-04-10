import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export interface PlanCuotaRow {
  numero: number;
  fecha: string;
  cuota: number;
  estado: 'Pendiente' | 'Pagado' | 'Vencido';
  tipoCuenta: 'Corriente' | 'Navidena';
}

export interface PlanCuotaRowView extends PlanCuotaRow {
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
  @Input() rows: PlanCuotaRow[] = [];

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

  private buildRowsWithSaldo(rows: PlanCuotaRow[]): PlanCuotaRowView[] {
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