import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

function destinoPorRol(rol: string | undefined): string {
  const destinos: Record<string, string> = {
    administrador: '/dashboard-admin',
    tecnico: '/dashboard-tecnico',
    deportista: '/dashboard-deport',
    tesoreria: '/dashboard-tesoreria'
  };
  return rol ? destinos[rol] ?? '/login' : '/login';
}

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const usuario = authService.getUsuario();

  console.log('[authGuard] usuario recuperado:', usuario);

  if (!authService.isLoggedIn() || !usuario) {
    return router.createUrlTree(['/login']);
  }

  authService.loggedUser = usuario;

  const rolesPermitidos = route.data?.['roles'] as string[] | undefined;

  if (!rolesPermitidos || rolesPermitidos.length === 0) {
    return true;
  }

  const rolUsuario = authService.getRolNombre() ?? '';

  const autorizado = rolesPermitidos
    .map(r => String(r).trim().toLowerCase())
    .includes(rolUsuario);

  if (autorizado) {
    return true;
  }

  console.warn('[authGuard] Rol no autorizado:', {
    url: state.url,
    rolUsuario,
    rolesPermitidos
  });

  return router.createUrlTree([
    destinoPorRol(authService.getRolNombre())
  ]);
};
