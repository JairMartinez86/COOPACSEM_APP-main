import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { ProveedoresService } from '../../services/proveedores.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Breadcrumb } from '../../../../shared/components/breadcrumb/breadcrumb';
import { TableFilterService } from '../../../../core/services/table-filter.service';
import { AppPermissionDirective } from '../../../../core/services/app-permission.directive';
import { PermissionService } from '../../../../core/services/permission.service';

interface ProveedorRow {
  id: string;
  codigo: string;
  nombre: string;
  tratamiento: string;
  sector: string;
  numeroIdentificacion: string;
  correo: string;
  telefono: string;
  empresa?: string | null;
  activo: boolean;
  createdAtUtc?: string | null;
  updatedAtUtc?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
}

interface ProveedorActivityRow {
  id: string;
  nombre: string;
  tipo: 'new' | 'updated';
  fecha: string | null;
  usuario?: string | null;
}

@Component({
  selector: 'app-proveedores-list',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    Breadcrumb,
    AppPermissionDirective
  ],
  templateUrl: './proveedores-list.html',
  styleUrl: './proveedores-list.scss'
})
export class ProveedoresListComponent implements OnInit, OnDestroy {
  private readonly proveedoresService = inject(ProveedoresService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly filterSvc = inject(TableFilterService);
  private readonly translate = inject(TranslateService);
  public readonly permissionService = inject(PermissionService)

  private readonly subs = new Subscription();
  private readonly filterKey = 'proveedores';

  proveedoresAll: ProveedorRow[] = [];
  proveedores: ProveedorRow[] = [];
  loading = false;
  currentTerm = '';

  breadcrumbs = [
    { label: '', url: '' },
    { label: '', url: '/' },
    { label: '' }
  ];

  ngOnInit(): void {
    this.breadcrumbs = this.translate.instant('proveedores.breadcrumbs.list') || [];

    this.subs.add(
      this.filterSvc.query$(this.filterKey).subscribe(query => {
        this.currentTerm = (query || '').trim().toLowerCase();
        this.applyFilter();
      })
    );

    this.subs.add(
      this.translate.onLangChange.subscribe(() => {
        this.breadcrumbs = this.translate.instant('proveedores.breadcrumbs.list') || [];
      })
    );

    this.loadData();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  loadData(): void {
    this.loading = true;

    this.proveedoresService.getAll()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res: any) => {
          this.proveedoresAll = res?.data?.proveedores ?? [];
          this.applyFilter();
        },
        error: (err: any) => {
          this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
        }
      });
  }

  private applyFilter(): void {
    const term = this.currentTerm;

    this.proveedores = !term
      ? [...this.proveedoresAll]
      : this.proveedoresAll.filter((item) =>
        [
          item.codigo ?? '',
          item.nombre ?? '',
          item.tratamiento ?? '',
          item.sector ?? '',
          item.numeroIdentificacion ?? '',
          item.correo ?? '',
          item.telefono ?? '',
          item.empresa ?? '',
          item.activo ? 'activo' : 'inactivo'
        ]
          .join(' ')
          .toLowerCase()
          .includes(term)
      );
  }

  onCreate(): void {
    this.router.navigate(['/proveedores/new']);
  }


  onEdit(id: string): void {
    if (this.permissionService.has('edit', '/proveedores')) {
      this.router.navigate(['/proveedores', id, 'edit']);
      return;
    }

    if (this.permissionService.has('view', '/proveedores')) {
      this.router.navigate(['/proveedores', id]);
    }
  }

  onDelete(item: ProveedorRow): void {
        const message = this.translate.instant('proveedores.delete.message', {
      nombre: item.nombre || '',
      identificacion: item.numeroIdentificacion || ''
    });

    const warning = this.translate.instant('proveedores.delete.warning');
    const title = this.translate.instant('proveedores.delete.title');

    const ref = this.notify.confirm?.(
      `${message}\n\n${warning}`,
      title,
      'warning'
    );

    if (!ref) return;

    const deleteSub = ref.subscribe((result: number) => {
      if (result !== 1) return;

      this.proveedoresService.delete(item.id).subscribe({
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

  onToggleStatus(item: ProveedorRow): void {
    const title = item.activo
      ? this.translate.instant('proveedores.status.deactivateTitle')
      : this.translate.instant('proveedores.status.activateTitle');

    const message = item.activo
      ? this.translate.instant('proveedores.status.deactivateMessage', { nombre: item.nombre })
      : this.translate.instant('proveedores.status.activateMessage', { nombre: item.nombre });

    const ref = this.notify.confirm?.(message, title, 'warning');
    if (!ref) return;

    const sub = ref.subscribe((result: number) => {
      if (result !== 1) return;

      this.proveedoresService.changeStatus(item.id, !item.activo).subscribe({
        next: (res: any) => {
          this.notify.showFromApiResponse?.(res, 'success');
          this.loadData();
        },
        error: (err: any) => {
          this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
        }
      });
    });

    this.subs.add(sub);
  }

  getInitials(value: string): string {
    if (!value) return 'PR';

    const parts = value.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }

    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }

  get total(): number {
    return this.proveedoresAll.length;
  }

  get activeCount(): number {
    return this.proveedoresAll.filter(x => x.activo).length;
  }

  get inactiveCount(): number {
    return this.proveedoresAll.filter(x => !x.activo).length;
  }

  get activePercent(): number {
    if (!this.total) return 0;
    return Math.round((this.activeCount / this.total) * 100);
  }

  get inactivePercent(): number {
    if (!this.total) return 0;
    return Math.round((this.inactiveCount / this.total) * 100);
  }

  get latestActivity(): ProveedorActivityRow[] {
    const added: ProveedorActivityRow[] = this.proveedoresAll
      .filter(x => !!x.createdAtUtc)
      .map(x => ({
        id: x.id,
        nombre: x.nombre,
        tipo: 'new' as const,
        fecha: x.createdAtUtc ?? null,
        usuario: x.createdBy ?? null
      }));

    const updated: ProveedorActivityRow[] = this.proveedoresAll
      .filter(x => !!x.updatedAtUtc)
      .map(x => ({
        id: x.id,
        nombre: x.nombre,
        tipo: 'updated' as const,
        fecha: x.updatedAtUtc ?? null,
        usuario: x.updatedBy ?? null
      }));

    return [...added, ...updated]
      .sort((a, b) => new Date(b.fecha || 0).getTime() - new Date(a.fecha || 0).getTime())
      .slice(0, 6);
  }

  formatActivityLabel(value?: string | null): string {
    if (!value) return this.translate.instant('common.noDate');

    const date = new Date(value);
    if (isNaN(date.getTime())) return this.translate.instant('common.noDate');

    return date.toLocaleDateString('es-NI', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    });
  }
}