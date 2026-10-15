import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { map, catchError, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
export const authGuard: CanActivateFn = route => {
  const auth=inject(AuthService),router=inject(Router);
  if(!auth.isLoggedIn())return router.createUrlTree(['/login']);
  return auth.refreshSession().pipe(map(res=>{
    if(res.usuario.estado!=='aprobado')return router.createUrlTree(['/mi-solicitud']);
    const roles=route.data?.['roles'] as string[] | undefined;
    if(roles?.length && !roles.includes(res.usuario.rol))return router.createUrlTree(['/mi-solicitud']);
    return true;
  }),catchError(()=>of(router.createUrlTree(['/login']))));
};
export const sessionGuard: CanActivateFn = () => {
  const auth=inject(AuthService),router=inject(Router);
  return auth.isLoggedIn() || router.createUrlTree(['/login']);
};
