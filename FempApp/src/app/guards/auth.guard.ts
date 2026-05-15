import { Injectable } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const usuario = authService.getUsuario();
  console.log('[authGuard] usuario recuperado:', usuario);

  if (usuario) {
    // Restaurar en memoria por si no está seteado
    authService.loggedUser = usuario;
    return true;
  }

  router.navigate(['/login']);
  return false;
};

