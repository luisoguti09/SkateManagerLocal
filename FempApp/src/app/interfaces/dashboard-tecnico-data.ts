export interface DashboardTecnicoData {
  resumen: {
    deportistasActivos: number;
    evaluacionesMes: number;
    componentesActivos: number;
    elementosActivos: number;
  };
  evolucionMensual: Array<{
    label: string;
    value: number;
  }>;
  distribucionComponentes: Array<{
    label: string;
    value: number;
  }>;
  distribucionElementos: Array<{
    label: string;
    value: number;
  }>;
  ultimosSeguimientos: Array<{
    id: number;
    nombreCompleto: string;
    disciplina: string;
    nivel: string;
    fechaUltimaEvaluacion: string;
    progreso: number;
  }>;
}