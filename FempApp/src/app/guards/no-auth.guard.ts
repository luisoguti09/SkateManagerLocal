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

export const noAuthGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    return true;
  }

  const usuario = authService.getUsuario();
  const destino = destinoPorRol(usuario?.rol || null, usuario?.rolId || authService.getRolId());

  return router.createUrlTree([destino]);
};