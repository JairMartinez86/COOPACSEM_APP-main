import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { SimpleMovimientoRow } from '../../../ahorro.models';

@Component({
  selector: 'app-retiros-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './retiros-table.component.html',
  styleUrl: './retiros-table.component.scss',
})
export class RetirosTableComponent {
  @Input() rows: SimpleMovimientoRow[] = [];
}
