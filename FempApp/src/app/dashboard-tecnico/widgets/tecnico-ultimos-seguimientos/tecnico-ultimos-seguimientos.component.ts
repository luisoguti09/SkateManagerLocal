import { Component, Input } from '@angular/core';
import { DashboardTecnicoData } from '../../../interfaces/dashboard-tecnico-data';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tecnico-ultimos-seguimientos',
  standalone: true,
  templateUrl: './tecnico-ultimos-seguimientos.component.html',
  styleUrls: ['./tecnico-ultimos-seguimientos.component.scss'],
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatProgressBarModule
  ]
})
export class TecnicoUltimosSeguimientosComponent {
  @Input() items!: DashboardTecnicoData['ultimosSeguimientos'];

  displayedColumns: string[] = [
    'nombreCompleto',
    'disciplina',
    'nivel',
    'fechaUltimaEvaluacion',
    'progreso'
  ];
}