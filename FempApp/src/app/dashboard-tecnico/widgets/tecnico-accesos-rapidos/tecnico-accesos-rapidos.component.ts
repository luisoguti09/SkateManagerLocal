import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

interface AccesoRapido {
  titulo: string;
  descripcion: string;
  icono: string;
  ruta?: string;
  enabled: boolean;
  badge?: string;
}

@Component({
  selector: 'app-tecnico-accesos-rapidos',
  standalone: true,
  templateUrl: './tecnico-accesos-rapidos.component.html',
  styleUrls: ['./tecnico-accesos-rapidos.component.scss'],
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule
  ]
})
export class TecnicoAccesosRapidosComponent {
  accesos: AccesoRapido[] = [
    {
      titulo: 'Evaluaciones',
      descripcion: 'Ingresar a la evaluación técnica',
      icono: 'fact_check',
      ruta: '/evaluaciones',
      enabled: true
    },
    {
      titulo: 'Asistencias',
      descripcion: 'Consultar asistencias',
      icono: 'event_available',
      ruta: '/asistencias',
      enabled: true
    },
    {
      titulo: 'Componentes',
      descripcion: 'Administrar componentes técnicos',
      icono: 'widgets',
      enabled: false,
      badge: 'Revisar acceso'
    },
    {
      titulo: 'Elementos',
      descripcion: 'Administrar elementos técnicos',
      icono: 'category',
      enabled: false,
      badge: 'Revisar acceso'
    },
    {
      titulo: 'Deportistas',
      descripcion: 'Seguimiento de deportistas',
      icono: 'groups',
      enabled: false,
      badge: 'Revisar acceso'
    }
  ];
}