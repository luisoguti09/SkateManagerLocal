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
}