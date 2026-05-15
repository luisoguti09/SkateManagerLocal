
export interface EventConfig {
  inscripcionHabilitada: boolean;     
  requierePago: boolean;              
  certificadoAutomatico: boolean;     
  fechaInicio?: string;               
  fechaFin?: string;                  
  nivel?: string;                     
  sede?: string;                      
  generaQrEntrada?: boolean;          
}
