import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { SummaryCard } from '../../ahorro.models';

@Component({
  selector: 'app-ahorro-summary-cards',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ahorro-summary-cards.component.html',
  styleUrl: './ahorro-summary-cards.component.scss',
})
export class AhorroSummaryCardsComponent {
  @Input() cards: SummaryCard[] = [];
}
