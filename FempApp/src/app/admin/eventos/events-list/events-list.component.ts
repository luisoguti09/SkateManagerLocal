import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { BackBarComponent } from '../../../shared/back-bar/back-bar.component';
import { EventosService } from '../../../services/eventos.service';
import { Evento } from '../../../interfaces/evento';

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
    MatIconModule
  ]
})
export class EventsListComponent implements OnInit {

  private ev = inject(EventosService);
  private router = inject(Router);

  public data: Evento[] = [];
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
    console.log('Abriendo QR de evento', id);
    if (!id) { return; }
    this.router.navigate(['/eventos', id, 'qr']);
  }

  load() {
    this.ev.getEventos().subscribe(evts => this.data = evts ?? []);
  }



}
