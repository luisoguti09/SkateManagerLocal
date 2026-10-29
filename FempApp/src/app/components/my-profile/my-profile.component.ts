import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { EliminarPerfilComponent } from './eliminar-perfil.component';
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
import { RegistroService } from '../../services/registro.service';
import { ClubOption, ClubSedeOption } from '../../interfaces/club-option.interface';
import { ChangeDetectorRef } from '@angular/core';
import {
  LICENCIAS, categoriasPerfil, CATEGORIAS_DANZA_2026,
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
    origenCategoria: null,
    licencia: '',
    modalidad: '',
    divisional: '',
    categoria: '',
    temporada: '',
    club: '',
    clubId: null,
    clubSedeId: null,
    activa: true
  };
  public readonly origenesCategoria = [
    { valor: 'CAP', etiqueta: 'CAP', habilitado: true },
    { valor: 'PROMOS_FEMPA', etiqueta: 'PROMOS FEMPA', habilitado: true },
    { valor: 'ESPECIAL_FEMPA', etiqueta: 'Especial FEMPA', habilitado: false }
  ];
  public guardandoPerfil = false;
  public perfilEditandoId: number | null = null;
  public perfilEditandoOrigenId: number | null = null;
  public origenCategoriaEditado: string | null = null;
  public guardandoOrigen = false;

  public clubes: ClubOption[] = [];
  public sedesDisponibles: ClubSedeOption[] = [];
  public cargandoClubes = false;
  public errorClubes = '';

  public disciplinas = DISCIPLINAS;
  get modalidades(): string[] { return this.nuevoPerfil.disciplina === 'Danza' ? ['Individual', 'Parejas'] : MODALIDADES; }
  public licencias = LICENCIAS;
  get divisionales(): string[] {
    if (this.nuevoPerfil.origenCategoria === 'PROMOS_FEMPA') return this.nuevoPerfil.disciplina === 'Libre' ? ['Promos FEMPA'] : [];
    return this.nuevoPerfil.disciplina === 'Danza' ? Object.keys(CATEGORIAS_DANZA_2026) : DIVISIONALES;
  }
  onOrigenChange(origen: string): void {
    if (this.guardandoPerfil) return;
    this.nuevoPerfil = { ...this.nuevoPerfil, origenCategoria: origen, divisional: '', categoria: '' };
    this.eficiencias = [];
  }
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
  private destroyRef = inject(DestroyRef);
  private dialog = inject(MatDialog);
  private perfilesPeticion?: Subscription;
  cargandoPerfiles = true;
  errorPerfiles = '';
  eliminandoPerfil = false;
  private registroService = inject(RegistroService);

  constructor() { }

  get dentroDelPanel(): boolean { return this.router.url.startsWith('/dashboard-deport/'); }

  volver() {
    this.router.navigate(['/dashboard-deport']);
  }

  ngOnInit(): void {

    this.usuario = this.authService.getUsuario();
    this.cargarPerfilesDeportivos();
    this.cargarClubes();

    this.initForm();
    if (this.usuario?.dni) {
      this.buscarEnPadron(this.usuario.dni);
    }
    console.log('✅ MyProfileComponent inicializado');

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
    if (this.eliminandoPerfil) return;
    const perfil = this.perfilesDeportivos.find(p => p.id === id);
    this.dialog.open(EliminarPerfilComponent, {
      data: perfil, width: '460px', maxWidth: '94vw', autoFocus: 'first-tabbable',
      ariaLabel: 'Eliminar perfil deportivo'
    }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(confirmado => {
      if (confirmado !== true || this.eliminandoPerfil) return;
      this.eliminandoPerfil = true;
      this.perfilesService.delete(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.perfilesDeportivos = this.perfilesDeportivos.filter(p => p.id !== id);
          if (this.perfilEditandoOrigenId === id) this.cancelarEdicionOrigen();
          this.eliminandoPerfil = false;
          this.cd.markForCheck();
          this.snackBar.open('Perfil eliminado', 'Cerrar', { duration: 3000 });
        },
        error: err => {
          this.eliminandoPerfil = false;
          this.cd.markForCheck();
          this.snackBar.open(err?.error?.error || err?.error?.message || 'No pudimos eliminar el perfil. Volvé a intentar.', 'Cerrar', { duration: 6000 });
        }
      });
    });
  }

  editarPerfil(perfil: PerfilDeportivo): void {
    if (this.guardandoPerfil) return;
    this.perfilEditandoId = perfil.id;
    this.nuevoPerfil = {
      usuarioId: perfil.usuarioId, disciplina: perfil.disciplina,
      origenCategoria: perfil.origenCategoria, modalidad: perfil.modalidad,
      licencia: ['Internacional WS', 'Nacional Atleta'].includes(perfil.licencia || '') ? 'Nacional' : perfil.licencia,
      divisional: perfil.divisional, categoria: perfil.categoria, temporada: perfil.temporada,
      clubId: perfil.clubId, clubSedeId: perfil.clubSedeId, club: perfil.club, activa: perfil.activa
    };
    this.eficiencias = categoriasPerfil(perfil.disciplina, perfil.origenCategoria, perfil.divisional || '');
    this.sedesDisponibles = this.clubes.find(c => c.id === perfil.clubId)?.sedes || [];
    this.mostrarFormPerfil = true;
    setTimeout(() => document.querySelector('.perfil-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
  abrirNuevoPerfil(): void {
    if (this.guardandoPerfil) return;
    if (this.perfilEditandoId !== null) {
      this.perfilEditandoId = null;
      this.nuevoPerfil = { usuarioId: 0, disciplina: '', origenCategoria: null, licencia: '', modalidad: '', divisional: '', categoria: '', temporada: '', clubId: null, clubSedeId: null, activa: true };
      this.eficiencias = [];
      this.sedesDisponibles = [];
      this.mostrarFormPerfil = false;
    } else this.mostrarFormPerfil = !this.mostrarFormPerfil;
  }
  onDisciplinaChange(disciplina: string): void {
    if (this.guardandoPerfil) return;
    this.nuevoPerfil = {
      ...this.nuevoPerfil, disciplina, modalidad: '', divisional: '', categoria: ''
    };
    this.eficiencias = [];
  }

  crearPerfil(): void {
    if (this.guardandoPerfil || this.cargandoClubes) return;
    if (!this.nuevoPerfil.disciplina.trim() ||
        !this.origenHabilitado(this.nuevoPerfil.origenCategoria)) {
      this.snackBar.open('Seleccioná la disciplina y el origen de la categoría', 'Cerrar', {
        duration: 3000
      });
      return;
    }
    if (!this.nuevoPerfil.licencia || !this.nuevoPerfil.modalidad || !this.nuevoPerfil.temporada ||
        !this.divisionales.includes(this.nuevoPerfil.divisional || '') ||
        ((this.eficiencias.length > 0 || this.nuevoPerfil.disciplina === 'Danza' || this.nuevoPerfil.origenCategoria === 'PROMOS_FEMPA') &&
         !this.eficiencias.includes(this.nuevoPerfil.categoria || ''))) {
      this.snackBar.open('Completá la licencia, modalidad, divisional, categoría y temporada del perfil.', 'Cerrar', { duration: 5000 });
      return;
    }
    const usuario = this.authService.getUsuario();
    if (!usuario?.id) return;

    const club = this.clubes.find(item => item.id === this.nuevoPerfil.clubId);
    if (!club || !this.clubYSedeValidos()) {
      this.snackBar.open('Seleccioná un club del listado y una sede válida, si corresponde', 'Cerrar', {
        duration: 3000
      });
      return;
    }

    const payload: CrearPerfilDeportivoDto = {
      ...this.nuevoPerfil,
      usuarioId: usuario.id,
      clubId: club.id,
      clubSedeId: this.nuevoPerfil.clubSedeId ?? null,
      club: club.nombre
    };

    // Copia independiente: lo confirmado no cambia durante la solicitud.

    const editandoId = this.perfilEditandoId;
    const guardar = editandoId === null ? this.perfilesService.create(payload) : this.perfilesService.update(editandoId, payload);
    this.guardandoPerfil = true;
    guardar.subscribe({
      next: (perfilCreado) => {
        this.guardandoPerfil = false;
        if (!perfilCreado || perfilCreado.disciplina !== payload.disciplina ||
            perfilCreado.origenCategoria !== payload.origenCategoria) {
          this.cargarPerfilesDeportivos();
          this.mostrarFormPerfil = false;
          this.snackBar.open('El servidor devolvió un perfil distinto al enviado. Revisá el listado antes de volver a guardar.', 'Cerrar', { duration: 10000 });
          this.cd.detectChanges();
          return;
        }
        this.perfilesDeportivos = editandoId === null
          ? [...this.perfilesDeportivos, perfilCreado]
          : this.perfilesDeportivos.map(p => p.id === editandoId ? perfilCreado : p);
        this.perfilEditandoId = null;

        this.nuevoPerfil = {
          usuarioId: 0,
          disciplina: '',
          origenCategoria: null,
          licencia: '',
          modalidad: '',
          divisional: '',
          categoria: '',
          temporada: '',
          club: '',
          clubId: null,
          clubSedeId: null,
          activa: true
        };

        this.eficiencias = [];
        this.sedesDisponibles = [];

        this.mostrarFormPerfil = false;

        this.cd.detectChanges();

        this.snackBar.open(editandoId === null ? 'Perfil creado correctamente' : 'Perfil actualizado correctamente', 'Cerrar', {
          duration: 2000
        });
      },
      error: (err) => {
        this.guardandoPerfil = false;
        console.error('Error creando perfil deportivo:', err);

        this.snackBar.open(
          err?.error?.error || 'No se pudo crear el perfil deportivo',
          'Cerrar',
          { duration: 3000 }
        );
      }
    });
  }

  cargarClubes(): void {
    if (this.cargandoClubes) return;
    this.cargandoClubes = true;
    this.errorClubes = '';

    this.registroService.getClubes().subscribe({
      next: (data: ClubOption[]) => {
        this.cargandoClubes = false;
        if (!Array.isArray(data)) {
          this.clubes = [];
          this.errorClubes = 'No se pudo interpretar el listado de clubes. Reintentá la carga.';
          return;
        }
        this.clubes = data
          .filter(club => club.activo !== false)
          .map(club => ({
            ...club,
            sedes: (club.sedes ?? []).filter(sede => sede.activo !== false)
              .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
          }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
        const club = this.clubes.find(item => item.id === this.nuevoPerfil.clubId);
        this.sedesDisponibles = club?.sedes ?? [];
        if (!club) {
          this.nuevoPerfil.clubId = null;
          this.nuevoPerfil.clubSedeId = null;
          this.nuevoPerfil.club = '';
        } else if (!this.sedesDisponibles.some(sede => sede.id === this.nuevoPerfil.clubSedeId)) {
          this.nuevoPerfil.clubSedeId = null;
        }
      },
      error: (err) => {
        this.cargandoClubes = false;
        this.errorClubes = 'No se pudo cargar el listado de clubes. Reintentá la carga.';
        console.error('Error cargando clubes:', err);
      }
    });
  }

  onClubChange(clubId: number | null): void {
    const club = this.clubes.find(item => item.id === clubId);
    this.nuevoPerfil.clubId = club?.id ?? null;
    this.nuevoPerfil.clubSedeId = null;
    this.nuevoPerfil.club = club?.nombre ?? '';
    this.sedesDisponibles = club?.sedes ?? [];
  }

  clubYSedeValidos(): boolean {
    if (this.cargandoClubes || this.errorClubes) return false;
    const club = this.clubes.find(item => item.id === this.nuevoPerfil.clubId);
    if (!club) return false;
    return this.nuevoPerfil.clubSedeId == null ||
      (club.sedes ?? []).some(sede => sede.id === this.nuevoPerfil.clubSedeId);
  }

  origenHabilitado(valor: string | null | undefined): boolean {
    return this.origenesCategoria.some(origen => origen.valor === valor && origen.habilitado);
  }

  etiquetaOrigen(valor: string | null | undefined): string {
    return this.origenesCategoria.find(origen => origen.valor === valor)?.etiqueta
      || valor || 'Sin informar';
  }

  editarOrigen(perfil: PerfilDeportivo): void {
    if (this.guardandoOrigen) return;
    this.perfilEditandoOrigenId = perfil.id;
    this.origenCategoriaEditado = perfil.origenCategoria ?? null;
  }

  cancelarEdicionOrigen(): void {
    if (this.guardandoOrigen) return;
    this.perfilEditandoOrigenId = null;
    this.origenCategoriaEditado = null;
  }

  guardarOrigen(perfil: PerfilDeportivo): void {
    if (this.guardandoOrigen || this.perfilEditandoOrigenId !== perfil.id ||
        !this.origenHabilitado(this.origenCategoriaEditado)) return;

    const origenSolicitado = this.origenCategoriaEditado;
    this.guardandoOrigen = true;
    this.perfilesService.update(perfil.id, {
      origenCategoria: this.origenCategoriaEditado
    }).subscribe({
      next: (perfilActualizado) => {
        if (perfilActualizado?.origenCategoria !== origenSolicitado) {
          this.guardandoOrigen = false;
          this.cargarPerfilesDeportivos();
          this.snackBar.open('No se confirmó el cambio de origen. Revisá el listado antes de reintentar.', 'Cerrar', { duration: 7000 });
          return;
        }
        this.perfilesDeportivos = this.perfilesDeportivos.map(actual =>
          actual.id === perfilActualizado.id ? perfilActualizado : actual
        );
        this.guardandoOrigen = false;
        this.cancelarEdicionOrigen();
        this.cd.detectChanges();
        this.snackBar.open('Origen actualizado correctamente', 'Cerrar', { duration: 2500 });
      },
      error: (err) => {
        this.guardandoOrigen = false;
        console.error('Error actualizando origen:', err);
        this.snackBar.open('No se pudo actualizar el origen. Podés reintentar.', 'Cerrar', {
          duration: 3000
        });
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
    this.nuevoPerfil.divisional = divisional;
    this.eficiencias = categoriasPerfil(this.nuevoPerfil.disciplina, this.nuevoPerfil.origenCategoria, divisional);
    this.nuevoPerfil.categoria = '';
  }

  cargarPerfilesDeportivos(): void {
    this.perfilesPeticion?.unsubscribe();
    this.cargandoPerfiles = true;
    this.errorPerfiles = '';
    const id = this.authService.getUsuario()?.id;
    if (!id) {
      this.cargandoPerfiles = false;
      this.errorPerfiles = 'No pudimos identificar tu cuenta. Volvé a ingresar.';
      this.cd.markForCheck();
      return;
    }
    this.perfilesPeticion = this.perfilesService.getByUsuario(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: data => {
        this.perfilesDeportivos = [...data];
        this.cargandoPerfiles = false;
        this.cd.markForCheck();
      },
      error: () => {
        this.errorPerfiles = 'No pudimos cargar tus perfiles. Probá nuevamente.';
        this.cargandoPerfiles = false;
        this.cd.markForCheck();
      }
    });
  }

  buscarEnPadron(dni: string): void {
    this.deportistService.consultarPadronPorDni(dni).subscribe({
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

        // Los datos guardados de la cuenta prevalecen sobre la consulta pública del padrón.
        this.aplicarDatosCuenta();
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
        this.aplicarDatosCuenta();
      }
    });
  }

  private aplicarDatosCuenta(): void {
    for (const field of ['club', 'categoria', 'nivel', 'domicilio', 'telefono',
      'fechaNacimiento', 'instagram', 'facebook', 'tiktok']) {
      if (this.usuario?.[field] != null) {
        this.form.patchValue({ [field]: this.usuario[field] });
      }
    }
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
        // Mantener el formulario y la sesión local alineados con los datos guardados.
        this.usuario = { ...this.usuario, ...payload };
        this.authService.setUsuario(this.usuario);
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
        rol === 'tecnico' ? '/dashboard-prof' :
        rol === 'juez' ? '/dashboard-juez' :
          '/dashboard-deport';         // default deportista

    this.router.navigateByUrl(destino);
  }


}
