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

  search: string = '';
  tipoCuenta: string = '';
  estado: string = '';

  ngOnInit(): void {
    this.subs.add(
      this.filterSvc.query$(this.filterKey).subscribe((query: any) => {
        if (typeof query === 'string') {
          this.search = query;
          this.tipoCuenta = '';
          this.estado = '';
        } else {
          this.search = this.toText(query?.search);
          this.tipoCuenta = this.toText(query?.tipoCuenta);
          this.estado = this.toText(query?.estado);
        }

        this.emitFilters();
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  emitFilters(): void {
    this.filtersChange.emit({
      search: this.toText(this.search).trim(),
      tipoCuenta: this.toText(this.tipoCuenta),
      estado: this.toText(this.estado),
    });
  }

  clearFilters(): void {
    this.search = '';
    this.tipoCuenta = '';
    this.estado = '';
    this.emitFilters();
  }

  private toText(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }
}