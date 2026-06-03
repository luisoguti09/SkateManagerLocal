export interface VariacionComponente {
    componenteId: number;
    componenteNombre: string;
    notaAnterior: number | null;
    notaActual: number | null;
    variacion: number;
    fechaAnterior: Date | null;
    fechaActual: Date | null;
}