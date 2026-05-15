import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AsistenciasListService {

  private apiURL = environment.SERVER_API;
  private http = inject(HttpClient);
  private router = inject(Router);
  private base = `${this.apiURL}/asistencias`;

  constructor() { }


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
