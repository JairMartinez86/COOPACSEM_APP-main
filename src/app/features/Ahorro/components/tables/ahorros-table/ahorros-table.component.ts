import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { SimpleMovimientoRow } from '../../../ahorro.models';

@Component({
  selector: 'app-ahorros-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ahorros-table.component.html',
  styleUrl: './ahorros-table.component.scss',
})
export class AhorrosTableComponent {
  @Input() rows: SimpleMovimientoRow[] = [];
}
