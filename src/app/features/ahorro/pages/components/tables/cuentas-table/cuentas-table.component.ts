import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AppConfigService } from '../../../../../../core/services/app-config.service';


@Component({ selector: 'app-cuentas-table', standalone: true, imports: [CommonModule, TranslateModule], templateUrl: './cuentas-table.component.html', styleUrl: './cuentas-table.component.scss' })
export class CuentasTableComponent { @Input() rows: any[] = []; private readonly appConfigService = inject(AppConfigService); formatCurrency(v: number | null | undefined): string { const c = this.appConfigService.getCurrentSettings().currency || 'NIO'; return `${c} ${Number(v ?? 0).toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; } }
