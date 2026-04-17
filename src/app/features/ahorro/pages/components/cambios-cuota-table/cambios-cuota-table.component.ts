import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AppConfigService } from '../../../../../core/services/app-config.service';
import { CambioCuotaRow } from '../../../interface/ahorro.models';


@Component({
    selector: 'app-cambios-cuota-table',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule],
    templateUrl: './cambios-cuota-table.component.html',
    styleUrl: './cambios-cuota-table.component.scss'
})
export class CambiosCuotaTableComponent implements OnChanges {
    readonly appConfigService = inject(AppConfigService);
    private readonly translate = inject(TranslateService); 

    @Input() rows: CambioCuotaRow[] = [];

    filterText = '';
    filteredRows: CambioCuotaRow[] = [];
    pagedRows: CambioCuotaRow[] = [];

    page = 1;
    pageSize = 10;
    totalPages = 1;

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['rows']) {
            this.page = 1;
            this.applyFilter();
        }
    }

    onFilterChange(value: string): void {
        this.filterText = value ?? '';
        this.page = 1;
        this.applyFilter();
    }

    applyFilter(): void {
        const term = this.normalize(this.filterText);

        if (!term) {
            this.filteredRows = [...this.rows];
            this.updatePagination();
            return;
        }
        this.filteredRows = this.rows.filter(item => {
            const searchText = [
                item.fechaRegistro,
                item.tipoMovimiento,
                item.tipoCuenta,
                item.cuotaAnterior,
                item.actual
            ]
                .map(x => this.normalize(String(x ?? '')))
                .join(' ');

            return searchText.includes(term);
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

    goToPage(newPage: number): void {
        if (newPage < 1 || newPage > this.totalPages) return;
        this.page = newPage;
        this.updatePagination();
    }

    get visiblePages(): number[] {
        const pages: number[] = [];
        const maxVisible = 5;

        let start = Math.max(1, this.page - 2);
        let end = Math.min(this.totalPages, start + maxVisible - 1);

        if ((end - start + 1) < maxVisible) {
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

    formatCurrency(value: number | null | undefined): string {
        return Number(value ?? 0).toLocaleString('es-NI', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    private normalize(value: string): string {
        return value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }


    
  // Label de tipo
  getTipoLabel(tipo: string): string {
    const t = (tipo || '');

    if (t === 'Incremento') return this.translate.instant('socioCambioCuota.options.incremento');
    if (t === 'Disminucion') return this.translate.instant('socioCambioCuota.options.disminucion');
    if (t === 'Apertura') return this.translate.instant('socioCambioCuota.options.apertura');

    return tipo;
  }

  // Clase CSS
  getTipoClass(tipo: string): string {
    const t = (tipo || '');

    if (t === 'Incremento') return 'badge badge-soft-success me-1';
    if (t === 'Disminucion') return 'badge badge-soft-danger me-1';
    if (t.includes('Apertura')) return 'badge badge-soft-primary me-1';

    return 'badge-soft-secondary';
  }
}