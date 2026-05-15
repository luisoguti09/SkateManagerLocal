// src/app/interfaces/evento.ts
import { Deportist } from './deportist';

export interface Evento {
  id: number;
  titulo: string;
  nombre: string;
  descripcion?: string | null;
  fechaInicio?: string | Date | null;
  fechaFin?: string | Date | null;
  lugar?: string | null;
  address?: string | null;
  lat: number | null,
  lng: number | null,
  placeId: string | null,
  nivel?: string | null;
  inscripcionRequierePago?: boolean | null;
  precio?: number | null;
  permiteEfectivo?: boolean | null;
  certificadoAuto?: boolean | null;
  qrEventCode: string; // token único para el QR
}
export interface EventoConDeportistas extends Evento {
  deportistas?: Deportist[];
}

export type EventoLite = Pick<Evento, 'id' | 'titulo' | 'nombre'> & {
  qrEventCode: string;
};

