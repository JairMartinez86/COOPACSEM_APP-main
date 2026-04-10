import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SocioRow } from '../../../ahorro.models';

@Component({
  selector: 'app-socios-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './socios-table.component.html',
  styleUrl: './socios-table.component.scss',
})
export class SociosTableComponent {
  @Input() rows: SocioRow[] = [];
  @Output() selectRow = new EventEmitter<SocioRow>();
}
