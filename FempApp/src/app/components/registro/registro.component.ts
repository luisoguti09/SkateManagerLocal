import { Component, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { RegistroService } from '../../services/registro.service';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { CommonModule } from '@angular/common';
import { RegistroFastComponent } from '../registro-fast/registro-fast.component';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';


@Component({
  selector: 'app-registro',
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
    MatListModule,
    MatDividerModule,
    RegistroFastComponent,
    MatSelectModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './registro.component.html',
  styleUrl: './registro.component.scss'
})
export class RegistroComponent {

  public form!: FormGroup;


  private router = inject(Router);
  private http = inject(HttpClient);
  private snack = inject(MatSnackBar);
  private fb = inject(FormBuilder);
  private regServ = inject(RegistroService);
  
  public empadronada: string = "";
  public pers: any;
  public roles: any[] = [];
  public errorMsg: string = '';
  public successMsg: string = '';
  public cargando: boolean = false;
  public cargandoBuscar = false;
  loading = false;


  ngOnInit() {
    this.form = this.fb.group({
      nombre: new FormControl('', [Validators.required]),
      edad: new FormControl(0),
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', [Validators.required]),
      confirmPass: new FormControl('', [Validators.required]),
      dni: new FormControl('', [Validators.required]),
      rolId: new FormControl(null, [Validators.required]),
      categoria: [{ value: '', disabled: true }],
    nivel:     [{ value: '', disabled: true }],
    });

    this.regServ.getRoles().subscribe({
      next: res => this.roles = res,
      error: err => console.log('Error al obtener roles', err)
    });

     this.form.get('rolId')!.valueChanges.subscribe(rolId => this.configurarPorRol(rolId));
  }

  private configurarPorRol(rolId: number) {
  const categoria = this.form.get('categoria')!;
  const nivel = this.form.get('nivel')!;

  categoria.clearValidators(); categoria.disable(); categoria.setValue('');
  nivel.clearValidators();     nivel.disable();     nivel.setValue('');


  const deportista = 1; 
  const administrador      = 2; 
  const tecnico    = 3; 

  if (rolId === deportista) {
    categoria.enable();
    categoria.setValidators([Validators.required]);
  } else if (rolId === tecnico) {
    nivel.enable();
    nivel.setValidators([Validators.required]);
  }

  categoria.updateValueAndValidity({ emitEvent: false });
  nivel.updateValueAndValidity({ emitEvent: false });
}

  verificarPass() {
    if (this.form?.get('password')?.value == this.form?.get('confirmPass')?.value) {
      return true;
    } else {
      error: (e: { error: { error: any; }; }) => {
        console.log(e.error.error);
      };
      return false;
    }
  }

  buscar() {
  const dni = this.form.get('dni')?.value?.toString().trim();
  if (!dni) return;

  this.errorMsg = '';
  this.successMsg = '';
  this.cargandoBuscar = true;

  this.regServ.buscar(dni).subscribe({
    next: ({ padron, usuario }) => {
      this.pers = padron || null;

      if (usuario) {          // ya existe cuenta con ese DNI
        this.empadronada = '';
        this.errorMsg = 'Ya existe una cuenta con ese DNI.';
        return;
      }

      this.empadronada = padron ? 'EMPADRONADA' : 'NO_EMPADRONADA';
    },
    error: () => this.errorMsg = 'No se pudo buscar el DNI.',
    complete: () => this.cargandoBuscar = false
  });
}

  

  guardar() {
  this.errorMsg = '';
  this.successMsg = '';
  this.cargando = true;

  const esEmpadronada = this.empadronada !== 'NO_EMPADRONADA';
  const rolId = this.form.get('rolId')?.value;
   const deportista = 2;
  const tecnico    = 3;

  const payload: any = {
    nombre:  esEmpadronada ? this.pers?.apellidoYNombre : this.form.get('nombre')?.value,
    edad:    esEmpadronada ? 14 : this.form.get('edad')?.value,   // poné la lógica real si aplica
    email:   this.form.get('email')?.value,
    password:this.form.get('password')?.value,
    dni:     esEmpadronada ? this.pers?.documentoN : this.form.get('dni')?.value,
    rolId
  };

  // Campos condicionales por rol
  if (rolId === deportista) payload.categoria = this.form.get('categoria')?.value;
  if (rolId === tecnico)    payload.nivel     = this.form.get('nivel')?.value;

  // (Opcional) validación simple de pass
  if (this.form.get('password')?.value !== this.form.get('confirmPass')?.value) {
    this.cargando = false;
    this.errorMsg = 'Las contraseñas no coinciden.';
    return;
  }

  this.regServ.guardar(payload)
    .pipe(finalize(() => this.cargando = false))
    .subscribe({
      next: () => {
        this.successMsg = 'Registro exitoso. Serás redirigido al login.';
        setTimeout(() => {
          this.successMsg = '';
          this.router.navigate(['']);
        }, 2000);
      },
      error: (e) => {
        
        this.errorMsg = e?.error?.message || e?.error?.error || 'Ocurrió un error al registrar.';
      }
    });
  }



}
  

