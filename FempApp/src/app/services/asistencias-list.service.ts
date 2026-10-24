import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

export interface EventoAsistencias {id:number;titulo:string;lugar:string|null;fechaInicio:string|null;fechaFin:string|null;presentes:number;}
export interface FilaAsistencia {id:number;usuarioId:number;eventoId:number;checkedAt:string;Usuario:{id:number;nombre:string;dni:string;club:string|null};}
@Injectable({
  providedIn: 'root'
})
export class AsistenciasListService {

  private apiURL = environment.SERVER_API;
  private http = inject(HttpClient);
  private router = inject(Router);
  private base = `${this.apiURL}/asistencias`;

  constructor() { }
  resumen(){return this.http.get<{club:string|null;limitado:boolean;eventos:EventoAsistencias[]}>(`${this.base}/resumen`);}
  detalle(id:number,pagina:number,buscar:string){return this.http.get<{filas:FilaAsistencia[];total:number;pagina:number;limite:number}>(`${this.base}/eventos/${id}`,{params:{pagina:String(pagina),buscar}});}


  registrar(eventoId: number, token: string): Observable<{ ok: boolean, created: boolean }> {
    return this.http.post<{ ok: boolean; created: boolean }>(`${this.apiURL}/asistencias/check-in`, {
      eventoId,
      token
    });
  }

  listar(eventoId?: number): Observable<any[]> {
    const url = eventoId
      ? `${this.base}?eventoId=${eventoId}`
      : this.base;

    return this.http.get<any[]>(url);
  }

  checkin(token: string, eventoId: number, device?: string) {
    return this.http.post<{ ok?: boolean; created?: boolean; message?: string }>(
      `${this.apiURL}/asistencias/checkin`,
      { token, eventoId, device }
    );
  }


}
