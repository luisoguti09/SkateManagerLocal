export interface ClubSedeOption {
    id: number;
    nombre: string;
    nombreNormalizado?: string;
    activo?: boolean;
}

export interface ClubOption {
    id: number;
    nombre: string;
    nombreNormalizado?: string;
    activo?: boolean;
    sedes?: ClubSedeOption[];
}