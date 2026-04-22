import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { TranslateModule } from '@ngx-translate/core';


import { NotificationService } from '../../../../core/services/notification.service';
import { AppConfigService } from '../../../../core/services/app-config.service';
import { SociosService } from '../../services/socios.service';
import { Breadcrumb } from '../../../../shared/components/breadcrumb/breadcrumb';
import { FichaSocioPrintComponent } from "../print/ficha-socio/ficha-socio-print.component";
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-ficha-socio',
  standalone: true,
  imports: [CommonModule, TranslateModule, Breadcrumb, FichaSocioPrintComponent],
  templateUrl: './ficha-socio.component.html',
  styleUrl: './ficha-socio.component.scss'
})
export class FichaSocioComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private sociosService = inject(SociosService);
  private notify = inject(NotificationService);
  private title = inject(Title);

  public appConfigService = inject(AppConfigService);

  mostrarPrint = false;

  loading = false;
  socioId: string | null = null;

  companyName = 'Mi Empresa S.A.';
  logoUrl = '';
  fechaServidor = '';

  breadcrumbs = [
    { label: 'Socios', url: '/socios' },
    { label: 'Ficha de socio' }
  ];

  socio: any = null;

  ngOnInit(): void {
    this.socioId = this.route.snapshot.paramMap.get('id');

    this.loadPublicSettings();

    if (!this.socioId) {
      this.notify.show?.('No se recibió el id del socio.', '', 'warning');
      this.router.navigate(['/socios']);
      return;
    }

    this.loadSocio(this.socioId);
  }

  private loadPublicSettings(): void {
    this.appConfigService.getPublicSettings().subscribe({
      next: (res) => {
        const data = res?.data;
        this.companyName = data?.companyName || 'Mi Empresa S.A.';
        this.logoUrl = data?.logoUrl || '';
        this.fechaServidor = data?.fechaServidor || '';
      },
      error: () => {
        this.companyName = 'Mi Empresa S.A.';
        this.logoUrl = '';
        this.fechaServidor = '';
      }
    });
  }

  private loadSocio(id: string): void {
    this.loading = true;

    this.sociosService
      .getFicha(id)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res: any) => {
          const socioApi = res?.data?.socio;

          if (!socioApi) {
            this.notify.show?.('No se encontró información del socio.', '', 'warning');
            this.router.navigate(['/socios']);
            return;
          }

          this.socio = {
            ...socioApi,
            fechaEmision: this.appConfigService.formatDate(socioApi.fechaEmision),
            fechaVencimiento: this.appConfigService.formatDate(socioApi.fechaVencimiento),
            fechaNacimiento: this.appConfigService.formatDate(socioApi.fechaNacimiento),
            fechaIngreso: this.appConfigService.formatDate(socioApi.fechaIngreso),
            cuentaCorrienteFechaInicioDeduccion: this.appConfigService.formatDate(socioApi.cuentaCorrienteFechaInicioDeduccion),
            cuentaNavidenaFechaInicioDeduccion: this.appConfigService.formatDate(socioApi.cuentaNavidenaFechaInicioDeduccion),
            createdAtUtc: this.appConfigService.formatDate(socioApi.createdAtUtc)
          };
        },
        error: () => {
          this.notify.show?.('Error cargando la ficha del socio.', '', 'error');
          this.router.navigate(['/socios']);
        }
      });
  }

  get edad(): number | null {
    const raw = this.socio?.fechaNacimiento;
    if (!raw) return null;

    const parts = String(raw).split(/[\/-]/);
    if (parts.length !== 3) return null;

    let day = 0;
    let month = 0;
    let year = 0;

    // asumiendo dd/MM/yyyy por tu config actual
    day = Number(parts[0]);
    month = Number(parts[1]);
    year = Number(parts[2]);

    if (!day || !month || !year) return null;

    const birth = new Date(year, month - 1, day);
    const today = new Date();

    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();

    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  }

  get totalBeneficiarios(): number {
    return (this.socio?.beneficiarios ?? []).reduce(
      (sum: number, item: any) => sum + Number(item?.porcentaje ?? 0),
      0
    );
  }

  formatMoney(value: any): string {
    const amount = Number(value ?? 0);

    return new Intl.NumberFormat('es-NI', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  getTipoIdentificacionLabel(value: string | null | undefined): string {
    switch ((value ?? '').toLowerCase()) {
      case 'cedula': return 'Cédula';
      case 'pasaporte': return 'Pasaporte';
      case 'residencia': return 'Residencia';
      case 'otro': return 'Otro';
      default: return value || '-';
    }
  }

  getSexoLabel(value: string | null | undefined): string {
    switch ((value ?? '').toUpperCase()) {
      case 'M': return 'Masculino';
      case 'F': return 'Femenino';
      default: return value || '-';
    }
  }

  getEstadoCivilLabel(value: string | null | undefined): string {
    switch ((value ?? '').toLowerCase()) {
      case 'soltero': return 'Soltero(a)';
      case 'casado': return 'Casado(a)';
      case 'divorciado': return 'Divorciado(a)';
      case 'viudo': return 'Viudo(a)';
      case 'union_libre': return 'Unión libre';
      default: return value || '-';
    }
  }



imprimirDirecto(): void {
  if (!this.socio) return;

  const json = JSON.stringify(this.socio, null, 2);
const parsed = JSON.parse(json);
console.log(parsed);

  const oldTitle = this.title.getTitle();


  this.title.setTitle('\u200B');

  this.mostrarPrint = true;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.print();

      setTimeout(() => {
        this.mostrarPrint = false;

        // 🔁 restaurar título normal
        this.title.setTitle(oldTitle);
      }, 500);
    });
  });
}

  back(): void {
    this.router.navigate(['/socios']);
  }
}