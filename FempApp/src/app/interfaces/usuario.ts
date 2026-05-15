export interface Usuario {
  id: number;
  nombre: string;
  edad: number;
  nivel: string;
  email: string;
  dni: string;
  rol: string;
  rolId: number;
  fotoPerfil?: string;
  aprobado?: boolean;
  dniFrente?: string;
  dniDorso?: string;
  fichaMedica?: string;
  documentacionAprobada?: boolean;
   // nuevos opcionales hasta que ADMIN se encuentre habilitado
  estado?: 'pendiente'|'aprobado'|'bloqueado'|null;
  rolSolicitado?: 'administrador'|'tecnico'|'deportista'|null;
  qrJti?: string|null;
}
