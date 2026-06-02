import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface RegistroPayload {
  nombre: string;
  edad: number;
  email: string;
  password: string;
  dni: string | number;
  rolId: number;
  categoria?: string;
  nivel?: string;
  clubId?: number | null;
  club?: string | null;
}

@Injectable({ providedIn: 'root' })
export class RegistroService {
  private http = inject(HttpClient);
  private apURL = environment.SERVER_API;

  buscar(dni: string) {
    const dniNormalizado = String(dni || '').replace(/\D/g, '');

    return forkJoin({
      padron: this.http.get(`${this.apURL}/Padron/${dniNormalizado}`).pipe(
        catchError(err => err.status === 404 ? of(null) : throwError(() => err))
      ),
      usuario: this.http.get(`${this.apURL}/usuarios/dni/${dniNormalizado}`).pipe(
        catchError(err => err.status === 404 ? of(null) : throwError(() => err))
      )
    });
  }

  guardar(payload: RegistroPayload) {
    return this.http.post(`${this.apURL}/auth/register`, payload);
  }

  guardarCompat(
    nombre: string,
    edad: number,
    email: string,
    password: string,
    dni: string,
    rolId: number
  ) {
    return this.guardar({ nombre, edad, email, password, dni, rolId });
  }

  getRoles() {
    return this.http.get<any[]>(`${this.apURL}/roles`);
  }

  getClubes() {
    return this.http.get<any[]>(`${this.apURL}/clubes`);
  }
}


