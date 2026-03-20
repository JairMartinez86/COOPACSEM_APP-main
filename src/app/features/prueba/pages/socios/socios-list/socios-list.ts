import { CommonModule } from '@angular/common';
import {
  Component,
  OnDestroy,
  OnInit,
  inject
} from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { SociosService } from '../../../services/socios.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { Breadcrumb } from '../../../../../shared/components/breadcrumb/breadcrumb';
import { TableFilterService } from '../../../../../core/services/table-filter.service';
import { AppPermissionDirective } from '../../../../../core/services/app-permission.directive';

interface SocioRow {
  id: string;
  nombreCompleto: string;
  nombrePublico: string;
  numeroIdentificacion: string;
  correo: string;
  telefono: string;
  celular: string;
  activo: boolean;
  createdAtUtc?: string | null;
  updatedAtUtc?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
}

interface SocioActivityRow {
  id: string;
  nombreCompleto: string;
  tipo: 'new' | 'updated';
  fecha: string | null;
  usuario?: string | null;
}

@Component({
  selector: 'app-socios-list',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    Breadcrumb,
    AppPermissionDirective
  ],
  templateUrl: './socios-list.html',
  styleUrl: './socios-list.scss'
})
export class SociosListComponent implements OnInit, OnDestroy {
  private readonly sociosService = inject(SociosService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly filterSvc = inject(TableFilterService);
  private readonly translate = inject(TranslateService);

  private readonly subs = new Subscription();
  private readonly filterKey = 'socios';

  sociosAll: SocioRow[] = [];
  socios: SocioRow[] = [];
  loading = false;
  currentTerm = '';

  breadcrumbs = [
    { label: '', url: '' },
    { label: '', url: '/' },
    { label: '' }
  ];

  ngOnInit(): void {
    this.subs.add(
      this.filterSvc.query$(this.filterKey).subscribe(query => {
        this.currentTerm = (query || '').trim().toLowerCase();
        this.applyFilter();
      })
    );


    this.subs.add(
      this.translate.onLangChange.subscribe(() => {
        this.breadcrumbs = this.translate.instant('socios.breadcrumbs.list') || [];


      })
    );

    this.breadcrumbs = this.translate.instant('socios.breadcrumbs.list') || [];


    this.loadData();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  loadData(): void {


    this.loading = true;

    this.sociosService.getAll()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res: any) => {
          this.sociosAll = res?.data?.socios ?? [];
          this.applyFilter();
        },
        error: (err: any) => {
          this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
        }
      });
  }

  private applyFilter(): void {
    const term = this.currentTerm;

    this.socios = !term
      ? [...this.sociosAll]
      : this.sociosAll.filter((socio) =>
        [
          socio.nombreCompleto ?? '',
          socio.nombrePublico ?? '',
          socio.numeroIdentificacion ?? '',
          socio.correo ?? '',
          socio.telefono ?? '',
          socio.celular ?? '',
          socio.activo ? 'activo' : 'inactivo'
        ]
          .join(' ')
          .toLowerCase()
          .includes(term)
      );
  }

  onCreate(): void {
    this.router.navigate(['/socios/new']);
  }

  onView(id: string): void {
    this.router.navigate(['/socios', id]);
  }

  onEdit(id: string): void {
    this.router.navigate(['/socios', id, 'edit']);
  }

  onDelete(item: SocioRow): void {
    const message = this.translate.instant('socios.delete.message', {
      nombre: item.nombreCompleto || '',
      identificacion: item.numeroIdentificacion || ''
    });

    const warning = this.translate.instant('socios.delete.warning');
    const title = this.translate.instant('socios.delete.title');

    const ref = this.notify.confirm?.(
      `${message}\n\n${warning}`,
      title,
      'warning'
    );

    if (!ref) return;

    const deleteSub = ref.subscribe((result: number) => {
      if (result !== 1) return;

      this.sociosService.delete(item.id).subscribe({
        next: (res: any) => {
          this.notify.showFromApiResponse?.(res, 'success');
          this.loadData();
        },
        error: (err: any) => {
          this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
        }
      });
    });

    this.subs.add(deleteSub);
  }

  getInitials(value: string): string {
    if (!value) return 'SO';

    const parts = value.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }

    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }

  get totalSocios(): number {
    return this.sociosAll.length;
  }

  get activeCount(): number {
    return this.sociosAll.filter(x => x.activo).length;
  }

  get inactiveCount(): number {
    return this.sociosAll.filter(x => !x.activo).length;
  }

  get activePercent(): number {
    if (!this.totalSocios) return 0;
    return Math.round((this.activeCount / this.totalSocios) * 100);
  }

  get inactivePercent(): number {
    if (!this.totalSocios) return 0;
    return Math.round((this.inactiveCount / this.totalSocios) * 100);
  }

  get latestActivity(): SocioActivityRow[] {
    const added: SocioActivityRow[] = this.sociosAll
      .filter(x => !!x.createdAtUtc)
      .map(x => ({
        id: x.id,
        nombreCompleto: x.nombreCompleto,
        tipo: 'new' as const,
        fecha: x.createdAtUtc ?? null,
        usuario: x.createdBy ?? null
      }));

    const updated: SocioActivityRow[] = this.sociosAll
      .filter(x => !!x.updatedAtUtc)
      .map(x => ({
        id: x.id,
        nombreCompleto: x.nombreCompleto,
        tipo: 'updated' as const,
        fecha: x.updatedAtUtc ?? null,
        usuario: x.updatedBy ?? null
      }));

    return [...added, ...updated]
      .sort((a, b) => new Date(b.fecha || 0).getTime() - new Date(a.fecha || 0).getTime())
      .slice(0, 6);
  }

  formatActivityLabel(value?: string | null): string {
    if (!value) {
      return this.translate.instant('common.noDate');
    }

    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return this.translate.instant('common.noDate');
    }

    return date.toLocaleDateString('es-NI', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    });
  }

  trackBySocioId(_: number, item: SocioRow): string {
    return item.id;
  }

  trackByActivityId(_: number, item: SocioActivityRow): string {
    return `${item.tipo}-${item.id}-${item.fecha ?? ''}`;
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

  onToggleStatus(item: SocioRow): void {
    const nextStatus = !item.activo;

    const message = this.translate.instant(
      nextStatus
        ? 'socios.statusActions.activateMessage'
        : 'socios.statusActions.deactivateMessage',
      {
        nombre: item.nombreCompleto || '',
        identificacion: item.numeroIdentificacion || ''
      }
    );

    const warning = this.translate.instant(
      nextStatus
        ? 'socios.statusActions.activateWarning'
        : 'socios.statusActions.deactivateWarning'
    );

    const title = this.translate.instant(
      nextStatus
        ? 'socios.statusActions.activateTitle'
        : 'socios.statusActions.deactivateTitle'
    );

    const ref = this.notify.confirm?.(
      `${message}\n\n${warning}`,
      title,
      'warning'
    );

    if (!ref) return;

    const sub = ref.subscribe((result: number) => {
      if (result !== 1) return;

      this.sociosService.changeStatus(item.id, nextStatus).subscribe({
        next: (res: any) => {
          this.notify.showFromApiResponse?.(res, 'warning');
          this.loadData();
        },
        error: (err: any) => {
          this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
        }
      });
    });

    this.subs.add(sub);
  }
}