export interface CertificateRequest {
  eventoId: number;
  dni: string;
  motivo?: 'asistencia' | 'competencia';
}

export interface CertificateMeta {
  fileName: string;
  contentType: 'application/pdf';
}

export interface CertUsuario {
  nombre: string;
  dni: string;
  club: string;
  categoria: string;
  disciplina?: string;
  licencia?: string;
  modalidad?: string;
  divisional?: string;
}

export type CertEvento = {
  titulo: string;
  fechaInicio: string | Date;
  lugar?: string | null;
  nivel?: string | null;
};
export interface CertificateResponse {
  usuario: CertUsuario;
  evento: CertEvento;
  meta: CertificateMeta;
  file: string;
}


