import { CommonModule } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ActionItem, AlertItem, PlanRow, ReportItem } from '../../../interface/ahorro.models';
import { Router } from '@angular/router';
import { AppConfigService } from '../../../../../core/services/app-config.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { AppPermissionDirective } from '../../../../../core/services/app-permission.directive';

@Component({
  selector: 'app-ahorro-side-panel',
  standalone: true,
  imports: [CommonModule, TranslateModule, AppPermissionDirective],
  templateUrl: './ahorro-side-panel.component.html',
  styleUrl: './ahorro-side-panel.component.scss',
})
export class AhorroSidePanelComponent {
  @Input() actions: ActionItem[] = [];
  @Input() alerts: AlertItem[] = [];
  @Input() reports: ReportItem[] = [];
  @Input() planesRows: PlanRow[] = [];


  get navidenaRows(): PlanRow[] { return (this.planesRows || []).filter(x => x.tipoCuenta === 'Navidena'); }



  showPlanModal = false;

  private readonly router = inject(Router);
  private readonly appConfigService = inject(AppConfigService);
  private readonly notify = inject(NotificationService);

  formatCurrency(v: number | null | undefined): string { const c = this.appConfigService.getCurrentSettings().currency || 'NIO'; return `${c} ${Number(v ?? 0).toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

  onActionClick(action: ActionItem): void {

    if (this.alerts.length === 0) {
      this.notify.show("Seleccione un socio", "Información", "info");
      return;
    }
    switch (action.titleKey) {
      case 'ahorro.actions.newDeposit':
        this.router.navigate(['/socio-ahorro/new', this.alerts[0].socioId]);
        break;

      case 'ahorro.actions.newWithdrawal':
        this.router.navigate(['/socio-retiro/new', this.alerts[0].socioId]);
        break;

      case 'ahorro.actions.newSaving':
        this.router.navigate(['/apertura-cuenta-navidena', this.alerts[0].socioId]);
        break;
      case "ahorro.actions.viewChristmasPlan":
        this.showPlanModal = true;
        break;
      case "ahorro.actions.increaseInstallment":
        this.router.navigate(['/cambio-cuota/new', this.alerts[0].socioId, 'incremento']);
        break;
      case "ahorro.actions.decreaseInstallment":
        this.router.navigate(['/cambio-cuota/new', this.alerts[0].socioId, 'disminucion']);
        break;
        
    }

    console.log('Action clicked:', action);

  }



  get orderedActions() {
    return [...this.actions].sort((a, b) => a.order - b.order);
  }


  closePlanModal(): void {
    this.showPlanModal = false;
  }



}