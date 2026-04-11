import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AppConfigService } from '../../../../../../core/services/app-config.service';
import { PaginationMeta, SocioRow } from '../../../../interface/ahorro.models';

@Component({
  selector: 'app-socios-table',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './socios-table.component.html',
  styleUrl: './socios-table.component.scss'
})
export class SociosTableComponent {
  private readonly appConfigService = inject(AppConfigService);


  @Input() rows: SocioRow[] = [];
  @Input() pagination: PaginationMeta = {
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
    start: 0,
    end: 0
  };
  @Input() selectedId: string | null = null;

  @Output() selectRow = new EventEmitter<SocioRow>();
  @Output() pageChange = new EventEmitter<number>();

  formatCurrency(v: number | null | undefined): string {
    const c = this.appConfigService.getCurrentSettings().currency || 'NIO';
    return `${c} ${Number(v ?? 0).toLocaleString('es-NI', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.pagination.totalPages || page === this.pagination.page) {
      return;
    }

    this.pageChange.emit(page);
  }

  getInitials(value: string | null | undefined): string {
    if (!value) {
      return 'SO';
    }

    const parts = value.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }

    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }
selectSocio(row: SocioRow): void {
  this.selectRow.emit(row);
}
}