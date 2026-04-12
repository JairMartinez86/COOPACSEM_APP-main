import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { AppConfigService } from '../../../../../core/services/app-config.service';

import { AhorrosTableComponent } from '../tables/ahorros-table/ahorros-table.component';
import { RetirosTableComponent } from '../tables/retiros-table/retiros-table.component';
import { DepositosTableComponent } from '../tables/depositos-table/depositos-table.component';
import { SolicitudesTableComponent } from '../tables/solicitudes-table/solicitudes-table.component';
import { PlanesTableComponent } from '../tables/planes-table/planes-table.component';

import {
  ApexChart,
  ApexDataLabels,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexResponsive,
  ApexTooltip,
  ChartComponent
} from 'ng-apexcharts';

import { PlanRow, SimpleMovimientoRow, SocioDetail, SocioDetalleTab } from '../../../interface/ahorro.models';

@Component({
  selector: 'app-ahorro-socio-resumen',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    ChartComponent,
    AhorrosTableComponent,
    RetirosTableComponent,
    DepositosTableComponent,
    SolicitudesTableComponent,
    PlanesTableComponent
  ],
  templateUrl: './ahorro-socio-resumen.component.html',
  styleUrl: './ahorro-socio-resumen.component.scss',
})
export class AhorroSocioResumenComponent implements OnChanges {
  private readonly appConfigService = inject(AppConfigService);

  @Input() socio: SocioDetail | null = null;
  @Input() ahorrosRows: SimpleMovimientoRow[] = [];
  @Input() retirosRows: SimpleMovimientoRow[] = [];
  @Input() depositosRows: SimpleMovimientoRow[] = [];
  @Input() solicitudesRows: SimpleMovimientoRow[] = [];
  @Input() planesRows: PlanRow[] = [];

  detailTab: SocioDetalleTab = 'ahorros';

  public pieSeries: ApexNonAxisChartSeries = [0, 0];


  public pieLabels: string[] = ['Ahorro', 'Retirado'];

  public pieChart: ApexChart = {
  type: 'pie',
  height: 320
};

public pieColors: string[] = [
  '#10b981', // ahorro (verde)
  '#f59e0b'  // retirado (orange)
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
      breakpoint: 1200,
      options: {
        chart: { height: 280 },
        legend: { position: 'bottom' }
      }
    },
    {
      breakpoint: 576,
      options: {
        chart: { height: 250 },
        legend: { position: 'bottom' }
      }
    }
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['socio']) {
      this.detailTab = 'ahorros';
      this.rebuildChart();
    }
  }

  setDetailTab(tab: SocioDetalleTab): void {
    this.detailTab = tab;
  }

  get initials(): string {
    const name = this.socio?.nombre?.trim() || '';
    if (!name) return 'NA';

    return name
      .split(/\s+/)
      .slice(0, 2)
      .map(x => x[0]?.toUpperCase() || '')
      .join('');
  }

  formatCurrency(value: number | null | undefined): string {
    const currency = this.appConfigService.getCurrentSettings().currency || 'NIO';
    return `${currency} ${Number(value ?? 0).toLocaleString('es-NI', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  private rebuildChart(): void {
    this.pieSeries = [
      Number(this.socio?.totalAhorro ?? 0),
      Number(this.socio?.totalRetirado ?? 0)
    ];
  }
}