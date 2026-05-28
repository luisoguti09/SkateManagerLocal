import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EvaluacionesService {

  private http = inject(HttpClient);
  private apiUrl = `${environment.SERVER_API}/evaluaciones`;

  crearEvaluacion(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, data);
  }

  getEvaluacionesPorDeportista(deportistaId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/deportista/${deportistaId}`);
  }

  getEvaluaciones(filtros: any = {}): Observable<any[]> {
    const params: any = {};

    if (filtros.tipoEvaluacion) params.tipoEvaluacion = filtros.tipoEvaluacion;
    if (filtros.fechaDesde) params.fechaDesde = filtros.fechaDesde;
    if (filtros.fechaHasta) params.fechaHasta = filtros.fechaHasta;
    if (filtros.buscar) params.buscar = filtros.buscar;

    return this.http.get<any[]>(`${this.apiUrl}`, { params });
  }

}