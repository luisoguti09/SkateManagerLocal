import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { BackBarComponent } from '../../../shared/back-bar/back-bar.component';
import { EventosService } from '../../../services/eventos.service';
import { Evento } from '../../../interfaces/evento';
import { CircuitoEventoComponent } from '../../../components/circuito-evento/circuito-evento.component';

@Component({
  selector: 'app-events-list',
  standalone: true,
  templateUrl: './events-list.component.html',
  styleUrls: ['./events-list.component.scss'],
  imports: [
    CommonModule,
    BackBarComponent,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    CircuitoEventoComponent
  ]
})
export class EventsListComponent implements OnInit {

  private ev = inject(EventosService);
  private router = inject(Router);

  public data: Evento[] = [];
  public seleccionado: Evento | null = null;
  public displayed = ['nombre', 'fecha', 'precio', 'acciones'];

  ngOnInit(): void {
    //this.ev.getEventos().subscribe((x) => (this.data = x ?? []));
    this.load();
  }

  nuevo() {
    this.router.navigate(['/admin/eventos/nuevo']);
  }

  editar(id: number) {
    this.router.navigate(['/admin/eventos', id]);
  }

  verQr(id: number) {

    if (!id) { return; }
    this.router.navigate(['/eventos', id, 'qr']);
  }

  load() {
    this.ev.getEventos().subscribe(evts => {
      const normalizados = (evts ?? []).map((e: any, index: number) => {
        const nombre = e.nombre || e.titulo || 'Sin nombre';
        const fechaRaw = e.fecha ?? e.fechaInicio ?? null;

        let fechaMostrable: Date | null = null;

        if (fechaRaw) {
          const parsed = new Date(fechaRaw);
          if (!Number.isNaN(parsed.getTime())) {
            fechaMostrable = parsed;
          } else {
            console.warn('[EVENTO CON FECHA INVALIDA]', {
              index,
              id: e.id,
              nombre,
              fechaRaw,
              evento: e
            });
          }
        }

        return {
          ...e,
          nombre,
          fechaMostrable
        };
      });


      this.data = normalizados;
    });
  }



}
