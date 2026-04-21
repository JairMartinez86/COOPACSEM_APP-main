import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AppConfigService } from '../../../../../../core/services/app-config.service';
import { PlanRow } from '../../../../interface/ahorro.models';

@Component({
  selector: 'app-planes-table',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './planes-table.component.html',
  styleUrl: './planes-table.component.scss'
})
export class PlanesTableComponent {
  private readonly appConfigService = inject(AppConfigService);

  @Input() rows: PlanRow[] = [];

  get corrienteRows(): PlanRow[] {
    return (this.rows || []).filter(x => x.tipoCuenta === 'Corriente');
  }

  get navidenaRows(): PlanRow[] {
    return (this.rows || []).filter(x => x.tipoCuenta === 'Navidena');
  }

  formatCurrency(value: number | null | undefined): string {
    const currency = this.appConfigService.getCurrentSettings().currency || 'NIO';

    return `${currency} ${Number(value ?? 0).toLocaleString('es-NI', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  getEstadoBadgeClass(estado: PlanRow['estado'] | null | undefined): string {
    switch (estado) {
      case 'Pagado':
        return 'badge-soft-success';
      case 'Vencido':
        return 'badge-soft-danger';
      default:
        return 'badge-soft-warning';
    }
  }

    formatDate(value?: string | null): string {
    if (!value) return '-';

    const date = this.parseLocalDate(value);
    if (!date) return '-';

    const format = (this.appConfigService.getCurrentSettings().dateFormat || 'dd/MM/yyyy').trim();

    const dd = `${date.getDate()}`.padStart(2, '0');
    const MM = `${date.getMonth() + 1}`.padStart(2, '0');
    const yyyy = `${date.getFullYear()}`;

    return format
      .replace('dd', dd)
      .replace('MM', MM)
      .replace('yyyy', yyyy);
  }

  private parseLocalDate(value: string): Date | null {
    if (!value) return null;

    const raw = String(value).trim();
    const systemFormat = (this.appConfigService.getCurrentSettings().dateFormat || 'dd/MM/yyyy').trim();

    const isoDateTime = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
    if (isoDateTime) {
      const [, yyyy, MM, dd] = isoDateTime;
      return new Date(Number(yyyy), Number(MM) - 1, Number(dd));
    }

    if (systemFormat === 'dd/MM/yyyy') {
      const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (match) {
        const [, dd, MM, yyyy] = match;
        return new Date(Number(yyyy), Number(MM) - 1, Number(dd));
      }
    }

    if (systemFormat === 'MM/dd/yyyy') {
      const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (match) {
        const [, MM, dd, yyyy] = match;
        return new Date(Number(yyyy), Number(MM) - 1, Number(dd));
      }
    }

    if (systemFormat === 'yyyy-MM-dd') {
      const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (match) {
        const [, yyyy, MM, dd] = match;
        return new Date(Number(yyyy), Number(MM) - 1, Number(dd));
      }
    }

    const es = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (es) {
      const [, dd, MM, yyyy] = es;
      return new Date(Number(yyyy), Number(MM) - 1, Number(dd));
    }

    const us = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (us) {
      const [, MM, dd, yyyy] = us;
      return new Date(Number(yyyy), Number(MM) - 1, Number(dd));
    }

    return null;
  }

}