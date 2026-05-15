import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ElementosService {
  private http = inject(HttpClient);
  private apiUrl = environment.SERVER_API;

  getElementos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/elementos`).pipe(
      catchError((err) => {
        console.error('Error al obtener elementos técnicos', err);
        return of([]);
      })
    );
  }

  getEvaluaciones(deportistaId: number) {
    return this.http.get<any[]>(`${this.apiUrl}/evaluaciones/${deportistaId}`);
  }

  crearElemento(data: any) {
    return this.http.post<any>(`${this.apiUrl}/elementos`, data);
  }

}
