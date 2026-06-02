export interface UltimoSeguimiento {
    deportistaId: number;
    nombreCompleto: string;
    disciplina: string;
    nivel: string;
    fechaUltimaEvaluacion: Date;
    progreso: number;
    cantidadElementos: number;
    cantidadComponentes: number;
    observacion?: string;
}