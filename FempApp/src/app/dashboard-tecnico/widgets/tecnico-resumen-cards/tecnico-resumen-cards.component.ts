import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { DashboardTecnicoData } from '../../../interfaces/dashboard-tecnico-data';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'app-tecnico-resumen-cards',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    MatProgressBarModule
  ],
  templateUrl: './tecnico-resumen-cards.component.html',
  styleUrls: ['./tecnico-resumen-cards.component.scss']
})
export class TecnicoResumenCardsComponent {
  @Input() resumen!: DashboardTecnicoData['resumen'];

  get cards() {
    if (!this.resumen) {
      return [];
    }

    return [
      {
        titulo: 'Deportistas activos',
        valor: this.resumen.deportistasActivos,
        icono: 'groups',
        detalle: 'Con seguimiento técnico'
      },
      {
        titulo: 'Evaluaciones del mes',
        valor: this.resumen.evaluacionesMes,
        icono: 'fact_check',
        detalle: 'Registros generados este mes'
      },
      {
        titulo: 'Componentes activos',
        valor: this.resumen.componentesActivos,
        icono: 'widgets',
        detalle: 'Componentes disponibles'
      },
      {
        titulo: 'Elementos activos',
        valor: this.resumen.elementosActivos,
        icono: 'category',
        detalle: 'Elementos técnicos cargados'
      }
    ];
  }
}