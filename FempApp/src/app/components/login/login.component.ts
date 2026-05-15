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
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'] 
})
export class LoginComponent implements OnInit {

  private loginService = inject(LoginService);
  private router = inject (Router);
  private fb = inject(FormBuilder);
  private regService = inject(RegistroService);
  private authService = inject(AuthService);

  public form!: FormGroup;

  ngOnInit( ) {
  this.form = this.fb.group({
    forms: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required])
  });
  console.log('Form creado');
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

      const rolId = res?.rolId ?? res?.usuario?.rolId ?? this.authService.getRolId();
const target =
  rolId === 2 ? '/admin' :       // administrador
  rolId === 3 ? '/tecnico' :     // futuro panel técnico
                '/perfil';       // deportista

this.router.navigate([target]);
      console.log('Usuario logueado:', res.usuario); // <- ya es el objeto

      const role = res.usuario.rol;
      if (role === 'deportista') {
        this.router.navigate(['dashboard-deport']);
      } else if (role === 'administrador') {
        this.router.navigate(['dashboard-admin']);
      } else if (role === 'tecnico') {
        this.router.navigate(['dashboard-tecnico']);
      }
    },
    error: (e) => {
      console.error('Login fallido:', e.error?.error || e.message);
    }
  });
}

  /*login() {
    this.authService.login(
      this.form?.get('email')?.value, 
      this.form?.get('password')?.value)
      .subscribe({
        next: (res) => {
          this.loginService.loggedUser = res;
          // token
            const role = res.usuario.rol;
            if (role === 'deportista') {
            this.router.navigate(['dashboard-deport']);
            } else if (role === 'administrador') {
            this.router.navigate(['dashboard-admin']);
            } else if (role === 'tecnico') {
            this.router.navigate(['dashboard-tecnico']);
            }          
          console.log(res);
        },
        error: (e) => {
          //mostrar mensaje de error sacandolo de error
          console.log(e.error.error);
        }
      });
  }*/
}
