import { Component, Input, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';

const zona = 'America/Argentina/Buenos_Aires';
export function diaEvento(valor: unknown): string | null {
  if (!valor) return null;
  const texto = String(valor).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    const control = new Date(`${texto}T12:00:00Z`);
    return Number.isFinite(+control) && control.toISOString().slice(0, 10) === texto ? texto : null;
  }
  if (!(valor instanceof Date)) {
    const fechaCivil = texto.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaCivil) || !diaEvento(fechaCivil)) return null;
  }
  const iso = texto.replace(' ', 'T');
  if (!(valor instanceof Date) && !/^\d{4}-\d{2}-\d{2}T/.test(iso)) return null;
  const fecha = valor instanceof Date ? valor : new Date(/[Zz]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + '-03:00');
  if (!Number.isFinite(+fecha)) return null;
  const partes = new Intl.DateTimeFormat('en-US', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(fecha);
  return ['year', 'month', 'day'].map(t => partes.find(p => p.type === t)!.value).join('-');
}
export function grupoEvento(e: any, hoy = diaEvento(new Date())!): 'vigentes' | 'pasados' | 'sinFecha' {
  // Sin fecha de fin, el evento permanece vigente durante todo su día de inicio.
  const fin = diaEvento(e.fechaFin || e.fechaInicio || e.fecha);
  return !fin ? 'sinFecha' : fin < hoy ? 'pasados' : 'vigentes';
}
@Component({
  selector: 'app-eventos-agrupados', standalone: true, imports: [CommonModule],
  template: `
    <section class="grupo">
      <h3>Eventos vigentes y próximos ({{ vigentes.length }})</h3>
      <ng-container *ngTemplateOutlet="pagina; context: { $implicit: vigentes, clave: 'vigentes' }"></ng-container>
    </section>
    <details class="grupo" (toggle)="pasadosAbiertos = $any($event.target).open">
      <summary>Eventos pasados ({{ pasados.length }})</summary>
      <ng-container *ngIf="pasadosAbiertos">
        <label>Año <select #anio [value]="temporada" (change)="temporada = anio.value; paginas['pasados'] = 0">
          <option value="todos">Todos los años</option>
          <option *ngFor="let a of anios" [value]="a">{{ a }}</option>
        </select></label>
        <ng-container *ngTemplateOutlet="pagina; context: { $implicit: pasadosFiltrados, clave: 'pasados' }"></ng-container>
      </ng-container>
    </details>
    <details class="grupo" *ngIf="sinFecha.length" (toggle)="sinFechaAbiertos = $any($event.target).open">
      <summary>Eventos sin fecha · pendientes de revisión ({{ sinFecha.length }})</summary>
      <ng-container *ngIf="sinFechaAbiertos">
        <ng-container *ngTemplateOutlet="pagina; context: { $implicit: sinFecha, clave: 'sinFecha' }"></ng-container>
      </ng-container>
    </details>
    <ng-template #pagina let-filas let-clave="clave">
      <div class="tabla"><ng-container *ngTemplateOutlet="plantilla; context: { $implicit: recortar(filas, clave) }"></ng-container></div>
      <p *ngIf="!filas.length">No hay eventos en esta sección.</p>
      <nav *ngIf="filas.length > limite" aria-label="Paginación de eventos">
        <button type="button" [disabled]="numero(filas, clave) === 0" (click)="paginas[clave] = numero(filas, clave) - 1">Anterior</button>
        <span>Página {{ numero(filas, clave) + 1 }} de {{ total(filas) }}</span>
        <button type="button" [disabled]="numero(filas, clave) + 1 >= total(filas)" (click)="paginas[clave] = numero(filas, clave) + 1">Siguiente</button>
      </nav>
    </ng-template>`,
  styles: [`
    :host { display: block; }
    .grupo { margin: 16px 0; padding: 18px; border-radius: 14px; background: #1762c1; color: #fff; border: 1px solid #ffffff45; box-shadow: 0 4px 14px #063c8520; }
    h3 { margin: 0 0 16px; color: #fff; font-size: clamp(20px, 2.5vw, 26px); line-height: 1.3; }
    summary { cursor: pointer; font-weight: 600; padding: 8px 0; color: #fff; }
    label { display: block; margin: 12px 0; }
    select, button { background: #104b9e; color: #fff; border: 1px solid #ffffff90; border-radius: 8px; padding: 9px 14px; font: inherit; }
    select { margin-left: 8px; } option { background: #104b9e; color: #fff; }
    button { cursor: pointer; } button:disabled { background: #456da6; color: #e4edfa; border-color: #ffffff30; cursor: default; }
    nav { display: flex; align-items: center; justify-content: center; gap: 14px; flex-wrap: wrap; margin-top: 16px; }
    .tabla { overflow-x: auto; }
    summary:focus-visible, button:focus-visible, select:focus-visible { outline: 3px solid #ffdc73; outline-offset: 3px; }
    :host ::ng-deep .grupo .evento-card { background: #1257b8; color: #fff; border: 1px solid #ffffff45; }
    :host ::ng-deep .grupo .evento-card .mat-mdc-card-subtitle { color: #e4edfa; }
    @media (max-width: 600px) { .grupo { padding: 14px; } }
  `]
})
export class EventosAgrupadosComponent {
  @Input() eventos: any[] = [];
  @Input() plantilla!: TemplateRef<any>;
  readonly limite = 10;
  paginas: Record<string, number> = { vigentes: 0, pasados: 0, sinFecha: 0 };
  temporada = 'todos';
  pasadosAbiertos = false;
  sinFechaAbiertos = false;
  get vigentes() { return this.eventos.filter(e => grupoEvento(e) === 'vigentes').sort((a,b) => (diaEvento(a.fechaInicio || a.fecha) || '').localeCompare(diaEvento(b.fechaInicio || b.fecha) || '')); }
  get pasados() { return this.eventos.filter(e => grupoEvento(e) === 'pasados').sort((a,b) => (diaEvento(b.fechaFin || b.fechaInicio || b.fecha) || '').localeCompare(diaEvento(a.fechaFin || a.fechaInicio || a.fecha) || '')); }
  get sinFecha() { return this.eventos.filter(e => grupoEvento(e) === 'sinFecha'); }
  anio(e: any) { return (diaEvento(e.fechaInicio || e.fecha || e.fechaFin) || '').slice(0,4); }
  get anios() { return [...new Set(this.pasados.map(e => this.anio(e)))].sort().reverse(); }
  get pasadosFiltrados() { return this.pasados.filter(e => this.temporada === 'todos' || this.anio(e) === this.temporada); }
  total(filas: any[]) { return Math.max(1, Math.ceil(filas.length / this.limite)); }
  numero(filas: any[], clave: string) { return Math.min(this.paginas[clave] || 0, this.total(filas) - 1); }
  recortar(filas: any[], clave: string) { const n = this.numero(filas, clave); return filas.slice(n * this.limite, (n + 1) * this.limite); }
}
