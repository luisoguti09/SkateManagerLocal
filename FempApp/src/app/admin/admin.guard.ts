// src/app/admin/admin.guard.ts (functional)
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const AdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const rolId = auth.getUsuario()?.rolId ?? auth.getRolId();
  if (rolId === 2) return true;
  router.navigate(['/login']);
  return false;
};
