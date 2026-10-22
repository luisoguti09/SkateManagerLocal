import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

function destinoPorRol(rol: string | null, rolId: number | null): string {
  const destinos: Record<string,string>={administrador:'/admin',tecnico:'/dashboard-prof',juez:'/dashboard-juez',deportista:'/dashboard-deport',tesoreria:'/dashboard-tesoreria'};
  return destinos[String(rol || '').toLowerCase()] || '/login';
}

export const noAuthGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    return true;
  }

  const usuario = authService.getUsuario();
  if(usuario?.estado!=='aprobado')return router.createUrlTree(['/mi-solicitud']);
  const destino = destinoPorRol(usuario?.rol || null, usuario?.rolId || authService.getRolId());

  return router.createUrlTree([destino]);
};
