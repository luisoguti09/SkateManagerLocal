import { Component, Inject, inject, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { FormControl, Validators, FormsModule, ReactiveFormsModule, FormGroup, FormBuilder } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { LoginService } from '../../services/login.service';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { RegistroService } from '../../services/registro.service';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';



@Component({
  selector: 'app-login',
  standalone: true,

  imports: [
    CommonModule,
    MatCardModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    MatButtonModule,
    RouterOutlet,
    RouterLink,
    MatSnackBarModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  private loginService = inject(LoginService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private regService = inject(RegistroService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  public form!: FormGroup;

  ngOnInit() {
    this.form = this.fb.group({
      forms: new FormControl('', [Validators.required]),
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', [Validators.required])
    });
    console.log('Form creado');
  }

  obtenerRolPorId(rolId: number | null): string {
    const roles: Record<number, string> = {
      1: 'deportista',
      2: 'administrador',
      3: 'tecnico',
      4: 'tesoreria'
    };

    return rolId ? roles[Number(rolId)] || '' : '';
  }

  login() {
    this.authService.login(
      this.form?.get('email')?.value,
      this.form?.get('password')?.value
    ).subscribe({
      next: (res) => {
        if (!res || !res.usuario) {
          console.error('Respuesta de login inválida:', res);
          return;
        }

        const usuario = res.usuario;

        console.log('Usuario logueado:', usuario);
        console.log('[LOGIN] usuario.rol crudo:', usuario?.rol);
        console.log('[LOGIN] usuario.rolId crudo:', usuario?.rolId);
        console.log('[LOGIN] res.rolId crudo:', res?.rolId);
        console.log('[LOGIN] authService.getRolId():', this.authService.getRolId());

        const rol = String(
          usuario?.rol ||
          this.obtenerRolPorId(res?.rolId || usuario?.rolId || this.authService.getRolId())
        ).trim().toLowerCase();

        switch (rol) {
          case 'administrador':
            this.router.navigate(['/dashboard-admin']);
            break;

          case 'tecnico':
            this.router.navigate(['/dashboard-tecnico']);
            break;

          case 'deportista':
            this.router.navigate(['/dashboard-deport']);
            break;

          case 'tesoreria':
            console.log('[LOGIN] navegando a dashboard-tesoreria');
            this.router.navigate(['/dashboard-tesoreria']).then(ok => {
              console.log('[LOGIN] navegación tesorería resultado:', ok);
            });
            break;

          default:
            console.warn('Rol no reconocido:', rol, usuario);
            this.router.navigate(['/login']);
            break;
        }
      },
      error: (e) => {
        console.error('Login fallido:', e);

        if (e.status === 403 && e.error?.code === 'ACCOUNT_PENDING_APPROVAL') {
          this.authService.logout();

          this.snackBar.open(
            e.error?.message || 'Tu cuenta todavía no fue aprobada. Cuando un administrador la habilite, vas a poder ingresar.',
            'Entendido',
            {
              duration: 6000,
              horizontalPosition: 'center',
              verticalPosition: 'top',
              panelClass: ['snackbar-warning']
            }
          );

          this.router.navigate(['/login']);
          return;
        }

        if (e.status === 400 || e.status === 401) {
          this.snackBar.open(
            'Email o contraseña incorrectos.',
            'Cerrar',
            {
              duration: 4000,
              horizontalPosition: 'center',
              verticalPosition: 'top',
              panelClass: ['snackbar-error']
            }
          );
          return;
        }

        this.snackBar.open(
          'No se pudo iniciar sesión. Intentá nuevamente.',
          'Cerrar',
          {
            duration: 4000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['snackbar-error']
          }
        );
      }
    });
  }


}
