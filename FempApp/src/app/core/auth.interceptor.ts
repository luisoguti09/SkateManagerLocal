
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {

  const auth = inject(AuthService);
  const token = auth.getToken();


  const base = new URL(environment.SERVER_API, window.location.origin);
  const target = new URL(req.url, window.location.origin);
  const path = base.pathname.replace(/\/$/, '');
  const esApi = target.origin === base.origin && (target.pathname === path || target.pathname.startsWith(path + '/'));
  if (token && esApi) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};


