import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { PerfilEditable } from '../interfaces/PerfilEditable';

@Injectable({
  providedIn: 'root'
})
export class UsuariosService {
  private apiUrl = environment.SERVER_API;
  private http = inject(HttpClient);

  

  subirFotoPerfil(dni: string, formData: FormData): Observable<{ url: string }> {
    return this.http.post<{ url: string }>(`${this.apiUrl}/usuarios/${dni}/fotoPerfil`, formData);
  }

  eliminarFotoPerfil(dni: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/usuarios/${dni}/fotoPerfil`);
  }

  updatePerfilUsuarios(dni: string, payload: any) {
    return this.http.put(`${this.apiUrl}/usuarios/${dni}/perfil`, payload);
  }

  updatePerfilUsuario(payload: PerfilEditable) {
    const dni = payload.dni;
    return this.http.put(`${this.apiUrl}/usuarios/${dni}/perfil`, payload);
  }

  /*getQrPng(userId: number) {
    const token = localStorage.getItem('auth_token') || '';
    return this.http.get(`${this.apiUrl}/usuarios/${userId}/qr.png`, {
      responseType: 'blob',
      headers: { Authorization: `Bearer ${token}` }
    });
  }
  
  renovarQr(userId: number) {
    const token = localStorage.getItem('auth_token') || '';
    return this.http.post<{ token: string }>(
      `${this.apiUrl}/usuarios/${userId}/qr`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
  }*/
 
  generar(uid: number) { 
    return this.http.post<{ token: string }>(`${this.apiUrl}/usuarios/${uid}/qr`, {});
  }

  urlPng(uid: number) {
    return `${this.apiUrl}/usuarios/${uid}/qr.png`;
  }

  getQrPng(id: number, transparent = true) {
  return this.http.get(`${this.apiUrl}/usuarios/${id}/qr.png`, {
    responseType: 'blob',
    params: { transparent: transparent ? '1' : '0' }
  });
}



  solicitarRol(id: number, rol: 'tecnico' | 'deportista') {
    return this.http.post(`${environment.SERVER_API}/usuarios/${id}/solicitar-rol`, { rol });
  }

  aprobarUsuario(id: number, aprobar = true) {
    return this.http.patch(`${this.apiUrl}/usuarios/${id}/aprobar`, { aprobar });
  }

  listarTodos() {
    return this.http.get<any[]>(`${this.apiUrl}/usuarios`);
  }

  getUsuariosPendientes() {
  return this.http.get<any[]>(`${this.apiUrl}/usuarios`, { params: { aprobado: 'false' }});
}


}
