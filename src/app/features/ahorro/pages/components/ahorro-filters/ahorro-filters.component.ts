import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
  inject
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { TableFilterService } from '../../../../../core/services/table-filter.service';

type AhorroFiltersValue = {
  search: string;
  tipoCuenta: string;
  estado: string;
};

@Component({
  selector: 'app-ahorro-filters',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './ahorro-filters.component.html',
  styleUrl: './ahorro-filters.component.scss',
})
export class AhorroFiltersComponent implements OnInit, OnDestroy {
  @Output() filtersChange = new EventEmitter<AhorroFiltersValue>();

  private readonly filterSvc = inject(TableFilterService);
  private readonly subs = new Subscription();
  private readonly filterKey = 'ahorro';

  search = '';
  tipoCuenta = '';
  estado = '';
  requireEnter = false;

  ngOnInit(): void {
    this.subs.add(
      this.filterSvc.requireEnter$(this.filterKey).subscribe(value => {
        this.requireEnter = value;
      })
    );

    // Refleja lo que se escribe en navbar o en este mismo input
    this.subs.add(
      this.filterSvc.draft$(this.filterKey).subscribe((draft: string) => {
        const nextValue = this.toText(draft);
        if (this.search !== nextValue) {
          this.search = nextValue;
        }
      })
    );

    // Cuando se confirma la búsqueda, filtra la tabla directamente
    this.subs.add(
      this.filterSvc.query$(this.filterKey).subscribe((query: string) => {
        this.filtersChange.emit({
          search: this.toText(query).trim(),
          tipoCuenta: this.toText(this.tipoCuenta),
          estado: this.toText(this.estado),
        });
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  onSearchInputChange(): void {
    const value = this.toText(this.search);
    this.filterSvc.setDraft(this.filterKey, value);

    if (this.requireEnter) {
      return;
    }

    this.applySearch(value);
  }

  onSearchKeyup(event: KeyboardEvent): void {
    if (!this.requireEnter) {
      return;
    }

    if (event.key !== 'Enter') {
      return;
    }

    this.applySearch(this.search);
  }

  onTipoCuentaChange(): void {
    this.emitFiltersUsingCurrentSearch();
  }

  onEstadoChange(): void {
    this.emitFiltersUsingCurrentSearch();
  }

  clearFilters(): void {
    this.search = '';
    this.tipoCuenta = '';
    this.estado = '';

    this.filterSvc.clear(this.filterKey);

    this.filtersChange.emit({
      search: '',
      tipoCuenta: '',
      estado: '',
    });
  }

  private applySearch(value: unknown): void {
    const normalized = this.toText(value).trim();

    this.filterSvc.setDraft(this.filterKey, normalized);
    this.filterSvc.setQuery(this.filterKey, normalized);
  }

  private emitFiltersUsingCurrentSearch(): void {
    const currentQuery = this.toText(this.search).trim();

    this.filtersChange.emit({
      search: currentQuery,
      tipoCuenta: this.toText(this.tipoCuenta),
      estado: this.toText(this.estado),
    });
  }

  private toText(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }
}