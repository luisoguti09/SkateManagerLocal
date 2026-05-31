import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-tecnico-accesos-rapidos',
  templateUrl: './tecnico-accesos-rapidos.component.html',
  styleUrls: ['./tecnico-accesos-rapidos.component.scss'],
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    RouterModule
  ]
})
export class TecnicoAccesosRapidosComponent {

  accesos = [
    {
      titulo: 'Componentes',
      descripcion: 'Administrar componentes técnicos',
      icono: 'widgets',
      ruta: '/componentes'
    },
    {
      titulo: 'Elementos',
      descripcion: 'Administrar elementos técnicos',
      icono: 'category',
      ruta: '/elementos'
    },
    {
      titulo: 'Deportistas',
      descripcion: 'Ver seguimiento de deportistas',
      icono: 'groups',
      ruta: '/deportist'
    },
    {
      titulo: 'Asistencias',
      descripcion: 'Consultar asistencias',
      icono: 'event_available',
      ruta: '/asistencias'
    }
  ];
}