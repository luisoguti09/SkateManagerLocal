import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { UltimoSeguimiento } from '../../../interfaces/ultimo-seguimiento.interface';

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

  @Input() items!: UltimoSeguimiento[];

  displayedColumns: string[] = [
    'nombreCompleto',
    'disciplina',
    'nivel',
    'fechaUltimaEvaluacion',
    'cantidadElementos',
    'cantidadComponentes',
    'progreso'
  ];

}