import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ActionItem, AlertItem, ReportItem } from '../../ahorro.models';

@Component({
  selector: 'app-ahorro-side-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ahorro-side-panel.component.html',
  styleUrl: './ahorro-side-panel.component.scss',
})
export class AhorroSidePanelComponent {
  @Input() actions: ActionItem[] = [];
  @Input() alerts: AlertItem[] = [];
  @Input() reports: ReportItem[] = [];
}
