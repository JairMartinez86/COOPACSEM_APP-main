import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject
} from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { forkJoin, Subscription } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AppPermissionDirective } from '../../../../core/services/app-permission.directive';
import { Breadcrumb } from '../../../../shared/components/breadcrumb/breadcrumb';
import { SociosService } from '../../services/socios.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { TableFilterService } from '../../../../core/services/table-filter.service';
import { PermissionService } from '../../../../core/services/permission.service';
import { AppConfigService } from '../../../../core/services/app-config.service';
import { SocioAlerts } from '../../../../shared/interfaces/alert.model';

interface SocioMovimientoRow {
  fecha?: string | null;
  descripcion?: string | null;
  debito?: number | null;
  credito?: number | null;
  saldo?: number | null;
  tipoCuenta: string | null;
}

interface SocioDashboardRow {
  totalAhorro: number;
  creditoPendiente: number;
  proximoRetiro: number;
  aprobacionesPendientes: number;
  ultimosMovimientos: SocioMovimientoRow[];
}

interface SocioRow {
  id: string;
  codigoSocio: string;
  nombreCompleto: string;
  nombrePublico: string;
  numeroIdentificacion: string;
  correo: string;
  telefono: string;
  celular: string;
  direccionDomiciliar?: string | null;
  fechaIngreso?: string | null;
  cuentaCorrienteActiva: boolean;
  cuentaNavidenaActiva: boolean;
  activo: boolean;
  createdAtUtc?: string | null;
  updatedAtUtc?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  dashboard?: SocioDashboardRow | null;
  alerts: SocioAlerts;
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
  @ViewChild('excelFileInput') excelFileInputRef?: ElementRef<HTMLInputElement>;

  private readonly sociosService = inject(SociosService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly filterSvc = inject(TableFilterService);
  private readonly translate = inject(TranslateService);
  public readonly permissionService = inject(PermissionService);
  public appConfigService = inject(AppConfigService);

  private readonly subs = new Subscription();
  private readonly filterKey = 'socios';

  public importingExcel = false;
  socios: SocioRow[] = [];
  loading = false;
  currentTerm = '';
  selectedSocio: SocioRow | null = null;
  totalRecords = 0;

  globalDashboard: any = {
    totalAhorro: 0,
    creditoPendiente: 0,
    proximoRetiro: 0,
    aprobacionesPendientes: 0
  };

  currentPage = 1;
  pageSize = 20;
  readonly pageSizeOptions = [10, 20, 50, 100];

  breadcrumbs = [
    { label: '', url: '' },
    { label: '', url: '/' },
    { label: '' }
  ];

  ngOnInit(): void {
    this.subs.add(
      this.filterSvc.query$(this.filterKey).subscribe(query => {
        this.currentTerm = (query || '').trim();
        this.currentPage = 1;
        this.loadData();
      })
    );

    this.subs.add(
      this.translate.onLangChange.subscribe(() => {
        this.breadcrumbs = this.translate.instant('socios.breadcrumbs.list') || [];
      })
    );

    this.breadcrumbs = this.translate.instant('socios.breadcrumbs.list') || [];
    this.loadGlobalDashboard();
    this.loadData();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  loadGlobalDashboard(): void {
    this.sociosService.getDashboard().subscribe({
      next: (res: any) => {
        const data = res?.data ?? {};

        this.globalDashboard = {
          totalAhorro: Number(data?.totalAhorro ?? 0),
          creditoPendiente: Number(data?.creditoPendiente ?? 0),
          proximoRetiro: Number(data?.proximoRetiro ?? 0),
          aprobacionesPendientes: Number(data?.aprobacionesPendientes ?? 0)
        };
      },
      error: () => {
        this.globalDashboard = {
          totalAhorro: 0,
          creditoPendiente: 0,
          proximoRetiro: 0,
          aprobacionesPendientes: 0
        };
      }
    });
  }

  loadData(): void {
    this.loading = true;

    this.sociosService.getAll(this.currentPage, this.pageSize, this.currentTerm)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res: any) => {
          const data = res?.data ?? {};
          const raw = Array.isArray(data?.items) ? data.items : [];

          this.socios = raw.map((item: any) => this.normalizeSocio(item));
          this.totalRecords = Number(data?.totalRecords ?? 0);

          if (!this.socios.length) {
            this.selectedSocio = null;
            return;
          }

          if (!this.selectedSocio) {
            this.selectedSocio = this.socios[0] ?? null;
            return;
          }

          const selected = this.socios.find(x => x.id === this.selectedSocio?.id);
          this.selectedSocio = selected ?? this.socios[0] ?? null;
        },
        error: (err: any) => {
          this.notify.showFromApiResponse?.(err?.error ?? err, 'error');
        }
      });
  }

  selectSocio(item: SocioRow): void {
    if (item.alerts?.count > 0) {
      const type =
        item.alerts.highestSeverity === 'danger'
          ? 'error'
          : item.alerts.highestSeverity === 'warning'
            ? 'warning'
            : 'info';

      const observables = item.alerts.items.map(alert =>
        this.translate.get(alert.messageKey, alert.params ?? {})
      );

      this.translate.get('alerts.common.title').subscribe(title => {
        if (observables.length === 0) {
          this.notify.show('', title, type);
          return;
        }

        forkJoin(observables).subscribe(messages => {
          const message = messages.join('\n');
          this.notify.show(message, title, type);
        });
      });
    }

    this.selectedSocio = item;
  }

  onCreate(): void {
    this.router.navigate(['/socios/new']);
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

  getInitials(value: string): string {
    if (!value) return 'SO';

    const parts = value.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }

    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
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

  get totalPages(): number {
    return this.totalRecords > 0
      ? Math.ceil(this.totalRecords / this.pageSize)
      : 0;
  }

  get visibleStart(): number {
    if (!this.totalRecords) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get visibleEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalRecords);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;

    this.currentPage = page;
    this.loadData();
  }

  changePageSize(event: Event): void {
    const size = Number((event.target as HTMLSelectElement).value || 20);
    this.pageSize = size;
    this.currentPage = 1;
    this.loadData();
  }

  formatDate(value?: string | null): string {
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

  formatCurrency(value?: number | null): string {
    const amount = Number(value ?? 0);

    const settings = this.appConfigService.getCurrentSettings();

    const decimalSeparator = settings.decimalSeparator || '.';
    const thousandSeparator = settings.thousandSeparator || ',';

    const fixed = amount.toFixed(2);

    const parts = fixed.split('.');
    let integerPart = parts[0];
    const decimalPart = parts[1];

    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator);

    return `${integerPart}${decimalSeparator}${decimalPart}`;
  }

  private normalizeSocio(item: any): SocioRow {
    return {
      id: item?.id ?? '',
      alerts: item?.alerts ?? {
        count: 0,
        hasAlerts: false,
        isExpired: false,
        highestSeverity: 'info',
        items: []
      },
      codigoSocio: item?.codigoSocio ?? '',
      nombreCompleto: item?.nombreCompleto ?? '',
      nombrePublico: item?.nombrePublico ?? '',
      numeroIdentificacion: item?.numeroIdentificacion ?? '',
      correo: item?.correo ?? '',
      telefono: item?.telefono ?? '',
      celular: item?.celular ?? '',
      direccionDomiciliar: item?.direccionDomiciliar ?? null,
      fechaIngreso: item?.fechaIngreso ?? null,
      cuentaCorrienteActiva: !!item?.cuentaCorrienteActiva,
      cuentaNavidenaActiva: !!item?.cuentaNavidenaActiva,
      activo: !!item?.activo,
      createdAtUtc: item?.createdAtUtc ?? null,
      updatedAtUtc: item?.updatedAtUtc ?? null,
      createdBy: item?.createdBy ?? null,
      updatedBy: item?.updatedBy ?? null,
      dashboard: {
        totalAhorro: Number(item?.dashboard?.totalAhorro ?? 0),
        creditoPendiente: Number(item?.dashboard?.creditoPendiente ?? 0),
        proximoRetiro: Number(item?.dashboard?.proximoRetiro ?? 0),
        aprobacionesPendientes: Number(item?.dashboard?.aprobacionesPendientes ?? 0),
        ultimosMovimientos: Array.isArray(item?.dashboard?.ultimosMovimientos)
          ? item.dashboard.ultimosMovimientos.map((mov: any) => ({
              fecha: mov?.fecha ?? null,
              descripcion: mov?.descripcion ?? null,
              debito: Number(mov?.debito ?? 0),
              credito: Number(mov?.credito ?? 0),
              saldo: Number(mov?.saldo ?? 0),
              tipoCuenta: mov?.tipoCuenta ?? null
            }))
          : []
      }
    };
  }

  get pageNumbers(): (number | string)[] {
    const total = this.totalPages;

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [];

    pages.push(1);

    if (this.currentPage > 3) {
      pages.push('...');
    }

    const start = Math.max(2, this.currentPage - 1);
    const end = Math.min(total - 1, this.currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (this.currentPage < total - 2) {
      pages.push('...');
    }

    pages.push(total);

    return pages;
  }

  onNuevoAhorro(idSocio: string, cuentaCorrienteActiva: boolean): void {
    if (!cuentaCorrienteActiva) {
      this.notify.show(
        this.translate.instant('socios.messages.noActiveCurrentAccount'),
        this.translate.instant('socios.common.info'),
        'warning'
      );
      return;
    }

    this.router.navigate(['/apertura-cuenta-navidena', idSocio]);
  }

  onNuevoCredito(id: string, cuentaCorrienteActiva: boolean): void {
    if (!id) return;
    console.log('Nuevo crédito para socio:', id);
  }

  onIncrementoCuota(idSocio: string, cuentaCorrienteActiva: boolean): void {
    if (!cuentaCorrienteActiva) {
      this.notify.show(
        this.translate.instant('socios.messages.noActiveCurrentAccount'),
        this.translate.instant('socios.common.info'),
        'warning'
      );
      return;
    }

    this.router.navigate(['/cambio-cuota/new', idSocio, 'Incremento']);
  }

  onDiminucionCuota(idSocio: string, cuentaCorrienteActiva: boolean): void {
    if (!cuentaCorrienteActiva) {
      this.notify.show(
        this.translate.instant('socios.messages.noActiveCurrentAccount'),
        this.translate.instant('socios.common.info'),
        'warning'
      );
      return;
    }

    this.router.navigate(['/cambio-cuota/new', idSocio, 'Disminucion']);
  }

  getDestinoLabel(destino?: string | null): string {
    switch ((destino || '').trim()) {
      case 'Ahorro ExtOrd':
        return 'socios.destinos.saving';
      case 'Retiro ExtOrd':
        return 'socios.destinos.withdrawal';
      case 'Afiliacion':
        return 'socios.destinos.membership';
      case 'Pago Afiliacion':
        return 'socios.destinos.membPayment';
      default:
        return destino || '';
    }
  }
}