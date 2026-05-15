import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { PerfilEditable } from '../interfaces/PerfilEditable';
import { BehaviorSubject } from 'rxjs';

type RolNombre = 'administrador' | 'tecnico' | 'deportista';

const ROLE_BY_ID: Record<number, RolNombre> = {
  1: 'deportista',
  2: 'administrador',
  3: 'tecnico',
};

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiURL = environment.SERVER_API;
  private http = inject(HttpClient);
  private router = inject(Router);
  private usuario: any;
  private tokenKey = 'auth_token';
  private rolKey = 'user_rol';
  public loggedUser: any = null;
  private readUserFromStorage(): any | null {
    const raw = localStorage.getItem('usuario');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed?.dni ? parsed : null;
    } catch { return null; }
  }
  private setLoggedUser(user: any | null) {
    this.loggedUser = user;
    if (user) {
      localStorage.setItem('usuario', JSON.stringify(user));
    } else {
      localStorage.removeItem('usuario');
    }
    this._user$.next(user);
  }

  // Usá this.apiURL en lugar de un host fijo
  private normalizeFoto(user: any) {
    if (user?.fotoPerfil && !/^https?:\/\//i.test(user.fotoPerfil)) {
      return { ...user, fotoPerfil: `${this.apiURL}/${user.fotoPerfil}` };
    }
    return user;
  }

  private _user$ = new BehaviorSubject<any | null>(
    this.normalizeFoto(this.readUserFromStorage())
  );
  public user$ = this._user$.asObservable();

  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiURL}/auth/login`, { email, password }).pipe(
      tap((res) => {
        if (res.token && res.rolId) {
          localStorage.setItem(this.tokenKey, res.token);
          localStorage.setItem(this.rolKey, res.rolId);
          localStorage.setItem('usuario', JSON.stringify(res.usuario));

          this.loggedUser = res.usuario;
          this.setLoggedUser(this.normalizeFoto(res.usuario));
        }
      }),
      catchError(err => {
        console.error('Error en login completo:', err);
        console.error('Status:', err?.status);
        console.error('Message:', err?.message);
        console.error('URL:', err?.url);
        console.error('Error body:', err?.error);
        return of(null);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.rolKey);
    this.loggedUser = null;
    this.router.navigate(['/login']);
  }

  setUsuario(usuario: any) {
    this.setLoggedUser(this.normalizeFoto(usuario));
  }

  getUsuario(): any {
    if (!this.loggedUser) {
      const usuarioGuardado = localStorage.getItem('usuario');
      if (usuarioGuardado) {
        try {
          const parsed = JSON.parse(usuarioGuardado);
          if (parsed?.dni) {
            this.loggedUser = parsed;
          } else {
            return null;
          }
        } catch {
          return null;
        }
      }
    }
    return this.loggedUser?.dni ? this.loggedUser : null;
  }




  updatePerfilUsuario(payload: PerfilEditable) {
    const dni = payload.dni;
    return this.http.put(`${this.apiURL}/usuarios/${dni}/perfil`, payload);
  }



  getPerfilUsuario(dni: string): Observable<PerfilEditable> {
    return this.http.get<PerfilEditable>(`${this.apiURL}/usuarios/${dni}/perfil`);
  }


  isLoggedIn(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getRol(): string | null {
    return localStorage.getItem(this.rolKey);
  }

  getRolId(): number | null {
    const rolId = localStorage.getItem(this.rolKey);
    return rolId ? parseInt(rolId, 10) : null;
  }


  private getCurrentRole(): RolNombre | undefined {
    const u = this.getUsuario();
    if (!u) return undefined;
    // soporta 'rol' como string o 'rolId' numérico
    return (u.rol as RolNombre) ?? (u.rolId != null ? ROLE_BY_ID[u.rolId] : undefined);
  }

  // ¿tiene exactamente este rol?
  hasRole(role: RolNombre | string): boolean {
    const current = this.getCurrentRole();
    if (!current) return false;
    return current.toLowerCase() === String(role).toLowerCase();
  }

  // ¿tiene cualquiera de estos roles?
  hasAnyRole(roles: (RolNombre | string)[]): boolean {
    const current = this.getCurrentRole();
    if (!current) return false;
    return roles.some(r => current.toLowerCase() === String(r).toLowerCase());
  }



}

