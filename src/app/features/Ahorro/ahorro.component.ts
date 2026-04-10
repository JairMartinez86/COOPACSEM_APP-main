import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AhorroFiltersComponent } from './components/ahorro-filters/ahorro-filters.component';
import { AhorroSidePanelComponent } from './components/ahorro-side-panel/ahorro-side-panel.component';
import { AhorroSocioResumenComponent } from './components/ahorro-socio-resumen/ahorro-socio-resumen.component';
import { AhorroSummaryCardsComponent } from './components/ahorro-summary-cards/ahorro-summary-cards.component';
import { AhorrosTableComponent } from './components/tables/ahorros-table/ahorros-table.component';
import { CuentasTableComponent } from './components/tables/cuentas-table/cuentas-table.component';
import { DepositosTableComponent } from './components/tables/depositos-table/depositos-table.component';
import { RetirosTableComponent } from './components/tables/retiros-table/retiros-table.component';
import { SociosTableComponent } from './components/tables/socios-table/socios-table.component';
import { ActionItem, AlertItem, AhorroTab, ReportItem, SimpleMovimientoRow, SocioDetalleTab, SocioRow, SummaryCard, Planes } from './ahorro.models';
import { Breadcrumb } from '../../shared/components/breadcrumb/breadcrumb';

@Component({
  selector: 'app-ahorro',
  standalone: true,
  imports: [
    CommonModule,
    AhorroSummaryCardsComponent,
    AhorroFiltersComponent,
    SociosTableComponent,
    AhorrosTableComponent,
    RetirosTableComponent,
    DepositosTableComponent,
    CuentasTableComponent,
    AhorroSidePanelComponent,
    AhorroSocioResumenComponent,
    Breadcrumb
  ],
  templateUrl: './ahorro.component.html',
  styleUrl: './ahorro.component.scss',
})
export class AhorroComponent {
  activeTab: AhorroTab = 'socios';
  detailTab: SocioDetalleTab = 'ahorros';

  breadcrumbs = [
    { label: '', url: '' },
    { label: '', url: '/' },
    { label: '' }
  ];

  cards: SummaryCard[] = [
    { icon: 'fa-regular fa-hand-holding-heart', title: 'Total ahorrado', amount: 'NIO 1,200.00', subtitle: 'Saldo acumulado de todos los socios', accent: 'teal' },
    { icon: 'fa-solid fa-arrow-up-from-bracket', title: 'Total retirado', amount: 'NIO 400.00', subtitle: 'Retiro acumulado', accent: 'blue' },
    { icon: 'fa-solid fa-arrow-down', title: 'Total depósitos', amount: 'NIO 1,600.00', subtitle: 'Depósitos acumulados', accent: 'blue' },
    { icon: 'fa-regular fa-clipboard', title: 'Solicitudes pendientes', amount: '2', subtitle: 'Requieren revisión', accent: 'orange' },
  ];

  actions: ActionItem[] = [
    { icon: 'fa-regular fa-hand-holding-heart', title: 'Nuevo ahorro', accent: 'green' },
    { icon: 'fa-solid fa-arrow-down', title: 'Nuevo depósito', accent: 'blue' },
    { icon: 'fa-solid fa-arrow-up', title: 'Nuevo retiro', accent: 'violet' },
    { icon: 'fa-solid fa-print', title: 'Imprimir reporte', accent: 'cyan' },
    { icon: 'fa-regular fa-gift', title: 'Ver plan navideño', accent: 'amber' },
    { icon: 'fa-regular fa-file-excel', title: 'Exportar Excel', accent: 'emerald' },
  ];

  alerts: AlertItem[] = [
    {
      color: 'warning',
      title: 'Límite de retiros',
      description: 'El socio ha realizado 0 retiros este mes.',
      code: 'SOC-0003',
      date: '10 abr 2026 - 09:15 a. m.',
    },
    {
      color: 'info',
      title: 'Plan navideño',
      description: 'Aún no tiene activado un plan navideño.',
      code: 'SOC-0001',
      date: '10 abr 2026 - 09:00 a. m.',
    },
  ];

  reports: ReportItem[] = [
    { title: 'Movimientos por socio', subtitle: 'Detalle de ahorros, retiros y depósitos' },
    { title: 'Resumen de ahorro', subtitle: 'Totales por tipo de cuenta' },
    { title: 'Solicitudes pendientes', subtitle: 'Listado de solicitudes por revisar' },
  ];

  socioRows: SocioRow[] = [
    {
      id: '1',
      codigo: 'SOC-0004',
      nombre: 'Juan Carlos Pérez López',
      documento: '4410309860004W',
      tipoCuenta: 'Corriente',
      ahorrado: 'NIO 1,200.00',
      retirado: 'NIO 300.00',
      depositos: 'NIO 1,500.00',
      ultimoMovimiento: '10 abr 2026',
      movimientoTipo: 'Ahorro',
    },
    {
      id: '2',
      codigo: 'SOC-0003',
      nombre: 'Ricardo de Jesús Aguirre Gómez',
      documento: '4410309860003W',
      tipoCuenta: 'Corriente',
      ahorrado: 'NIO 0.00',
      retirado: 'NIO 0.00',
      depositos: 'NIO 0.00',
      ultimoMovimiento: '06 abr 2026',
      movimientoTipo: 'Ahorro',
    },
    {
      id: '3',
      codigo: 'SOC-0001',
      nombre: 'Tania Judith Gómez Balmaceda',
      documento: '4410309860001W',
      tipoCuenta: 'Navideña',
      ahorrado: 'NIO 0.00',
      retirado: 'NIO 0.00',
      depositos: 'NIO 0.00',
      ultimoMovimiento: '23 mar 2026',
      movimientoTipo: 'Ahorro',
    },
  ];

  movimientoRows: SimpleMovimientoRow[] = [
    { fecha: '10 abr 2026', descripcion: 'Ahorro ExtOrd', tipoCuenta: 'Corriente', monto: 0, saldo: 'NIO 1,200.00' },
    { fecha: '10 abr 2026', descripcion: 'Pago Afiliacion', tipoCuenta: 'Corriente', monto: 0, saldo: 'NIO 1,032.49' },
    { fecha: '10 abr 2026', descripcion: 'Afiliacion', tipoCuenta: 'Corriente', monto: 0, saldo: 'NIO 1,032.49' },
  ];

  retiroRows: SimpleMovimientoRow[] = [
    { fecha: '08 abr 2026', descripcion: 'Retiro parcial', tipoCuenta: 'Corriente', monto: 0 },
  ];

  depositoRows: SimpleMovimientoRow[] = [
    { fecha: '09 abr 2026', descripcion: 'Depósito ventanilla', tipoCuenta: 'Corriente', monto: 0 },
  ];

  cuentaRows = [
    { codigo: 'CTA-001', nombre: 'Juan Carlos Pérez López', tipoCuenta: 'Corriente', estado: 'Activa', saldo: 'NIO 1,200.00' },
    { codigo: 'CTA-002', nombre: 'Ricardo de Jesús Aguirre Gómez', tipoCuenta: 'Corriente', estado: 'Activa', saldo: 'NIO 0.00' },
    { codigo: 'CTA-003', nombre: 'Tania Judith Gómez Balmaceda', tipoCuenta: 'Navideña', estado: 'Activa', saldo: 'NIO 0.00' },
  ];


  planesRows: Planes[] = [

  // 🔵 CORRIENTE
  {
    numero: 1,
    fecha: '15/04/2026',
    cuota: 300,
    estado: 'Pendiente',
    tipoCuenta: 'Corriente',
    socioId: '1',
    codigoSocio: 'SOC-001'
  },
  {
    numero: 2,
    fecha: '30/04/2026',
    cuota: 300,
    estado: 'Pendiente',
    tipoCuenta: 'Corriente',
    socioId: '1',
    codigoSocio: 'SOC-001'
  },
  {
    numero: 3,
    fecha: '15/05/2026',
    cuota: 300,
    estado: 'Pendiente',
    tipoCuenta: 'Corriente',
    socioId: '1',
    codigoSocio: 'SOC-001'
  },
  {
    numero: 4,
    fecha: '31/05/2026',
    cuota: 300,
    estado: 'Pendiente',
    tipoCuenta: 'Corriente',
    socioId: '1',
    codigoSocio: 'SOC-001'
  },

  

];

  selectedSocio = this.socioRows[0];
}
