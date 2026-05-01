import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';



import {
  JMartAutoFocusDirective,
  JMartAutoFocusNextDirective,
  JMartEngineSyncDirective,
  JMartErrorNotifyDirective,
  JMartMassiveValidationService,
  JMartNumberFormatDirective
} from '@JairMartinez86/jmartinez-validator';
import { NotificationService } from '../../../../../core/services/notification.service';
import { AppConfigService } from '../../../../../core/services/app-config.service';
import { Breadcrumb } from '../../../../../shared/components/breadcrumb/breadcrumb';

interface SocioCreditoResumen {
  id: string;
  codigoSocio: string;
  nombreCompleto: string;
  numeroIdentificacion?: string;
  activo?: boolean;

  antiguedadTexto?: string;
  fechaIngreso?: string;

  salarioMensual?: number;
  ahorrosDisponibles?: number;
  creditosActivos?: number;
  limiteCreditoDisponible?: number;
}

@Component({
  selector: 'app-solicitud-credito',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    Breadcrumb,
    JMartAutoFocusNextDirective,
    JMartErrorNotifyDirective,
    JMartEngineSyncDirective,
    JMartAutoFocusDirective,
    JMartNumberFormatDirective
  ],
  templateUrl: './solicitud-credito.component.html',
  styleUrl: './solicitud-credito.component.scss'
})
export class SolicitudCreditoComponent implements OnInit, OnDestroy {

  private readonly route = inject(ActivatedRoute);
  private readonly translate = inject(TranslateService);
  private readonly engine = inject(JMartMassiveValidationService);

  public readonly notify = inject(NotificationService);
  public readonly appConfigService = inject(AppConfigService);

  private readonly subs = new Subscription();
  private readonly isBrowser: boolean;

  breadcrumbs: any[] = [];
  socioId = '';

  loading = false;
  saving = false;

  estadoSolicitud = 'EN_EVALUACION';

  socio: SocioCreditoResumen | null = null;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.breadcrumbs = this.translate.instant('solicitudCredito.breadcrumbs') || [];

    this.subs.add(
      this.translate.onLangChange.subscribe(() => {
        this.breadcrumbs = this.translate.instant('solicitudCredito.breadcrumbs') || [];
      })
    );

    this.socioId =
      this.route.snapshot.paramMap.get('socioId') ??
      this.route.snapshot.paramMap.get('id') ??
      '';

    this.cargarDatosEjemplo();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  get settings(): any {
    return this.appConfigService.getCurrentSettings();
  }

  get currency(): string {
    return this.settings?.currency || 'C$';
  }

  formatCurrency(value: number | null | undefined): string {
    const decimalSeparator = this.settings?.decimalSeparator ?? '.';
    const thousandSeparator = this.settings?.thousandSeparator ?? ',';

    const numberValue = Number(value ?? 0);

    const parts = numberValue.toFixed(2).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator);

    return parts.join(decimalSeparator);
  }

  private cargarDatosEjemplo(): void {
    this.socio = {
      id: this.socioId,
      codigoSocio: 'NA00007SE',
      nombreCompleto: 'NADEZHDA REBECA ABDALAH',
      numeroIdentificacion: '0010207830047S',
      activo: true,

      antiguedadTexto: '1 año 0 meses 14 días',
      fechaIngreso: '08/04/2025',

      salarioMensual: 32757,
      ahorrosDisponibles: 29516.08,
      creditosActivos: 1723.12,
      limiteCreditoDisponible: 44211.24
    };
  }
}