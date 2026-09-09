import { ClubOption, ClubSedeOption } from './club-option.interface';

export interface PerfilDeportivo {
  id: number;
  usuarioId: number;
  disciplina: string;
  origenCategoria?: string | null;
  licencia?: string | null;
  modalidad?: string | null;
  divisional?: string | null;
  categoria?: string | null;
  temporada?: string | null;
  club?: string | null;
  clubId?: number | null;
  clubSedeId?: number | null;
  activa: boolean;
  clubEntidad?: ClubOption | null;
  clubSede?: ClubSedeOption | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CrearPerfilDeportivoDto {
  usuarioId: number;
  disciplina: string;
  origenCategoria?: string | null;
  licencia?: string | null;
  modalidad?: string | null;
  divisional?: string | null;
  categoria?: string | null;
  temporada?: string | null;
  club?: string | null;
  clubId?: number | null;
  clubSedeId?: number | null;
  activa?: boolean;
}
