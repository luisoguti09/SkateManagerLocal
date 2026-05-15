// src/app/services/registro.service.ts
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
  categoria?: string; // solo deportista
  nivel?: string;     // solo técnico
}

@Injectable({ providedIn: 'root' })
export class RegistroService {
  private http = inject(HttpClient);
  private apURL = environment.SERVER_API; 


  buscar(dni: string) {
    return forkJoin({
      padron: this.http.get(`${this.apURL}/padron/${dni}`).pipe(
        catchError(err => err.status === 404 ? of(null) : throwError(() => err))
      ),
      usuario: this.http.get(`${this.apURL}/usuarios/dni/${dni}`).pipe(
        catchError(err => err.status === 404 ? of(null) : throwError(() => err))
      )
    });
  }

  /** Registrar usuario con payload (opcional: categoria/nivel según rol) */
  guardar(payload: RegistroPayload) {
    return this.http.post(`${this.apURL}/auth/register`, payload);
  }

  /** Compatibilidad temporal (si algo del front viejo sigue llamando con params sueltos) */
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
}



 