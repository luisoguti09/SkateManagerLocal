export interface PerfilDeportivo {
  id: number;
  usuarioId: number;
  disciplina: string;
  licencia?: string | null;
  modalidad?: string | null;
  divisional?: string | null;
  categoria?: string | null;
  temporada?: string | null;
  club?: string | null;
  activa: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CrearPerfilDeportivoDto {
  usuarioId: number;
  disciplina: string;
  licencia?: string | null;
  modalidad?: string | null;
  divisional?: string | null;
  categoria?: string | null;
  temporada?: string | null;
  club?: string | null;
  activa?: boolean;
}