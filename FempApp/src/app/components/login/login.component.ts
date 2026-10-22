import { Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login', standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatCardModule,
    MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);
  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });
  cargando = false;
  errorMsg = '';
  estado: 'pendiente' | 'bloqueado' | null =
    this.route.snapshot.queryParamMap.get('estado') === 'pendiente' ? 'pendiente' : null;

  constructor() {
    // La pantalla informativa no habilita ninguna sesión ni verifica aprobación por URL.
    if (this.estado) this.auth.clearSession();
  }

  volverAlIngreso(): void {
    this.estado = null;
    this.errorMsg = '';
    this.form.controls.password.reset();
    void this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
  }

  login(): void {
    if (this.cargando) return;
    this.form.controls.email.setValue(this.form.controls.email.value.trim());
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.errorMsg = '';
    this.cargando = true;
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.cargando = false)
    ).subscribe({
      next: () => {
        if (this.auth.getUsuario()?.estado !== 'aprobado') { void this.router.navigate(['/mi-solicitud']); return; }
        const destinos: Record<string, string> = {
          administrador: '/dashboard-admin', tecnico: '/dashboard-prof', juez: '/dashboard-juez',
          deportista: '/dashboard-deport', tesoreria: '/dashboard-tesoreria'
        };
        const destino = destinos[this.auth.getRolNombre() ?? ''];
        if (destino) void this.router.navigate([destino]);
        else {
          this.auth.clearSession();
          this.errorMsg = 'Tu cuenta no tiene un rol habilitado. Contactá a la Federación.';
        }
      },
      error: e => {
        this.form.controls.password.reset();
        if (e.status === 403 && e.error?.code === 'ACCOUNT_PENDING_APPROVAL') {
          this.estado = 'pendiente';
        } else if (e.status === 403 && e.error?.code === 'ACCOUNT_BLOCKED') {
          this.estado = 'bloqueado';
        } else {
          this.errorMsg = e.status === 400 || e.status === 401
            ? 'Email o contraseña incorrectos.'
            : 'No se pudo iniciar sesión. Intentá nuevamente.';
        }
      }
    });
  }
}
