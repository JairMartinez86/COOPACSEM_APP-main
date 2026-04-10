import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { SimpleMovimientoRow } from '../../../ahorro.models';

@Component({
  selector: 'app-solicitudes-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './solicitudes-table.component.html',
  styleUrl: './solicitudes-table.component.scss',
})
export class SolicitudesTableComponent {
  @Input() rows: SimpleMovimientoRow[] = [];
}
