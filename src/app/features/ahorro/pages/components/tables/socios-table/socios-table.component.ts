import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AppConfigService } from '../../../../../../core/services/app-config.service';
import { PaginationMeta, SocioRow } from '../../../../interface/ahorro.models';
import { PermissionService } from '../../../../../../core/services/permission.service';
import { Router } from '@angular/router';
import { NotificationService } from '../../../../../../core/services/notification.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-socios-table',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './socios-table.component.html',
  styleUrl: './socios-table.component.scss'
})
export class SociosTableComponent {
  private readonly appConfigService = inject(AppConfigService);
  public readonly permissionService = inject(PermissionService);
  private readonly router = inject(Router);
   private readonly translate = inject(TranslateService);
   private readonly notify = inject(NotificationService);


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

  if (row.alerts?.count > 0) {
  
        console.log(row.alerts);
  
        const type =
          row.alerts.highestSeverity === 'danger'
            ? 'error'
            : row.alerts.highestSeverity === 'warning'
              ? 'warning'
              : 'info';
  
        const observables = row.alerts.items.map(alert =>
          this.translate.get(alert.messageKey, alert.params ?? {})
        );
  
        this.translate.get('alerts.common.title').subscribe(title => {
  
          if (observables.length === 0) {
            this.notify.show('', title, type);
            return;
          }
  
          // combinar todas las traducciones
          forkJoin(observables).subscribe(messages => {
            const message = messages.join('\n');
            this.notify.show(message, title, type);
          });
  
        });
      }
  

  this.selectRow.emit(row);
}


  onEdit(id: string): void {
    if (this.permissionService.has('edit', '/socios')) {
      this.router.navigate(['/socios', id, 'edit']);
      return;
    }

    if (this.permissionService.has('view', '/socios')) {
      this.router.navigate(['/socios', id]);
    }
  }

  
    isDarkTheme(): boolean {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }
  getAvatarStyle(): Record<string, string> {
    if (this.isDarkTheme()) {
      return {};
    }

    return {
      background: '#1e3a8a',
      color: '#ffffff',
      border: '1px solid #1d4ed8'
    };
  }

}