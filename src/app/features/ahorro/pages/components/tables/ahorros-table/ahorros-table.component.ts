import { CommonModule } from '@angular/common';
import { Component, Input, inject, OnChanges, SimpleChanges } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AppConfigService } from '../../../../../../core/services/app-config.service';
import { SimpleMovimientoRow } from '../../../../interface/ahorro.models';

@Component({
  selector: 'app-ahorros-table',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './ahorros-table.component.html',
  styleUrl: './ahorros-table.component.scss',
})
export class AhorrosTableComponent implements OnChanges {
  private readonly appConfigService = inject(AppConfigService);
  private readonly translate = inject(TranslateService);

  @Input() rows: SimpleMovimientoRow[] = [];

  page = 1;
  pageSize = 20;
  pageSizeOptions = [5, 10, 20, 50];

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
      const descripcionTraducida = this.getTranslatedDescription(row);
      const cuentaTraducida =
        row.tipoCuenta === 'Corriente'
          ? `${this.translate.instant('ahorro.accountTypes.current')} corriente current`
          : `${this.translate.instant('ahorro.accountTypes.christmas')} navidad navideña navidena christmas`;

      const interesesTexto =
        (row.descripcion || '').toUpperCase().includes('INTERESE')
          ? `${this.translate.instant('ahorro.accountTypes.intereses')} intereses interests`
          : '';

      const searchable = [
        row.fechaRegistro,
        row.fecha,
        row.descripcion,
        descripcionTraducida,
        row.tipoCuenta,
        cuentaTraducida,
        interesesTexto,
        row.monto?.toString(),
        row.saldo?.toString()
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

  onPageSizeChange(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.pageSize = value;
    this.page = 1;
    this.updatePagination();
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

  private getTranslatedDescription(row: SimpleMovimientoRow): string {
    if (row.descripcion === 'Ahorro ExtOrd') {
      return this.translate.instant('socioAhorro.destinos.ahorroCorriente');
    }

    if (row.descripcion === 'Ahorro Nav') {
      return this.translate.instant('socioAhorro.destinos.ahorroNavideno');
    }

    if (row.descripcion === 'Retiro ExtOrd') {
      return this.translate.instant('socioRetiro.destinos.retiroCorriente');
    }

    if (row.descripcion === 'Retiro Nav') {
      return this.translate.instant('socioRetiro.destinos.retiroNavideno');
    }

    if (row.descripcion === 'Ahorro Intereses') {
      return this.translate.instant('socioAhorro.destinos.ahorroIntereses');
    }

    return row.descripcion ?? '';
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}