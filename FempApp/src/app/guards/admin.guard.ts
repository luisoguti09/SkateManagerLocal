import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const u = auth.getUsuario(); 

  const isAdmin =
    (u?.rol && u.rol.toLowerCase() === 'administrador') ||
    (u?.rolId === 2);

  if (isAdmin) return true;

  
  return router.createUrlTree(['/']);
};
