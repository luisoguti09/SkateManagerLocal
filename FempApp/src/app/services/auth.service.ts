import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { PerfilEditable } from '../interfaces/PerfilEditable';
import { BehaviorSubject } from 'rxjs';

type RolNombre = 'administrador' | 'tecnico' | 'deportista' | 'tesoreria';

const ROLE_BY_ID: Record<number, RolNombre> = {
  1: 'deportista',
  2: 'administrador',
  3: 'tecnico',
  4: 'tecnico', // juez: compatibilidad vigente en el backend
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

        if (res?.token && rolId && res?.usuario) {
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
        }
      }),
      catchError(err => {
        console.error('Error en login completo:', err);
        console.error('Status:', err?.status);
        console.error('Message:', err?.message);
        console.error('URL:', err?.url);
        console.error('Error body:', err?.error);

        return throwError(() => err);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.rolKey);
    localStorage.removeItem('user_rol_nombre');
    this.setLoggedUser(null);
    localStorage.removeItem('usuarioId');
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


  getRolNombre(): RolNombre | undefined {
    const u = this.getUsuario();
    if (!u) return undefined;
    const nombre = String(u.rol ?? '').trim().toLowerCase();
    const aliases: Record<string, RolNombre> = {
      admin: 'administrador', administrador: 'administrador',
      auditor: 'tecnico', tecnico: 'tecnico', juez: 'tecnico',
      deportista: 'deportista', tesorero: 'tesoreria', tesoreria: 'tesoreria'
    };
    // Un nombre explícito prevalece sobre el ID; uno desconocido no otorga permisos.
    return nombre ? aliases[nombre] : ROLE_BY_ID[Number(u.rolId)];
  }

  // ¿tiene exactamente este rol?
  hasRole(role: RolNombre | string): boolean {
    const current = this.getRolNombre();
    if (!current) return false;
    return current.toLowerCase() === String(role).toLowerCase();
  }

  // ¿tiene cualquiera de estos roles?
  hasAnyRole(roles: (RolNombre | string)[]): boolean {
    const current = this.getRolNombre();
    if (!current) return false;
    return roles.some(r => current.toLowerCase() === String(r).toLowerCase());
  }


}
