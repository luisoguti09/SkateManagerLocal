import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  PerfilDeportivo,
  CrearPerfilDeportivoDto
} from '../interfaces/perfil-deportivo.interface';

@Injectable({
  providedIn: 'root'
})
export class PerfilesDeportivosService {
  private http = inject(HttpClient);
  private apiUrl = 'https://fempapp-back-production.up.railway.app/perfiles-deportivos';
  //private apiUrl = 'http://localhost:3000/perfiles-deportivos';

  getByUsuario(usuarioId: number): Observable<PerfilDeportivo[]> {
    return this.http.get<PerfilDeportivo[]>(`${this.apiUrl}/usuario/${usuarioId}`);
  }

  create(data: CrearPerfilDeportivoDto): Observable<PerfilDeportivo> {
    return this.http.post<PerfilDeportivo>(this.apiUrl, data);
  }

  update(id: number, data: Partial<CrearPerfilDeportivoDto>): Observable<PerfilDeportivo> {
    return this.http.put<PerfilDeportivo>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}