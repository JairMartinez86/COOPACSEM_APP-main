import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';

import { NotificationService } from '../../../../core/services/notification.service';
import { AppConfigService } from '../../../../core/services/app-config.service';
import { SociosService } from '../../services/socios.service';
import { Breadcrumb } from '../../../../shared/components/breadcrumb/breadcrumb';

@Component({
  selector: 'app-ficha-socio',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, Breadcrumb],
  templateUrl: './ficha-socio.component.html',
  styleUrl: './ficha-socio.component.scss'
})
export class FichaSocioComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private sociosService = inject(SociosService);
  private notify = inject(NotificationService);
  private translate = inject(TranslateService);

  public appConfigService = inject(AppConfigService);

  loading = false;
  socioId: string | null = null;

  modalExportacionOpen = false;
  tipoReporte: 'ficha' | 'afiliacion' | null = null;

  companyName = 'Mi Empresa S.A.';
  logoUrl = '';
  fechaServidor = '';

  breadcrumbs: any[] = [];

  socio: any = null;

  ngOnInit(): void {
    this.setBreadcrumbs();

    this.translate.onLangChange.subscribe(() => {
      this.setBreadcrumbs();
    });

    this.socioId = this.route.snapshot.paramMap.get('id');

    this.loadPublicSettings();

    if (!this.socioId) {
      this.notify.show?.(
        this.translate.instant('fichaSocio.messages.noId'),
        '',
        'warning'
      );
      this.router.navigate(['/socios']);
      return;
    }

    this.loadSocio(this.socioId);
  }

  private setBreadcrumbs(): void {
    this.breadcrumbs = [
      {
        label: this.translate.instant('fichaSocio.breadcrumbs.socios'),
        url: '/socios'
      },
      {
        label: this.translate.instant('fichaSocio.breadcrumbs.ficha')
      }
    ];
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
            this.notify.show?.(
              this.translate.instant('fichaSocio.messages.notFound'),
              '',
              'warning'
            );
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
          this.notify.show?.(
            this.translate.instant('fichaSocio.messages.loadError'),
            '',
            'error'
          );
          this.router.navigate(['/socios']);
        }
      });
  }

  get edad(): number | null {
    const raw = this.socio?.fechaNacimiento;
    if (!raw) return null;

    const parts = String(raw).split(/[\/-]/);
    if (parts.length !== 3) return null;

    const day = Number(parts[0]);
    const month = Number(parts[1]);
    const year = Number(parts[2]);

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
    const key = (value ?? '').toLowerCase();

    if (!key) return '-';

    const translated = this.translate.instant(`fichaSocio.identificationTypes.${key}`);
    return translated !== `fichaSocio.identificationTypes.${key}` ? translated : value || '-';
  }

  getSexoLabel(value: string | null | undefined): string {
    const key = (value ?? '').toUpperCase();

    if (!key) return '-';

    const translated = this.translate.instant(`fichaSocio.gender.${key}`);
    return translated !== `fichaSocio.gender.${key}` ? translated : value || '-';
  }

  getEstadoCivilLabel(value: string | null | undefined): string {
    const key = (value ?? '').toLowerCase();

    if (!key) return '-';

    const translated = this.translate.instant(`fichaSocio.maritalStatus.${key}`);
    return translated !== `fichaSocio.maritalStatus.${key}` ? translated : value || '-';
  }

  getStatusLabel(value: boolean): string {
    return value
      ? this.translate.instant('fichaSocio.status.active')
      : this.translate.instant('fichaSocio.status.inactive');
  }

  imprimirPdfFicha(): void {
    const base64 = this.socio?.pdf_ficha;
    if (!base64) return;

    this.openBase64PdfForPrint(base64);
  }

  imprimirAfiliacion(): void {
    const base64 = this.socio?.pdf_afiliacion;
    if (!base64) return;

    this.openBase64PdfForPrint(base64);
  }

  private openBase64PdfForPrint(base64: string): void {
    const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
    const byteCharacters = atob(cleanBase64);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);

    const win = window.open(url, '_blank');

    if (!win) return;

    win.onload = () => {
      win.focus();
      win.print();
    };
  }

  abrirModalExportacion(): void {
    this.modalExportacionOpen = true;
  }

  cerrarModalExportacion(): void {
    this.modalExportacionOpen = false;
    this.tipoReporte = null;
  }

  back(): void {
    this.router.navigate(['/socios']);
  }

  private buildPrintFileName(tipo: string): string {
    const codigo = (this.socio?.codigoSocio || 'SIN-CODIGO').trim();

    const nombre = (this.socio?.nombreCompleto || 'SOCIO')
      .trim()
      .replace(/[\\/:*?"<>|]/g, '');

    return `COOPACSEM - ${tipo} - ${codigo} - ${nombre}`;
  }

  exportarComoPdf(): void {
    const tipo = this.tipoReporte;

    if (!tipo) return;

    this.cerrarModalExportacion();

    if (tipo === 'ficha') {
      this.descargarPdfBase64(
        this.socio?.pdf_ficha,
        this.buildPrintFileName(this.translate.instant('fichaSocio.fileNames.memberRecord'))
      );
      return;
    }

    if (tipo === 'afiliacion') {
      this.descargarPdfBase64(
        this.socio?.pdf_afiliacion,
        this.buildPrintFileName(this.translate.instant('fichaSocio.fileNames.affiliationLetter'))
      );
    }
  }

  exportarComoExcel(): void {
    const tipo = this.tipoReporte;

    if (!tipo) return;

    this.cerrarModalExportacion();

    if (tipo === 'ficha') {
      this.descargarExcelBase64(
        this.socio?.excel_ficha,
        this.buildPrintFileName(this.translate.instant('fichaSocio.fileNames.memberRecord'))
      );
      return;
    }

    if (tipo === 'afiliacion') {
      this.descargarExcelBase64(
        this.socio?.excel_afiliacion,
        this.buildPrintFileName(this.translate.instant('fichaSocio.fileNames.affiliationLetter'))
      );
    }
  }

  private descargarExcelBase64(base64: string | null | undefined, fileName: string): void {
    if (!base64) return;

    const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
    const byteCharacters = atob(cleanBase64);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);

    const blob = new Blob([byteArray], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    window.URL.revokeObjectURL(url);
  }

  private descargarPdfBase64(base64: string | null | undefined, fileName: string): void {
    if (!base64) return;

    const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
    const byteCharacters = atob(cleanBase64);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);

    const blob = new Blob([byteArray], {
      type: 'application/pdf'
    });

    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.pdf`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    window.URL.revokeObjectURL(url);
  }
}