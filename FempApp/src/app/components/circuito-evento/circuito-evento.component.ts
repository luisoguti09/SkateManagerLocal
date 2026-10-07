import { Component, Input, OnChanges, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { RouterLink } from '@angular/router';
import { TarifarioGeneralComponent } from '../tarifario-general/tarifario-general.component';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';
@Component({
  selector: 'app-circuito-evento',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TarifarioGeneralComponent],
  templateUrl: './circuito-evento.component.html',
  styleUrls: ['./circuito-evento.component.scss'],
})
export class CircuitoEventoComponent implements OnInit, OnChanges {
  @Input() eventoId: number | null = null;
  auth = inject(AuthService);
  private http = inject(HttpClient);
  private api = environment.SERVER_API;
  rol = this.auth.getRolNombre();
  eventos: any[] = [];
  busquedaEvento = '';
  mostrarBuscador = false;
  private textoBusqueda(value: unknown): string {
    return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  }
  get eventosFiltrados(): any[] {
    const palabras = this.textoBusqueda(this.busquedaEvento).split(/\s+/).filter(Boolean);
    return this.eventos.filter(ev => {
      const nombre = this.textoBusqueda(`${ev.titulo || ''} ${ev.nombre || ''} ${ev.id}`);
      return palabras.every(palabra => nombre.includes(palabra));
    }).sort((a, b) => String(a.titulo || a.nombre || '').localeCompare(String(b.titulo || b.nombre || ''), 'es', { sensitivity: 'base' }) || Number(a.id) - Number(b.id));
  }
  get eventoSeleccionado(): any {
    return this.eventos.find(ev => Number(ev.id) === Number(this.eventoId));
  }
  seleccionarEvento(ev: any): void {
    if (this.ocupado) return;
    this.eventoId = Number(ev.id);
    this.mostrarBuscador = false;
    this.busquedaEvento = '';
    this.mensaje = '';
    void this.cargar();
  }
  data: any = null;
  cargos: any[] = [];
  seleccion: number[] = [];
  ocupado = false;
  error = '';
  mensaje = '';
  filtroEstado = '';
  filtroMes = '';
  filtroClub = '';
  private sequence = 0;
  get options() {
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${this.auth.getToken() || ''}`,
      }),
    };
  }
  get editable() {
    return this.data && ['inscripcion', 'abm'].includes(this.data.etapa);
  }
  get cargosFiltrados() {
    return this.cargos.filter(
      (c) =>
        (!this.filtroEstado || c.estado === this.filtroEstado) &&
        (!this.filtroMes ||
          new Date(c.createdAt)
            .toLocaleDateString('sv-SE', {
              timeZone: 'America/Argentina/Buenos_Aires',
            })
            .startsWith(this.filtroMes)) &&
        (!this.filtroClub ||
          (c.participacionesSnapshot || []).some((p: any) =>
            String(p.club || '')
              .toLowerCase()
              .includes(this.filtroClub.toLowerCase()),
          )),
    );
  }
  etiquetas: Record<string, string> = {
    sin_configurar: 'Calendario pendiente',
    por_abrir: 'Inscripción aún no abierta',
    inscripcion: 'Inscripción abierta',
    cuadernillo: 'Preparación y difusión del cuadernillo',
    abm: 'Altas, bajas y modificaciones',
    por_confirmar: 'Nómina pendiente de confirmación',
    gratuito_confirmado: 'Inscripción definitiva · evento gratuito',
    pago_por_abrir: 'Inscripción confirmada · pago aún no habilitado',
    pago: 'Pago habilitado',
    pago_cerrado: 'Plazo de pago finalizado',
  };
  ngOnInit() {
    if (this.rol === 'tesoreria')
      this.http
        .get<any[]>(`${this.api}/eventos`, this.options)
        .subscribe({
          next: (r) => (this.eventos = r),
          error: (e) =>
            (this.error =
              e.error?.error || 'No se pudieron cargar los eventos.'),
        });
  }
  ngOnChanges() {
    if (this.eventoId) void this.cargar();
  }
  async cargar() {
    const seq = ++this.sequence;
    this.error = '';
    this.data = null;
    this.cargos = [];
    if (!this.eventoId) return;
    this.ocupado = true;
    try {
      if (this.rol === 'tesoreria') {
        const cargos = await firstValueFrom(
          this.http.get<any[]>(
            `${this.api}/pagos/cargos?eventoId=${this.eventoId}`,
            this.options,
          ),
        );
        if (seq === this.sequence) this.cargos = cargos;
      } else {
        const data = await firstValueFrom(
          this.http.get<any>(
            `${this.api}/eventos/${this.eventoId}/circuito`,
            this.options,
          ),
        );
        if (seq === this.sequence) {
          this.data = data;
          this.seleccion = data.inscripciones.map(
            (i: any) => i.perfilDeportivoId,
          );
        }
      }
    } catch (e: any) {
      if (seq === this.sequence)
        this.error = e.error?.error || 'No se pudieron cargar los datos.';
    } finally {
      if (seq === this.sequence) this.ocupado = false;
    }
  }
  toggle(id: number, checked: boolean) {
    this.seleccion = checked
      ? [...new Set([...this.seleccion, id])]
      : this.seleccion.filter((x) => x !== id);
  }
  async accion(fn: () => Promise<any>, message: string) {
    this.ocupado = true;
    this.error = '';
    this.mensaje = '';
    try {
      await fn();
      this.mensaje = message;
      await this.cargar();
    } catch (e: any) {
      this.error = e.error?.error || 'No se pudo completar la operación.';
    } finally {
      this.ocupado = false;
    }
  }
  guardar() {
    return this.accion(
      () =>
        firstValueFrom(
          this.http.put(
            `${this.api}/eventos/${this.eventoId}/mi-inscripcion`,
            { perfilDeportivoIds: this.seleccion },
            this.options,
          ),
        ),
      'Inscripción guardada.',
    );
  }
  confirmar() {
    if (
      !window.confirm(
        '¿Confirmar la nómina definitiva? Las inscripciones quedarán cerradas y sus importes se conservarán.',
      )
    )
      return;
    return this.accion(
      () =>
        firstValueFrom(
          this.http.post(
            `${this.api}/eventos/${this.eventoId}/confirmar-inscripciones`,
            {},
            this.options,
          ),
        ),
      'Nómina confirmada.',
    );
  }
  async pagar() {
    this.ocupado = true;
    this.error = '';
    try {
      const r: any = await firstValueFrom(
        this.http.post(
          `${this.api}/pagos/crear-preferencia`,
          { eventoId: this.eventoId },
          this.options,
        ),
      );
      window.location.assign(r.init_point);
    } catch (e: any) {
      this.error = e.error?.error || 'No se pudo abrir el pago.';
      this.ocupado = false;
    }
  }
  async exportarCuadernillo() {
    this.ocupado = true;
    this.error = '';
    try {
      const blob = await firstValueFrom(
        this.http.get(
          `${this.api}/eventos/${this.eventoId}/inscripciones.csv`,
          { ...this.options, responseType: 'blob' },
        ),
      );
      this.descargar(
        blob,
        `cuadernillo_${this.data?.evento?.inscripcionesConfirmadasAt ? 'final' : 'provisorio'}_${this.eventoId}.csv`,
      );
    } catch {
      this.error = 'No se pudo exportar el cuadernillo.';
    } finally {
      this.ocupado = false;
    }
  }
  exportarCargos() {
    const esc = (v: any) =>
      '"' +
      String(v ?? '')
        .replace(/^[\s]*[=+@-]/, "'$&")
        .replace(/"/g, '""') +
      '"';
    const rows = this.cargosFiltrados.map((c) => [
      c.eventoNombre,
      c.deportista,
      c.dni,
      (c.participacionesSnapshot || [])
        .map((p: any) => p.club)
        .filter((x: any, i: number, a: any[]) => a.indexOf(x) === i)
        .join(' / '),
      c.perfilDeportivoIds.length,
      c.montoBase,
      c.montoComision,
      c.montoTotal,
      c.estado,
      c.vencido ? 'Sí' : 'No',
    ]);
    this.descargar(
      new Blob(
        [
          '\uFEFFEvento,Deportista,DNI,Club,Participaciones,Inscripción,Gestión,Total,Estado,Vencido\r\n' +
            rows.map((r) => r.map(esc).join(',')).join('\r\n'),
        ],
        { type: 'text/csv;charset=utf-8' },
      ),
      `cargos_evento_${this.eventoId}_${this.filtroMes || 'todos'}.csv`,
    );
  }
  private descargar(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
