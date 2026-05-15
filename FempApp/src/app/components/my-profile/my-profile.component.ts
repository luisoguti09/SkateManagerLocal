import { Component, inject, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { DeportistService } from '../../services/deportist.service';
import { PerfilEditable } from '../../interfaces/PerfilEditable';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { UsuariosService } from '../../services/usuarios.service';
import { QrService } from '../../services/qr.service';
import { QrCredencialComponent } from '../qr-credencial/qr-credencial.component';
import { Location as NgLocation } from '@angular/common';
import { PerfilesDeportivosService } from '../../services/perfiles-deportivos.service';
import { CrearPerfilDeportivoDto, PerfilDeportivo } from '../../interfaces/perfil-deportivo.interface';
import { ChangeDetectorRef } from '@angular/core';
import {
  DISCIPLINAS,
  MODALIDADES,
  DIVISIONALES,
  EFICIENCIAS_POR_DIVISIONAL
} from '../../constants/perfil-deportivo.options';



@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatToolbarModule,
    MatButtonModule,
    MatDividerModule,
    QrCredencialComponent,
    MatSnackBarModule,
    MatSelectModule

  ],
  templateUrl: './my-profile.component.html',
  styleUrl: './my-profile.component.scss'
})
export class MyProfileComponent implements OnInit {

  public form!: FormGroup;
  public empadronada: 'EMPADRONADA' | 'NO_EMPADRONADA' = 'NO_EMPADRONADA';
  public usuario: any;
  public pers: any;
  public perfilesDeportivos: PerfilDeportivo[] = [];
  public mostrarFormPerfil: boolean = false;
  public nuevoPerfil: CrearPerfilDeportivoDto = {
    usuarioId: 0,
    disciplina: '',
    licencia: '',
    modalidad: '',
    divisional: '',
    categoria: '',
    temporada: '',
    club: '',
    activa: true
  };
  public disciplinas = DISCIPLINAS;
  public modalidades = MODALIDADES;
  public divisionales = DIVISIONALES;
  public eficiencias: string[] = [];

  readonly snackBar = inject(MatSnackBar);
  private usuariosService = inject(UsuariosService);
  private deportistService = inject(DeportistService);
  private router = inject(Router);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private ngLocation = inject(NgLocation);
  private perfilesService = inject(PerfilesDeportivosService);
  private cd = inject(ChangeDetectorRef);

  constructor() { }

  volver() {
    this.router.navigate(['/dashboard-deport']);
  }

  ngOnInit(): void {

    this.usuario = this.authService.getUsuario();
    this.cargarPerfilesDeportivos();

    this.initForm();
    if (this.usuario?.dni) {
      this.buscarEnPadron(this.usuario.dni);
    }
    console.log('✅ MyProfileComponent inicializado');

    const usuario = this.authService.getUsuario();

    if (usuario?.id) {
      this.perfilesService.getByUsuario(usuario.id).subscribe({
        next: (data) => {
          this.perfilesDeportivos = data;
          console.log('Perfiles deportivos:', data);
        },
        error: (err) => {
          console.error('Error cargando perfiles', err);
        }
      });
    }

  }

  initForm(): void {
    this.form = this.fb.group({
      email: [{ value: '', disabled: true }],
      dni: [{ value: '', disabled: true }],
      nombre: [{ value: '', disabled: true }],
      club: [''],
      categoria: [''],
      nivel: [''],
      domicilio: [''],
      telefono: [''],
      fechaNacimiento: [''],
      instagram: [''],
      facebook: [''],
      tiktok: ['']
    });

  }

  eliminarPerfil(id: number): void {
    if (!confirm('¿Eliminar este perfil deportivo?')) return;

    this.perfilesService.delete(id).subscribe({
      next: () => {
        // eliminar del estado LOCAL (clave)
        this.perfilesDeportivos = this.perfilesDeportivos.filter(p => p.id !== id);
        this.cd.detectChanges();

        this.snackBar.open('Perfil eliminado correctamente', 'Cerrar', {
          duration: 2000
        });
      },
      error: (err) => {
        console.error('Error eliminando perfil:', err);

        this.snackBar.open('No se pudo eliminar el perfil', 'Cerrar', {
          duration: 2500
        });
      }
    });
  }

  crearPerfil(): void {
    const usuario = this.authService.getUsuario();
    if (!usuario?.id) return;

    const payload: CrearPerfilDeportivoDto = {
      ...this.nuevoPerfil,
      usuarioId: usuario.id
    };

    console.log('Payload perfil deportivo:', payload);

    this.perfilesService.create(payload).subscribe({
      next: (perfilCreado) => {
        this.perfilesDeportivos = [
          ...this.perfilesDeportivos,
          perfilCreado
        ];

        this.nuevoPerfil = {
          usuarioId: 0,
          disciplina: '',
          licencia: '',
          modalidad: '',
          divisional: '',
          categoria: '',
          temporada: '',
          club: '',
          activa: true
        };

        this.eficiencias = [];

        this.mostrarFormPerfil = false;

        this.cd.detectChanges();

        this.snackBar.open('Perfil creado correctamente', 'Cerrar', {
          duration: 2000
        });
      },
      error: (err) => {
        console.error('Error creando perfil deportivo:', err);

        this.snackBar.open(
          'No se pudo crear el perfil deportivo',
          'Cerrar',
          { duration: 3000 }
        );
      }
    });
  }

  trackByPerfilId(index: number, perfil: PerfilDeportivo): number {
    return perfil.id;
  }

  refrescarVista(): void {
    const currentUrl = this.router.url;

    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate([currentUrl]);
    });
  }

  onDivisionalChange(divisional: string): void {
    const key = divisional as keyof typeof EFICIENCIAS_POR_DIVISIONAL;

    this.eficiencias = EFICIENCIAS_POR_DIVISIONAL[key] || [];
    this.nuevoPerfil.categoria = '';
  }

  cargarPerfilesDeportivos(): void {
    const usuario = this.authService.getUsuario();
    if (!usuario?.id) return;

    this.perfilesService.getByUsuario(usuario.id).subscribe({
      next: (data) => {
        this.perfilesDeportivos = [...data]; // 👈 CLAVE (nueva referencia)
        console.log('Perfiles deportivos:', data);
      },
      error: (err) => {
        console.error('Error cargando perfiles:', err);
      }
    });
  }

  buscarEnPadron(dni: string): void {
    this.deportistService.getDeportistByDni(dni).subscribe({
      next: (res) => {
        // 1) Siempre limpiamos el form para no arrastrar valores previos
        this.form.reset({
          email: '',
          dni: '',
          nombre: '',
          club: '',
          categoria: '',
          nivel: '',
          domicilio: '',
          telefono: ''
        });

        // 2) Si no hay respuesta, no está empadronada
        const padron = Array.isArray(res)
          ? res.find((x: any) => String(x?.documentoN ?? x?.dni) === String(dni))
          : res;

        // 3) Si está en padrón, armamos con los datos del padrón
        if (padron) {
          this.empadronada = 'EMPADRONADA';
          this.pers = padron;


          this.form.patchValue({
            email: this.usuario?.email ?? '',
            dni,
            nombre: this.usuario?.nombre ?? padron.apellidoYNombre ?? '',
            club: padron.club ?? '',
            categoria: padron.categoria ?? '',
            nivel: this.form.get('nivel')?.value ?? '',
            domicilio: padron.domicilio ?? '',
            telefono: padron.telefono ?? ''
          });

        } else {
          // No está en padrón → armamos con los del usuario
          this.empadronada = 'NO_EMPADRONADA';
          this.form.patchValue({
            email: this.usuario?.email ?? '',
            dni: this.usuario?.dni ?? dni,
            nombre: this.usuario?.nombre ?? '',
            club: '',
            categoria: '',
            nivel: '',
            domicilio: '',
            telefono: ''
          });
        }

        // 4) Aseguramos render del form
        this.form.updateValueAndValidity({ emitEvent: false });
      },
      error: (e) => {
        console.error('Error al consultar padrón:', e);
        // fallback mínimo para no dejar el form “sucio”
        this.form.patchValue({
          email: this.usuario?.email ?? '',
          dni,
          nombre: this.usuario?.nombre ?? ''
        });
      }
    });
  }
  guardar(): void {
    const payload: PerfilEditable = {
      dni: this.usuario.dni,
      club: this.form.value.club,
      categoria: this.form.value.categoria,
      nivel: this.form.value.nivel,
      domicilio: this.form.value.domicilio,
      telefono: this.form.value.telefono,
      fechaNacimiento: this.form.value.fechaNacimiento,
      instagram: this.form.value.instagram,
      facebook: this.form.value.facebook,
      tiktok: this.form.value.tiktok
    };

    this.authService.updatePerfilUsuario(payload).subscribe({
      next: () => {
        this.snackBar.open('Datos actualizados correctamente', 'Cerrar', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
          panelClass: ['snackbar-success'] // opcional, para estilos
        });
      },
      error: () => {
        this.snackBar.open('Error al actualizar los datos', 'Cerrar', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
          panelClass: ['snackbar-error'] // opcional
        });
      }
    });
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('fotoPerfil', file);

    this.usuariosService.subirFotoPerfil(this.usuario.dni, formData).subscribe({
      next: (res) => {
        // actualizo mi usuario local con la URL devuelta por el backend
        const actualizado = { ...this.usuario, fotoPerfil: res.url };
        this.usuario = actualizado;

        // persistir y notificar a toda la app (dashboard incluido)
        this.authService.setUsuario(actualizado);

        this.snackBar.open('✅ Foto de perfil actualizada', 'Cerrar', { duration: 3000 });
      },
      error: () => this.snackBar.open('❌ Error al subir foto', 'Cerrar', { duration: 3000 })
    });
  }


  triggerFileInput() {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    fileInput?.click();
  }

  cambiarFotoPerfil() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        const formData = new FormData();
        formData.append('fotoPerfil', file);
        this.deportistService.subirFotoPerfil(this.usuario.dni, formData).subscribe({
          next: (res) => {
            this.snackBar.open('✅ Foto actualizada', 'Cerrar', { duration: 3000 });
            this.usuario.fotoPerfil = res.url; // refresca la imagen
          },
          error: () => this.snackBar.open('❌ Error al subir foto', 'Cerrar', { duration: 3000 })
        });
      }
    };
    input.click();
  }

  back(): void {

    try {
      if (typeof window !== 'undefined' && window.history && window.history.length > 1) {
        this.ngLocation.back();
        return;
      }
    } catch {
      // noop
    }


    const rol = (this.usuario?.rol ?? '').toString().toLowerCase();

    const destino =
      rol === 'administrador' ? '/admin/usuarios/pendientes' :
        rol === 'tecnico' ? '/dashboard-tecnico' :
          '/dashboard-deport';         // default deportista

    this.router.navigateByUrl(destino);
  }


}

