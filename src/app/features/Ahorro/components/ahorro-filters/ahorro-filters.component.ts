import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-ahorro-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ahorro-filters.component.html',
  styleUrl: './ahorro-filters.component.scss',
})
export class AhorroFiltersComponent {
  search = '';
  tipoCuenta = 'Todos';
  estado = 'Todos';
}
