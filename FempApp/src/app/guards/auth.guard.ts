import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

function destinoPorRol(rol: string | null, rolId: number | null): string {
  const rolNormalizado = String(rol || '').trim().toLowerCase();

  if (rolNormalizado === 'administrador' || rolId === 2) {
    return '/dashboard-admin';
  }

  if (rolNormalizado === 'tecnico' || rolId === 3) {
    return '/dashboard-tecnico';
  }

  if (rolNormalizado === 'deportista' || rolId === 1) {
    return '/dashboard-deport';
  }

  if (rolNormalizado === 'tesoreria' || rolId === 4) {
    return '/dashboard-tesoreria';
  }

  return '/login';
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

  const rolUsuario = String(usuario.rol || '').trim().toLowerCase();

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
    destinoPorRol(usuario?.rol || null, usuario?.rolId || authService.getRolId())
  ]);
};