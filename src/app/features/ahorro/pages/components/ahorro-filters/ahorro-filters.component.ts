import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-ahorro-filters',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './ahorro-filters.component.html',
  styleUrl: './ahorro-filters.component.scss',
})
export class AhorroFiltersComponent {
  @Output() filtersChange = new EventEmitter<{ search: string; tipoCuenta: string; estado: string }>();

  search = '';
  tipoCuenta = '';
  estado = '';

  emitFilters(): void {
    this.filtersChange.emit({
      search: this.search?.trim() ?? '',
      tipoCuenta: this.tipoCuenta,
      estado: this.estado,
    });
  }

  clearFilters(): void {
    this.search = '';
    this.tipoCuenta = '';
    this.estado = '';
    this.emitFilters();
  }
}
