import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { DashboardTecnicoData } from '../interfaces/dashboard-tecnico-data';

@Injectable({
  providedIn: 'root'
})
export class DashboardTecnicoService {
  getDashboardData(): Observable<DashboardTecnicoData> {
    return of({
      resumen: {
        deportistasActivos: 128,
        evaluacionesMes: 46,
        componentesActivos: 14,
        elementosActivos: 32
      },
      evolucionMensual: [
        { label: 'Ene', value: 12 },
        { label: 'Feb', value: 18 },
        { label: 'Mar', value: 16 },
        { label: 'Abr', value: 24 },
        { label: 'May', value: 28 },
        { label: 'Jun', value: 31 }
      ],
      distribucionComponentes: [
        { label: 'Técnica base', value: 8 },
        { label: 'Expresión', value: 5 },
        { label: 'Postura', value: 6 },
        { label: 'Secuencias', value: 4 }
      ],
      distribucionElementos: [
        { label: 'Saltos', value: 12 },
        { label: 'Giros', value: 9 },
        { label: 'Transiciones', value: 6 },
        { label: 'Coreografía', value: 5 }
      ],
      ultimosSeguimientos: [
        {
          id: 1,
          nombreCompleto: 'Valentina Gómez',
          disciplina: 'Libre',
          nivel: 'Intermedio',
          fechaUltimaEvaluacion: '2026-05-20',
          progreso: 78
        },
        {
          id: 2,
          nombreCompleto: 'Martina López',
          disciplina: 'Escuela',
          nivel: 'Avanzado',
          fechaUltimaEvaluacion: '2026-05-24',
          progreso: 84
        },
        {
          id: 3,
          nombreCompleto: 'Sofía Pérez',
          disciplina: 'Libre',
          nivel: 'Inicial',
          fechaUltimaEvaluacion: '2026-05-26',
          progreso: 61
        }
      ]
    });
  }
}