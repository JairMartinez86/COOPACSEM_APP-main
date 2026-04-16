import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AppConfigService } from '../../../../../../core/services/app-config.service';
import { SimpleMovimientoRow } from '../../../../interface/ahorro.models';

@Component({
  selector: 'app-depositos-table',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './depositos-table.component.html',
  styleUrl: './depositos-table.component.scss'
})
export class DepositosTableComponent implements OnChanges {
  private readonly appConfigService = inject(AppConfigService);

  @Input() rows: SimpleMovimientoRow[] = [];

  page = 1;
  pageSize = 20;
  pagedRows: SimpleMovimientoRow[] = [];
  filteredRows: SimpleMovimientoRow[] = [];
  totalPages = 1;
  filterText = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rows']) {
      this.page = 1;
      this.applyFilter();
    }
  }

  formatCurrency(v: number | null | undefined): string {
    const c = this.appConfigService.getCurrentSettings().currency || 'NIO';
    return `${c} ${Number(v ?? 0).toLocaleString('es-NI', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  onFilterChange(value: string): void {
    this.filterText = value ?? '';
    this.page = 1;
    this.applyFilter();
  }

  applyFilter(): void {
    const term = this.normalizeText(this.filterText);

    if (!term) {
      this.filteredRows = [...this.rows];
      this.updatePagination();
      return;
    }

    this.filteredRows = this.rows.filter(row => {
      const cuentaTraducida =
        row.tipoCuenta === 'Corriente'
          ? 'corriente'
          : 'navidad navideña navidena christmas';

      const searchable = [
        row.fechaRegistro,
        row.noDeposito,
        row.fecha,
        row.banco,
        row.tipoCuenta,
        cuentaTraducida,
        row.monto?.toString()
      ]
        .filter(Boolean)
        .map(x => this.normalizeText(String(x)))
        .join(' ');

      return searchable.includes(term);
    });

    this.updatePagination();
  }

  updatePagination(): void {
    const total = this.filteredRows.length;
    this.totalPages = Math.max(1, Math.ceil(total / this.pageSize));

    if (this.page > this.totalPages) {
      this.page = this.totalPages;
    }

    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.pagedRows = this.filteredRows.slice(start, end);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.page = page;
    this.updatePagination();
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.updatePagination();
    }
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.updatePagination();
    }
  }

  get visiblePages(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;

    let start = Math.max(1, this.page - 2);
    let end = Math.min(this.totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  get startRecord(): number {
    if (this.filteredRows.length === 0) return 0;
    return (this.page - 1) * this.pageSize + 1;
  }

  get endRecord(): number {
    return Math.min(this.page * this.pageSize, this.filteredRows.length);
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}