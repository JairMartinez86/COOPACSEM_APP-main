import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { SimpleMovimientoRow } from '../../../../interface/ahorro.models';
import { AppConfigService } from '../../../../../../core/services/app-config.service';


@Component({ selector: 'app-retiros-table', standalone: true, imports: [CommonModule, TranslateModule], templateUrl: './retiros-table.component.html', styleUrl: './retiros-table.component.scss' })
export class RetirosTableComponent { private readonly appConfigService = inject(AppConfigService); @Input() rows: SimpleMovimientoRow[] = []; formatCurrency(v: number | null | undefined): string { const c = this.appConfigService.getCurrentSettings().currency || 'NIO'; return `${c} ${Number(v ?? 0).toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; } }
