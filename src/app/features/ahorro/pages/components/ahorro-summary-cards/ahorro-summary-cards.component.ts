import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { SummaryCard } from '../../../interface/ahorro.models';
import { AppConfigService } from '../../../../../core/services/app-config.service';


@Component({
  selector: 'app-ahorro-summary-cards',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './ahorro-summary-cards.component.html',
  styleUrl: './ahorro-summary-cards.component.scss',
})
export class AhorroSummaryCardsComponent {
  private readonly appConfigService = inject(AppConfigService);
  @Input() cards: SummaryCard[] = [];

  formatValue(card: SummaryCard): string {
    if (card.titleKey === 'ahorro.summary.pendingRequests.title') {
      return `${Number(card.amount ?? 0)}`;
    }

    const currency = this.appConfigService.getCurrentSettings().currency || 'NIO';
    return `${currency} ${Number(card.amount ?? 0).toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}
