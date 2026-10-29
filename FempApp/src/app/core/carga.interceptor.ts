import { Injectable, inject, signal } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { defer, finalize } from 'rxjs';
import { environment } from '../../environments/environment';
@Injectable({ providedIn: 'root' })
export class CargaApiService { readonly pendientes = signal(0); }
export const cargaInterceptor: HttpInterceptorFn = (req, next) => {
  const carga = inject(CargaApiService);
  const base = new URL(environment.SERVER_API, window.location.origin);
  const target = new URL(req.url, window.location.origin);
  const path = base.pathname.replace(/\/$/, '');
  if (target.origin !== base.origin || !(target.pathname === path || target.pathname.startsWith(path + '/'))) return next(req);
  return defer(() => {
    carga.pendientes.update(n => n + 1);
    return next(req).pipe(finalize(() => carga.pendientes.update(n => Math.max(0, n - 1))));
  });
};
