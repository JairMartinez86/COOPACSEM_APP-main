import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { AppConfigService } from '../../../../../core/services/app-config.service';

@Component({
    selector: 'app-ficha-socio-print',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './ficha-socio-print.component.html',
    styleUrl: './ficha-socio-print.component.scss'
})
export class FichaSocioPrintComponent {
    @Input() socio: any = null;
    @Input() companyName = '';
    @Input() logoUrl = '';
    @Input() fechaServidor = '';

    constructor(public appConfigService: AppConfigService) { }


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
        switch ((value ?? '').toLowerCase()) {
            case 'cedula': return 'CÉDULA';
            case 'pasaporte': return 'PASAPORTE';
            case 'residencia': return 'RESIDENCIA';
            case 'otro': return 'OTRO';
            default: return value || '-';
        }
    }

    getSexoLabel(value: string | null | undefined): string {
        switch ((value ?? '').toUpperCase()) {
            case 'M': return 'MASCULINO';
            case 'F': return 'FEMENINO';
            default: return value || '-';
        }
    }

    getEstadoCivilLabel(value: string | null | undefined): string {
        switch ((value ?? '').toLowerCase()) {
            case 'soltero': return 'SOLTERO(A)';
            case 'casado': return 'CASADO(A)';
            case 'divorciado': return 'DIVORCIADO(A)';
            case 'viudo': return 'VIUDO(A)';
            case 'union_libre': return 'UNIÓN LIBRE';
            default: return value || '-';
        }
    }

    get primerNombre(): string {
        return this.getNombrePartes()[0] || '-';
    }

    get segundoNombre(): string {
        return this.getNombrePartes()[1] || '-';
    }

    get apellidos(): string {
        const partes = this.getNombrePartes();
        if (partes.length <= 2) return '-';
        return partes.slice(2).join(' ');
    }

    private getNombrePartes(): string[] {
        return (this.socio?.nombreCompleto || '')
            .trim()
            .split(/\s+/);
    }


    getDireccionReporte(): string[] {
  const lineas: string[] = [];

  const direccion = (this.socio?.direccionDomiciliar || '').trim();
  const municipio = (this.socio?.municipio || '').trim();
  const departamento = (this.socio?.departamento || '').trim();

  if (direccion) {
    const partes = direccion
      .split(/\r?\n|,/)
      .map((x: string) => x.trim())
      .filter((x: string) => !!x);

    lineas.push(...partes);
  }

  if (municipio) lineas.push(municipio.toUpperCase());
  if (departamento) lineas.push(departamento.toUpperCase());
  lineas.push('NICARAGUA');

  return lineas;
}
formatFechaCorta(value: any): string {
  if (!value) return '-';

  const d = new Date(value);
  if (isNaN(d.getTime())) {
    const raw = String(value).trim();
    const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    return raw;
  }

  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

get antiguedadIngreso(): number | null {
  const raw = this.socio?.fechaIngreso;
  if (!raw) return null;

  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;

  const today = new Date();
  let years = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();

  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) {
    years--;
  }

  return years;
}

buildFirmaFecha(): string {
  const fecha = this.fechaServidor
    ? new Date(`${this.fechaServidor}T00:00:00`)
    : new Date();

  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  const dia = fecha.getDate();
  const mes = meses[fecha.getMonth()];
  const anio = fecha.getFullYear();

  return `Día ${dia} del mes de ${mes} del año ${anio}`;
}

}