import { Component, inject, OnDestroy } from '@angular/core';
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
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { Observable, Subject, finalize, map, startWith, takeUntil } from 'rxjs';
import { PadronRegistro } from '../../interfaces/padron-registro.interface';
import { ClubOption } from '../../interfaces/club-option.interface';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, MatCardModule, FormsModule, MatFormFieldModule, MatInputModule,
    ReactiveFormsModule, MatButtonModule, RouterOutlet, RouterLink, MatListModule,
    MatDividerModule, RegistroFastComponent, MatSelectModule, MatProgressSpinnerModule,
    MatIconModule, MatAutocompleteModule],
  templateUrl: './registro.component.html',
  styleUrl: './registro.component.scss'
})
export class RegistroComponent implements OnDestroy {
  public form!: FormGroup;
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private regServ = inject(RegistroService);
  private destroy$ = new Subject<void>();
  private redirectTimer?: ReturnType<typeof setTimeout>;
  private dniVerificado: string | null = null;

  public empadronada = '';
  public roles: any[] = [];
  public errorMsg = '';
  public successMsg = '';
  public errorRoles = '';
  public errorClubes = '';
  public cargando = false;
  public cargandoBuscar = false;
  public cargandoRoles = false;
  public cargandoClubes = false;
  public clubesFiltrados$!: Observable<ClubOption[]>;
  public clubSearchControl = new FormControl<ClubOption | string | null>(null);
  public clubes: ClubOption[] = [];
  public clubSeleccionado: ClubOption | null = null;
  public pers: PadronRegistro | null = null;

  ngOnInit() {
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      edad: [null, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      confirmPass: ['', Validators.required],
      dni: ['', Validators.required],
      rolId: [null, Validators.required],
      categoria: [{ value: '', disabled: true }],
      nivel: [{ value: '', disabled: true }],
      clubId: new FormControl<number | null>(null)
    });
    this.inicializarFiltroClubes();
    this.clubSearchControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(value => {
      const club = typeof value === 'object' && value
        ? this.clubes.find(item => item.id === value.id) ?? null : null;
      this.clubSeleccionado = club;
      this.form.patchValue({ clubId: club?.id ?? null });
    });
    this.form.get('dni')!.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(value => {
      if (this.dniVerificado && this.normalizarDni(value) !== this.dniVerificado) {
        this.reiniciarResultadoDni();
        this.errorMsg = 'El DNI cambió. Volvé a buscarlo antes de registrarte.';
      }
    });
    this.form.get('rolId')!.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(rolId => this.configurarPorRol(Number(rolId)));
    this.cargarRoles();
    this.cargarClubes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.redirectTimer) clearTimeout(this.redirectTimer);
  }

  cargarRoles(): void {
    if (this.cargandoRoles) return;
    this.cargandoRoles = true;
    this.errorRoles = '';
    this.regServ.getRoles().pipe(takeUntil(this.destroy$),
      finalize(() => this.cargandoRoles = false)).subscribe({
        next: roles => {
          this.roles = Array.isArray(roles) ? roles : [];
          if (!this.roles.length) this.errorRoles = 'No hay roles disponibles. Consultá a la Federación.';
        },
        error: () => this.errorRoles = 'No se pudieron cargar los roles. Reintentá la carga.'
      });
  }

  cargarClubes(): void {
    if (this.cargandoClubes) return;
    this.cargandoClubes = true;
    this.errorClubes = '';
    this.regServ.getClubes().pipe(takeUntil(this.destroy$),
      finalize(() => this.cargandoClubes = false)).subscribe({
        next: clubes => {
          if (!Array.isArray(clubes)) {
            this.errorClubes = 'No se pudo interpretar el listado de clubes.';
            return;
          }
          this.clubes = clubes.filter(club => club.activo !== false && club.activo !== 0);
          if (!this.clubSeleccionado) this.seleccionarClubDelPadron();
          this.inicializarFiltroClubes();
        },
        error: () => this.errorClubes = 'No se pudieron cargar los clubes. Reintentá la carga.'
      });
  }

  private configurarPorRol(rolId: number): void {
    for (const key of ['categoria', 'nivel']) {
      const control = this.form.get(key)!;
      control.clearValidators();
      control.disable({ emitEvent: false });
      control.setValue('', { emitEvent: false });
    }
    if (rolId === 1) {
      const categoria = this.form.get('categoria')!;
      categoria.enable({ emitEvent: false });
      categoria.setValidators(Validators.required);
      categoria.setValue(this.pers?.categoria ?? '', { emitEvent: false });
    } else if (rolId === 3) {
      const nivel = this.form.get('nivel')!;
      nivel.enable({ emitEvent: false });
      nivel.setValidators(Validators.required);
    }
    this.form.get('categoria')!.updateValueAndValidity({ emitEvent: false });
    this.form.get('nivel')!.updateValueAndValidity({ emitEvent: false });
  }

  private normalizarDni(value: unknown): string {
    return String(value ?? '').replace(/\D/g, '');
  }

  private normalizarTexto(value: unknown): string {
    return String(value ?? '').toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').trim();
  }

  private inicializarFiltroClubes(): void {
    this.clubesFiltrados$ = this.clubSearchControl.valueChanges.pipe(
      startWith(this.clubSearchControl.value),
      map(value => this.filtrarClubes(this.displayClub(value)))
    );
  }

  private filtrarClubes(texto: string): ClubOption[] {
    const filtro = this.normalizarTexto(texto);
    return this.clubes.filter(club => !filtro ||
      this.normalizarTexto(club.nombre).includes(filtro) ||
      this.normalizarTexto((club.sedes ?? []).map(s => s.nombre).join(' ')).includes(filtro)
    ).slice(0, 25);
  }

  public displayClub = (club: ClubOption | string | null): string =>
    typeof club === 'string' ? club : club?.nombre ?? '';

  public onClubSelected(club: ClubOption): void {
    this.clubSeleccionado = this.clubes.find(item => item.id === club.id) ?? null;
    this.form.patchValue({ clubId: this.clubSeleccionado?.id ?? null });
  }

  private seleccionarClubDelPadron(): void {
    if (!this.pers?.club || this.clubSearchControl.value) return;
    const club = this.clubes.find(c => this.normalizarTexto(c.nombre) === this.normalizarTexto(this.pers?.club));
    if (club) {
      this.clubSearchControl.setValue(club);
      this.onClubSelected(club);
    }
  }

  private reiniciarResultadoDni(): void {
    this.dniVerificado = null;
    this.pers = null;
    this.empadronada = '';
    this.clubSeleccionado = null;
    this.clubSearchControl.setValue(null);
    this.form.patchValue({ nombre: '', edad: null, clubId: null, categoria: '', nivel: '' });
  }

  buscar(): void {
    if (this.cargandoBuscar || this.cargando || this.successMsg) return;
    const dni = this.normalizarDni(this.form.get('dni')?.value);
    this.errorMsg = '';
    if (!dni) {
      this.errorMsg = 'Ingresá el DNI para buscarlo.';
      return;
    }
    this.form.patchValue({ dni });
    this.reiniciarResultadoDni();
    this.cargandoBuscar = true;
    this.regServ.buscar(dni).pipe(takeUntil(this.destroy$),
      finalize(() => this.cargandoBuscar = false)).subscribe({
        next: ({ padron, usuario }: { padron: PadronRegistro | null; usuario: any | null }) => {
          if (this.normalizarDni(this.form.get('dni')?.value) !== dni) return;
          if (usuario) {
            this.errorMsg = 'Ya existe una cuenta con ese DNI. Ingresá desde el login.';
            return;
          }
          this.pers = padron ?? null;
          this.dniVerificado = dni;
          this.empadronada = padron ? 'EMPADRONADA' : 'NO_EMPADRONADA';
          this.form.patchValue({ nombre: padron?.apellidoYNombre ?? '' });
          this.configurarPorRol(Number(this.form.get('rolId')?.value));
          this.seleccionarClubDelPadron();
        },
        error: () => this.errorMsg = 'No se pudo buscar el DNI. Podés volver a intentarlo.'
      });
  }

  guardar(): void {
    if (this.cargando || this.cargandoBuscar || this.successMsg) return;
    this.errorMsg = '';
    const dni = this.normalizarDni(this.form.get('dni')?.value);
    if (!this.dniVerificado || dni !== this.dniVerificado || !this.empadronada) {
      this.errorMsg = 'Primero buscá y verificá el DNI.';
      return;
    }
    if (this.cargandoRoles || this.cargandoClubes || this.errorRoles || this.errorClubes) {
      this.errorMsg = 'Esperá a que se carguen los roles y clubes o reintentá la carga.';
      return;
    }
    const raw = this.form.getRawValue();
    this.form.patchValue({ nombre: String(raw.nombre ?? '').trim(), email: String(raw.email ?? '').trim() });
    this.form.markAllAsTouched();
    if (this.form.invalid || !this.roles.some(rol => Number(rol.id) === Number(raw.rolId))) {
      this.errorMsg = 'Revisá los campos obligatorios, el email, la edad y el rol.';
      return;
    }
    if (raw.password !== raw.confirmPass) {
      this.errorMsg = 'Las contraseñas no coinciden.';
      return;
    }
    if (this.clubSearchControl.value && !this.clubSeleccionado) {
      this.errorMsg = 'Seleccioná un club del listado o borrá el texto del buscador.';
      return;
    }
    const rolId = Number(raw.rolId);
    const payload = {
      nombre: this.form.get('nombre')!.value,
      edad: Number(raw.edad),
      email: this.form.get('email')!.value,
      password: raw.password,
      dni,
      rolId,
      clubId: this.clubSeleccionado?.id ?? null,
      club: this.clubSeleccionado?.nombre ?? this.pers?.club ?? null,
      ...(rolId === 1 ? { categoria: raw.categoria } : {}),
      ...(rolId === 3 ? { nivel: raw.nivel } : {})
    };
    this.cargando = true;
    this.regServ.guardar(payload).pipe(takeUntil(this.destroy$),
      finalize(() => this.cargando = false)).subscribe({
        next: () => {
          this.successMsg = 'Cuenta creada. Si tu rol requiere aprobación, la Federación deberá habilitarla antes de que puedas ingresar.';
          this.redirectTimer = setTimeout(() => this.router.navigate(['/login']), 4000);
        },
        error: e => this.errorMsg = e?.error?.message || e?.error?.error || 'Ocurrió un error al registrar. Podés reintentar.'
      });
  }

  volver(): void {
    this.router.navigate(['/login']);
  }
}
