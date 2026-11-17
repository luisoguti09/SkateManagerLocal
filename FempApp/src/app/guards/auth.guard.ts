import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { map, switchMap, catchError, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../environments/environment';
export const authGuard: CanActivateFn = (route,state) => {
  const auth=inject(AuthService),router=inject(Router),http=inject(HttpClient);
  if(!auth.isLoggedIn())return router.createUrlTree(['/login']);
  return auth.refreshSession().pipe(switchMap(res=>{
    if(res.usuario.estado!=='aprobado')return of(router.createUrlTree(['/mi-solicitud']));
    const roles=route.data?.['roles'] as string[] | undefined;
    if(roles?.length && !roles.includes(res.usuario.rol))return of(router.createUrlTree(['/mi-solicitud']));
    if(!['deportista','delegado','tecnico'].includes(res.usuario.rol)||/^\/(licencia|perfil|mi-solicitud)(?:[/?]|$)/.test(state.url))return of(true);
    return http.get<any>(environment.SERVER_API.replace(/\/$/,'')+'/licencias-anuales/mia',{headers:{Authorization:'Bearer '+auth.getToken()}}).pipe(map(r=>r.requierePago?router.createUrlTree([state.url.startsWith('/dashboard-deport/mis-datos')?'/perfil':'/licencia'],{queryParams:{temporada:r.temporada}}):true),catchError(()=>of(router.createUrlTree(['/licencia']))));
  }),catchError(()=>of(router.createUrlTree(['/login']))));
};
export const sessionGuard: CanActivateFn = () => {
  const auth=inject(AuthService),router=inject(Router);
  return auth.isLoggedIn() || router.createUrlTree(['/login']);
};
