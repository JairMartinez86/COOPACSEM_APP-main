import { CommonModule } from '@angular/common';
import { Component, Input, inject, OnChanges, SimpleChanges } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
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

  @Input() rows: SimpleMovimientoRow[] = [];

  page = 1;
  pageSize = 20;
  pageSizeOptions = [5, 10, 20, 50];

  pagedRows: SimpleMovimientoRow[] = [];
  totalPages = 1;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rows']) {
      this.page = 1;
      this.updatePagination();
    }
  }

  formatCurrency(v: number | null | undefined): string {
    const c = this.appConfigService.getCurrentSettings().currency || 'NIO';
    return `${c} ${Number(v ?? 0).toLocaleString('es-NI', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  updatePagination(): void {
    const total = this.rows.length;
    this.totalPages = Math.max(1, Math.ceil(total / this.pageSize));

    if (this.page > this.totalPages) {
      this.page = this.totalPages;
    }

    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;

    this.pagedRows = this.rows.slice(start, end);
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
    if (this.rows.length === 0) return 0;
    return (this.page - 1) * this.pageSize + 1;
  }

  get endRecord(): number {
    return Math.min(this.page * this.pageSize, this.rows.length);
  }
}