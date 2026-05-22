import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { Deportist } from '../interfaces/deportist';
import { catchError, map, tap } from "rxjs/operators";
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DeportistService {

  private apURL = environment.SERVER_API;
  private http = inject(HttpClient);

  mostrarDeportist() {
    return this.http.get(`${this.apURL}/Padron`);
  }

  getDeportistas(): Observable<Deportist[]> {
    return this.http.get<Deportist[]>(`${this.apURL}/Padron`)
      .pipe(
        tap(data => {
          console.log('Datos recibidos:', data);
        }),
        catchError(error => {
          console.error('Error al obtener deportistas:', error);
          return of([]);
        })
      );
  }

  buscarDni(dni: string) {
    return this.http.get(`${this.apURL}/usuarios/${dni}`);
  }

  addDeportist(deportist: Deportist): Observable<Deportist> {
    return this.http.post<Deportist>(`${this.apURL}/Padron`, deportist);
  }

  updateDeportist(deportist: Deportist): Observable<Deportist> {
    return this.http.put<Deportist>(`${this.apURL}/Padron`, deportist);
  }

  deleteDeportist(id: number): Observable<Deportist> {
    return this.http.delete<Deportist>(`${this.apURL}/Padron/${id}`);
  }

  getDeportistById(id: number): Observable<Deportist[]> {
    return this.http.get<Deportist[]>(`${this.apURL}/Padron?id=${id}`);
  }

 getDeportistByDni(dni: string): Observable<Deportist[]> {
  return this.http.get<Deportist[]>(`${this.apURL}/Padron?dni=${dni}`);
}


  getDeportistByNombre(nombre: string): Observable<Deportist[]> {
    return this.http.get<Deportist[]>(`${this.apURL}/Padron?nombre=${nombre}`);
  }

  getDeportistByApellidos(apellidos: string): Observable<Deportist[]> {
    return this.http.get<Deportist[]>(`${this.apURL}/Padron?apellidos=${apellidos}`);
  }

 subirFotoPerfil(dni: string, formData: FormData): Observable<any> {
  return this.http.post(`${this.apURL}/usuarios/${dni}/fotoPerfil`, formData)
    .pipe(
      tap(response => {
        console.log('Foto de perfil cargada:', response);
      }),
      catchError(error => {
        console.error('Error al cargar la foto de perfil:', error);
        return of(null);
      })
    );
}

obtenerFotoPerfil(dni: string): Observable<any> {
  return this.http.get(`${this.apURL}/usuarios/${dni}/fotoPerfil`, { responseType: 'blob' });
}

eliminarFotoPerfil(dni: string): Observable<any> {
  return this.http.delete(`${this.apURL}/usuarios/${dni}/fotoPerfil`)
    .pipe(
      tap(response => {
        console.log('Foto de perfil eliminada:', response);
      }),
      catchError(error => {
        console.error('Error al eliminar la foto de perfil:', error);
        return of(null);
      })
    );
}
  evaluarElemento(data: any): Observable<any> {
    return this.http.post(`${this.apURL}/evaluaciones`, data).pipe(
      catchError(err => {
        console.error('Error al registrar evaluación', err);
        return of(null);
      })
    );
  }

  getAll(): Observable<Deportist[]> {
    return this.getDeportistas();
  }
} 

