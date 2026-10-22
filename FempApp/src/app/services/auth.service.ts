import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { PerfilEditable } from '../interfaces/PerfilEditable';
import { BehaviorSubject } from 'rxjs';

type RolNombre = 'administrador' | 'tecnico' | 'juez' | 'deportista' | 'tesoreria';

const ROLE_BY_ID: Record<number, RolNombre> = {
  1: 'deportista',
  2: 'administrador',
  3: 'tecnico',
  4: 'juez',
  5: 'tesoreria'
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
        const rolId = res?.rolId || res?.usuario?.rolId;

        if (res?.token && rolId && ['pendiente','requiere_correcciones','aprobado'].includes(res?.usuario?.estado) && this.tokenVigente(res.token)) {
          localStorage.setItem(this.tokenKey, res.token);
          localStorage.setItem(this.rolKey, String(rolId));
          localStorage.setItem('user_rol_nombre', res.usuario?.rol || '');

          const usuarioNormalizado = {
            ...res.usuario,
            rolId
          };

          localStorage.setItem('usuario', JSON.stringify(usuarioNormalizado));

          this.loggedUser = usuarioNormalizado;
          this.setLoggedUser(this.normalizeFoto(usuarioNormalizado));
        } else {
          this.clearSession();
          throw new Error('Respuesta de acceso inválida');
        }
      }),
      catchError(err => {
        this.clearSession();
        return throwError(() => err);
      })
    );
  }

  refreshSession(): Observable<any> {
    return this.http.get<any>(`${this.apiURL}/auth/me`, {headers: {Authorization: `Bearer ${this.getToken() || ''}`}}).pipe(
      tap(res => this.setUsuario(res.usuario))
    );
  }

  clearSession(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.rolKey);
    localStorage.removeItem('user_rol_nombre');
    this.setLoggedUser(null);
    localStorage.removeItem('usuarioId');
  }

  logout(): void {
    this.clearSession();
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


  // Comprobación de vencimiento para la interfaz. La firma y el estado se validan en el servidor.
  private tokenVigente(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      const segment = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(segment.padEnd(Math.ceil(segment.length / 4) * 4, '=')));
      return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
    } catch { return false; }
  }

  isLoggedIn(): boolean {
    const token = localStorage.getItem(this.tokenKey);
    const usuario = this.readUserFromStorage();
    if (token && this.tokenVigente(token) && ['pendiente','requiere_correcciones','aprobado'].includes(usuario?.estado)) return true;
    this.clearSession();
    return false;
  }

  getToken(): string | null {
    return this.isLoggedIn() ? localStorage.getItem(this.tokenKey) : null;
  }

  getRol(): string | null {
    return localStorage.getItem(this.rolKey);
  }

  getRolId(): number | null {
    const rolId = localStorage.getItem(this.rolKey);
    return rolId ? parseInt(rolId, 10) : null;
  }


  getRolNombre(): RolNombre | undefined {
    const u = this.getUsuario();
    if (!u) return undefined;
    const nombre = String(u.rol ?? '').trim().toLowerCase();
    const aliases: Record<string, RolNombre> = {
      admin: 'administrador', administrador: 'administrador',
      auditor: 'tecnico', tecnico: 'tecnico', juez: 'juez',
      deportista: 'deportista', tesorero: 'tesoreria', tesoreria: 'tesoreria'
    };
    // Un nombre explícito prevalece sobre el ID; uno desconocido no otorga permisos.
    return nombre ? aliases[nombre] : ROLE_BY_ID[Number(u.rolId)];
  }

  // ¿tiene exactamente este rol?
  hasRole(role: RolNombre | string): boolean {
    if(this.getUsuario()?.estado !== 'aprobado') return false;
    const current = this.getRolNombre();
    if (!current) return false;
    return current.toLowerCase() === String(role).toLowerCase();
  }

  // ¿tiene cualquiera de estos roles?
  hasAnyRole(roles: (RolNombre | string)[]): boolean {
    if(this.getUsuario()?.estado !== 'aprobado') return false;
    const current = this.getRolNombre();
    if (!current) return false;
    return roles.some(r => current.toLowerCase() === String(r).toLowerCase());
  }


}
