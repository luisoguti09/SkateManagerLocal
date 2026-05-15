import { Injectable } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const noAuthGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    const rol = authService.getRol();
    switch (rol) {
      case '1':
        router.navigate(['/dashboard-deport']);
        break;
      case '2':
        router.navigate(['/dashboard-admin']);
        break;
      case '3':
        router.navigate(['/dashboard-tecnico']);
        break;
      default:
        router.navigate(['/login']);
        break;
    }
    return false;
  }

  return true;
};
