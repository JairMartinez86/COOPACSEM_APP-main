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
import { ActionItem } from '../../../ahorro/interface/ahorro.models';
import { FormsModule } from '@angular/forms';

interface SocioMovimientoRow {
  fecha?: string | null;
  descripcion?: string | null;
}

interface SocioDashboardRow {
  totalAhorro: number;
  creditoPendiente: number;
  proximoRetiro: number;
  aprobacionesPendientes: number;

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
  ultimosMovimientos: SocioMovimientoRow[];
}

@Component({
  selector: 'app-socios-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
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


  actions: ActionItem[] = [
    { icon: 'fa-regular fa-hand-holding-heart', titleKey: 'ahorro.actions.newSaving', accent: 'green', order: 1 },
    { icon: 'fa-duotone fa-light fa-file-invoice-dollar', titleKey: 'ahorro.actions.affiliation', accent: 'amber', order: 2 },
    { icon: 'fa-solid fa-arrow-down', titleKey: 'ahorro.actions.newDeposit', accent: 'blue', order: 3 },
    { icon: 'fa-solid fa-arrow-up', titleKey: 'ahorro.actions.newWithdrawal', accent: 'violet', order: 4 },
    { icon: 'fa-solid fa-arrow-trend-up', titleKey: 'ahorro.actions.increaseInstallment', accent: 'teal', order: 5 },
    { icon: 'fa-solid fa-arrow-trend-down', titleKey: 'ahorro.actions.decreaseInstallment', accent: 'orange', order: 6 },
   
  ];



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

  onView(id: string): void {
    if (this.permissionService.has('view', '/socios')) {
      this.router.navigate(['/socios', id, 'ficha']);
      return;
    }

    this.notify.show?.('No tiene permisos para ver la ficha del socio.', '', 'warning');
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
  changePageSize(value: number | string): void {
        const size = Number(value);

        if (!size || size === this.pageSize) {
            return;
        }

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

      ultimosMovimientos: Array.isArray(item?.ultimosMovimientos)
        ? item.ultimosMovimientos.map((mov: any) => ({
          fecha: mov?.fecha ?? null,
          descripcion: mov?.descripcion ?? null
        }))
        : [],

      dashboard: {
        totalAhorro: Number(item?.dashboard?.totalAhorro ?? 0),
        creditoPendiente: Number(item?.dashboard?.creditoPendiente ?? 0),
        proximoRetiro: Number(item?.dashboard?.proximoRetiro ?? 0),
        aprobacionesPendientes: Number(item?.dashboard?.aprobacionesPendientes ?? 0)
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




  onActionClick(action: ActionItem): void {
    if (this.selectedSocio == null) {
      this.notify.show(
        this.translate.instant('ahorro.messages.selectRequired'),
        this.translate.instant('ahorro.common.info'),
        'warning'
      );
      return;
    }

    if (!this.selectedSocio.activo) {
      this.notify.show(
        this.translate.instant('ahorro.messages.inactive'),
        this.translate.instant('ahorro.common.info'),
        'warning'
      );
      return;
    }

    if (!this.selectedSocio.cuentaCorrienteActiva) {
      this.notify.show(
        this.translate.instant('socios.messages.noActiveCurrentAccount'),
        this.translate.instant('socios.common.info'),
        'warning'
      );
      return;
    }

    switch (action.titleKey) {
      case 'ahorro.actions.newDeposit':
        this.router.navigate(['/socio-ahorro/new', this.selectedSocio.id]);
        break;

      case 'ahorro.actions.newWithdrawal':
        this.router.navigate(['/socio-retiro/new', this.selectedSocio.id]);
        break;

      case 'ahorro.actions.newSaving':
        this.router.navigate(['/apertura-cuenta-navidena', this.selectedSocio.id]);
        break;

      case 'ahorro.actions.affiliation':
        this.router.navigate(['/socio-afiliacion-pago/new', this.selectedSocio.id]);
        break;

      case 'ahorro.actions.increaseInstallment':
        this.router.navigate(['/cambio-cuota/new', this.selectedSocio.id, 'Incremento']);
        break;

      case 'ahorro.actions.decreaseInstallment':
        this.router.navigate(['/cambio-cuota/new', this.selectedSocio.id, 'Disminucion']);
        break;
    }
  }



  get orderedActions() {
    return [...this.actions].sort((a, b) => a.order - b.order);
  }

  formatDateTimeAmPm(value?: string | null): string {
    if (!value) {
      return this.translate.instant('common.noDate');
    }

    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return this.translate.instant('common.noDate');
    }

    return date.toLocaleString('es-NI', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

}