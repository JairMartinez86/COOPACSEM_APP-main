import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { CuentaRow } from '../../../ahorro.models';

@Component({
  selector: 'app-cuentas-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cuentas-table.component.html',
  styleUrl: './cuentas-table.component.scss',
})
export class CuentasTableComponent {
  @Input() rows: CuentaRow[] = [];
}
