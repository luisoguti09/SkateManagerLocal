import { Evento } from './evento';

export type NuevoEventoDto = Omit<Evento, 'id'>;
export type EditEventoDto  = Partial<NuevoEventoDto>;
