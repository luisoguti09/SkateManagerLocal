// src/app/Interfaces/evento-ext.ts
import { Evento } from './evento';
import { EventConfig } from './evento-config';

export type EventoConConfig = Evento & {
  config?: EventConfig;   
};
