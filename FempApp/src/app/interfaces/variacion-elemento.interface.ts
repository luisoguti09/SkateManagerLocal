export interface VariacionElemento {
    elementoId: number;
    elementoNombre: string;
    notaAnterior: number | null;
    notaActual: number | null;
    variacion: number;
    fechaAnterior: Date | null;
    fechaActual: Date | null;
}