import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnDestroy, OnInit } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  ActionItem,
  AlertItem,
  PlanRow,
  ReportItem,
  SocioDetail
} from '../../../interface/ahorro.models';
import { Router } from '@angular/router';
import { AppConfigService } from '../../../../../core/services/app-config.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { AppPermissionDirective } from '../../../../../core/services/app-permission.directive';

import {
  ApexChart,
  ApexDataLabels,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexResponsive,
  ApexTooltip,
  ChartComponent
} from 'ng-apexcharts';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-ahorro-side-panel',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    AppPermissionDirective,
    ChartComponent
  ],
  templateUrl: './ahorro-side-panel.component.html',
  styleUrl: './ahorro-side-panel.component.scss',
})
export class AhorroSidePanelComponent implements OnInit, OnDestroy {
  @Input() actions: ActionItem[] = [];
  @Input() alerts: AlertItem[] = [];
  @Input() reports: ReportItem[] = [];
  @Input() planesRows: PlanRow[] = [];
  @Input() selectedSocio: SocioDetail | null = null;

  private langChangeSub?: Subscription;

  get navidenaRows(): PlanRow[] {
    return (this.planesRows || []).filter(x => x.tipoCuenta === 'Navidena');
  }

  private readonly router = inject(Router);
  private readonly appConfigService = inject(AppConfigService);
  private readonly notify = inject(NotificationService);
  private readonly translate = inject(TranslateService);

  public pieLabels: string[] = [];

  ngOnInit(): void {
    this.setLabels();

    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.setLabels();
    });
  }

  ngOnDestroy(): void {
    this.langChangeSub?.unsubscribe();
  }

  private setLabels(): void {
    this.pieLabels = [
      this.translate.instant('ahorro.chart.labels.saved'),
      this.translate.instant('ahorro.chart.labels.withdrawn'),
      this.translate.instant('ahorro.chart.labels.interests')
    ];
  }

  public pieChart: ApexChart = {
    type: 'pie',
    height: 280,
    background: 'transparent'
  };

  public pieColors: string[] = [
    '#10b981',
    '#f59e0b',
    '#3b82f6'
  ];

  public pieLegend: ApexLegend = {
    position: 'bottom'
  };

  public pieDataLabels: ApexDataLabels = {
    enabled: true,
    formatter: (_val: number, opts?: any) => {
      const value = opts?.w?.config?.series?.[opts.seriesIndex] ?? 0;
      return this.formatCurrency(value);
    }
  };

  public pieTooltip: ApexTooltip = {
    y: {
      formatter: (value: number) => this.formatCurrency(value)
    }
  };

  public pieResponsive: ApexResponsive[] = [
    {
      breakpoint: 576,
      options: {
        chart: { height: 240 },
        legend: { position: 'bottom' }
      }
    }
  ];

  get chartSeries(): ApexNonAxisChartSeries {
    return [
      Number(this.selectedSocio?.totalAhorro ?? 0),
      Number(this.selectedSocio?.totalRetirado ?? 0),
      Number((this.selectedSocio as any)?.totalIntereses ?? 0)
    ];
  }

  formatCurrency(v: number | null | undefined): string {
    const c = this.appConfigService.getCurrentSettings().currency || 'NIO';
    return `${c} ${Number(v ?? 0).toLocaleString('es-NI', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
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
        this.router.navigate(['/cambio-cuota/new', this.selectedSocio.id, 'incremento']);
        break;

      case 'ahorro.actions.decreaseInstallment':
        this.router.navigate(['/cambio-cuota/new', this.selectedSocio.id, 'disminucion']);
        break;
    }
  }

  get orderedActions() {
    return [...this.actions].sort((a, b) => a.order - b.order);
  }


}