import {
  Component,
  OnInit,
  inject,
  ViewChild,
  ElementRef,
} from '@angular/core';
import {
  MatCalendar,
  MatDatepickerModule,
} from '@angular/material/datepicker';
import {
  MatNativeDateModule,
  MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';
import { CircuitoEventoComponent } from '../../../components/circuito-evento/circuito-evento.component';

@Component({
  selector: 'app-event-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CircuitoEventoComponent,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  providers: [provideNativeDateAdapter(), 
    { provide: MAT_DATE_LOCALE, useValue: 'es-AR' },
  ],
  templateUrl: './event-editor.component.html',
  styleUrls: ['./event-editor.component.scss'],
})
export class EventEditorComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private api = environment.SERVER_API;

  @ViewChild('fechaDialog')
  fechaDialog!: ElementRef<HTMLDialogElement>;

  @ViewChild(MatCalendar)
  calendario!: MatCalendar<Date>;

  id: number | null = null;
  loading = false;
  error = '';
  confirmado = false;
  revision = 0;
  guardado = false;

  campoFecha = '';
  tituloFecha = '';
  dia: Date | null = null;
  hora = '09:00';
  editandoHora = false;
  horaElegida = '09';
  minutoElegido = '00';
  horas = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  minutos = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  abrirHora() {
    [this.horaElegida, this.minutoElegido] = this.hora.split(':');
    this.editandoHora = true;
  }
  aceptarHora() {
    this.hora = this.horaElegida + ':' + this.minutoElegido;
    this.editandoHora = false;
  }
  fechaError = '';

  form: any = {
    titulo: '',
    descripcion: '',
    lugar: '',
    fechaInicio: '',
    fechaFin: '',
    inscripcionRequierePago: null,
    inscripcionDesde: '',
    inscripcionHasta: '',
    abmDesde: '',
    abmHasta: '',
    pagoDesde: '',
    pagoHasta: '',
  };

  fechasEvento = [
    { key: 'fechaInicio', label: 'Inicio del evento' },
    { key: 'fechaFin', label: 'Fin del evento' },
  ];

  fechas = [
    { key: 'inscripcionDesde', label: 'Apertura de inscripción' },
    {
      key: 'inscripcionHasta',
      label: 'Cierre de inscripción',
    },
    { key: 'abmDesde', label: 'Apertura de ABM' },
    { key: 'abmHasta', label: 'Cierre de ABM' },
    { key: 'pagoDesde', label: 'Apertura de pago' },
    { key: 'pagoHasta', label: 'Vencimiento del pago' },
  ];

  get options() {
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${this.auth.getToken() || ''}`,
      }),
    };
  }

  mostrarFecha(valor: string) {
    if (!valor) return 'Seleccionar fecha y hora';

    const [fecha, hora] = valor.split('T');

    return fecha.split('-').reverse().join('/') + ' · ' + hora;
  }

  abrirFecha(key: string, label: string) {
    this.editandoHora = false;
    this.campoFecha = key;
    this.tituloFecha = label;
    this.fechaError = '';

    const valor = this.form[key];

    if (valor) {
      const [fecha, hora] = valor.split('T');
      const [y, m, d] = fecha.split('-').map(Number);

      this.dia = new Date(y, m - 1, d);
      this.hora = hora;
    } else {
      this.dia = null;
      this.hora = '09:00';
    }

    this.calendario.activeDate = this.dia || new Date();
    this.fechaDialog.nativeElement.showModal();
  }

  aceptarFecha() {
    if (
      !this.dia ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(this.hora)
    ) {
      this.fechaError = 'Seleccioná un día y una hora válida.';
      return;
    }

    const pad = (n: number) => String(n).padStart(2, '0');

    this.form[this.campoFecha] =
      `${this.dia.getFullYear()}-` +
      `${pad(this.dia.getMonth() + 1)}-` +
      `${pad(this.dia.getDate())}T${this.hora}`;

    this.guardado = false;
    this.fechaDialog.nativeElement.close();
  }

  validar(): string {
    const f = this.form;

    if (!f.titulo?.trim() || !f.lugar?.trim()) {
      return 'Completá el título y el lugar del evento.';
    }

    if (
      f.fechaInicio &&
      f.fechaFin &&
      f.fechaFin <= f.fechaInicio
    ) {
      return 'El fin del evento debe ser posterior al inicio.';
    }

    if (this.confirmado) return '';

    if (typeof f.inscripcionRequierePago !== 'boolean') {
      return 'Seleccioná si la inscripción es gratuita o con costo.';
    }

    if (
      !f.inscripcionDesde ||
      !f.inscripcionHasta || !f.abmDesde || !f.abmHasta
    ) {
      return 'Completá las fechas de inscripción y de cierre de ABM.';
    }

    if (f.inscripcionHasta <= f.inscripcionDesde) {
      return 'El cierre de inscripción debe ser posterior a la apertura.';
    }

    if (f.abmDesde < f.inscripcionHasta) return 'La apertura de ABM debe ser igual o posterior al cierre de inscripción.';
    if (f.abmHasta <= f.abmDesde) {
      return 'El cierre de ABM debe ser posterior a su apertura.';
    }

    if (f.inscripcionRequierePago) {
      if (!f.pagoDesde || !f.pagoHasta) {
        return 'Completá la apertura y el vencimiento del pago.';
      }

      if (f.pagoDesde < f.abmHasta) {
        return 'El pago puede abrirse a partir del cierre de ABM.';
      }

      if (f.pagoHasta <= f.pagoDesde) {
        return 'El vencimiento del pago debe ser posterior a su apertura.';
      }
    }

    return '';
  }

  local(v: any) {
    if (!v) return '';

    const d = new Date(v);

    if (!Number.isFinite(+d)) return '';

    return new Date(+d - 3 * 3600000)
      .toISOString()
      .slice(0, 16);
  }

  async ngOnInit() {
    const n = Number(this.route.snapshot.paramMap.get('id'));

    if (n > 0) {
      this.id = n;
      this.loading = true;

      try {
        const ev: any = await firstValueFrom(
          this.http.get(
            `${this.api}/eventos/${n}`,
            this.options,
          ),
        );

        this.confirmado = !!ev.inscripcionesConfirmadasAt;

        this.form = {
          ...this.form,
          ...ev,
          titulo: ev.titulo || ev.nombre,
        };

        for (const k of [
          'fechaInicio',
          'fechaFin',
          ...this.fechas.map((f) => f.key),
        ]) {
          this.form[k] = this.local(ev[k]);
        }
      } catch (e: any) {
        this.error =
          e.error?.error || 'No se pudo cargar el evento.';
      } finally {
        this.loading = false;
      }
    }
  }

  async save() {
    if (this.loading) return;

    this.guardado = false;
    this.error = this.validar();

    if (this.error) return;

    this.loading = true;

    try {
      const body: any = {
        titulo: this.form.titulo,
        descripcion: this.form.descripcion,
        lugar: this.form.lugar,
        fechaInicio: this.form.fechaInicio
          ? this.form.fechaInicio + ':00-03:00'
          : null,
        fechaFin: this.form.fechaFin
          ? this.form.fechaFin + ':00-03:00'
          : null,
      };

      if (!this.confirmado) {
        body.inscripcionRequierePago =
          this.form.inscripcionRequierePago;

        for (const f of this.fechas) {
          body[f.key] =
            !this.form.inscripcionRequierePago &&
              f.key.startsWith('pago')
              ? null
              : this.form[f.key]
                ? this.form[f.key] + ':00-03:00'
                : null;
        }
      }

      if (this.id) {
        await firstValueFrom(
          this.http.put(
            `${this.api}/eventos/${this.id}`,
            body,
            this.options,
          ),
        );

        this.revision++;
        this.guardado = true;
      } else {
        const ev: any = await firstValueFrom(
          this.http.post(
            `${this.api}/eventos`,
            body,
            this.options,
          ),
        );

        await this.router.navigate([
          '/admin/eventos',
          ev.id,
        ]);

        this.id = ev.id;
      }
    } catch (e: any) {
      this.error =
        e.status >= 500
          ? 'El servidor no pudo guardar el evento (error ' +
          e.status +
          '). Revisá la respuesta de la solicitud y la consola del backend.'
          : e.error?.error ||
          'No se pudo guardar el evento. Verificá la conexión e intentá nuevamente.';
    } finally {
      this.loading = false;
    }
  }
}
