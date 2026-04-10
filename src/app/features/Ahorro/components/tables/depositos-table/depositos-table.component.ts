import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { SimpleMovimientoRow } from '../../../ahorro.models';

@Component({
  selector: 'app-depositos-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './depositos-table.component.html',
  styleUrl: './depositos-table.component.scss',
})
export class DepositosTableComponent {
  @Input() rows: SimpleMovimientoRow[] = [];
}
