import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
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
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { Observable, map, startWith } from 'rxjs';
import { PadronRegistro } from '../../interfaces/padron-registro.interface';
import { ClubOption } from '../../interfaces/club-option.interface';



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
    MatProgressSpinnerModule,
    MatIconModule,
    MatIcon,
    MatAutocompleteModule
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

  public empadronada: string = '';
  public roles: any[] = [];
  public errorMsg: string = '';
  public successMsg: string = '';
  public cargando: boolean = false;
  public cargandoBuscar: boolean = false;
  public loading: boolean = false;

  public clubesFiltrados$!: Observable<ClubOption[]>;
  public clubSearchControl = new FormControl<ClubOption | string | null>(null);
  public clubes: ClubOption[] = [];
  public clubSeleccionado: ClubOption | null = null;
  public pers: PadronRegistro | null = null;


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
      nivel: [{ value: '', disabled: true }],
      clubId: new FormControl<number | null>(null)
    });

    this.regServ.getRoles().subscribe({
      next: res => (this.roles = res),
      error: err => console.log('Error al obtener roles', err)
    });

    this.regServ.getClubes().subscribe({
      next: clubes => {
        this.clubes = clubes ?? [];
        this.inicializarFiltroClubes();
      },
      error: err => {
        console.error('Error al obtener clubes', err);
      }
    });

    this.form.get('rolId')!.valueChanges.subscribe(rolId => this.configurarPorRol(rolId));
  }

  private configurarPorRol(rolId: number) {
    const categoria = this.form.get('categoria')!;
    const nivel = this.form.get('nivel')!;

    categoria.clearValidators();
    categoria.disable();
    categoria.setValue('');

    nivel.clearValidators();
    nivel.disable();
    nivel.setValue('');

    const deportista = 1;
    const tecnico = 3;

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

  private normalizarTexto(value: any): string {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private inicializarFiltroClubes(): void {
    this.clubesFiltrados$ = this.clubSearchControl.valueChanges.pipe(
      startWith('' as ClubOption | string | null),
      map((value: ClubOption | string | null) => {
        const texto = typeof value === 'string'
          ? value
          : this.displayClub(value);

        return this.filtrarClubes(texto || '');
      })
    );
  }

  private filtrarClubes(texto: string): any[] {
    const filtro = this.normalizarTexto(texto);

    if (!filtro) {
      return this.clubes.slice(0, 25);
    }

    return this.clubes
      .filter((club: any) => {
        const nombre = this.normalizarTexto(club?.nombre);
        const sede = this.normalizarTexto(
          (club?.sedes || []).map((s: any) => s.nombre).join(' ')
        );

        return nombre.includes(filtro) || sede.includes(filtro);
      })
      .slice(0, 25);
  }

  public displayClub = (club: ClubOption | string | null): string => {
    if (!club) return '';
    if (typeof club === 'string') return club;
    return club.nombre || '';
  };

  public onClubSelected(club: ClubOption): void {
    this.clubSeleccionado = club;
    this.form.patchValue({
      clubId: club.id
    });
  }

  buscar() {
    const dniRaw = this.form.get('dni')?.value?.toString().trim() || '';
    const dni = dniRaw.replace(/\D/g, '');

    if (!dni) return;

    this.form.patchValue({ dni });

    this.errorMsg = '';
    this.successMsg = '';
    this.cargandoBuscar = true;

    this.regServ.buscar(dni).subscribe({

      next: ({ padron, usuario }: { padron: PadronRegistro | null; usuario: any | null }) => {
        this.pers = padron || null;

        if (usuario) {
          this.empadronada = '';
          this.errorMsg = 'Ya existe una cuenta con ese DNI.';
          return;
        }

        this.empadronada = padron ? 'EMPADRONADA' : 'NO_EMPADRONADA';

        if (padron?.club) {
          const clubPadron = this.clubes.find((c: ClubOption) => {
            return this.normalizarTexto(c.nombre) === this.normalizarTexto(padron.club);
          });

          if (clubPadron) {
            this.clubSeleccionado = clubPadron;
            this.clubSearchControl.setValue(clubPadron);
            this.form.patchValue({ clubId: clubPadron.id });
          }
        }
      },
      error: () => (this.errorMsg = 'No se pudo buscar el DNI.'),
      complete: () => (this.cargandoBuscar = false)
    });
  }

  guardar() {
    this.errorMsg = '';
    this.successMsg = '';
    this.cargando = true;

    const esEmpadronada = this.empadronada !== 'NO_EMPADRONADA';
    const rolId = this.form.get('rolId')?.value;
    const deportista = 1;
    const tecnico = 3;

    const dniFormulario = this.form.get('dni')?.value?.toString() || '';
    const dniPadron = this.pers?.documentoN?.toString() || '';
    const dniNormalizado = (esEmpadronada ? dniPadron : dniFormulario).replace(/\D/g, '');

    const payload: any = {
      nombre: esEmpadronada ? this.pers?.apellidoYNombre : this.form.get('nombre')?.value,
      edad: esEmpadronada ? 14 : this.form.get('edad')?.value,
      email: this.form.get('email')?.value,
      password: this.form.get('password')?.value,
      dni: dniNormalizado,
      rolId,
      clubId: this.form.get('clubId')?.value ?? null,
      club: this.clubSeleccionado?.nombre ?? this.pers?.club ?? null
    };

    if (rolId === deportista) payload.categoria = this.form.get('categoria')?.value;
    if (rolId === tecnico) payload.nivel = this.form.get('nivel')?.value;

    if (this.form.get('password')?.value !== this.form.get('confirmPass')?.value) {
      this.cargando = false;
      this.errorMsg = 'Las contraseñas no coinciden.';
      return;
    }

    this.regServ
      .guardar(payload)
      .pipe(finalize(() => (this.cargando = false)))
      .subscribe({
        next: () => {
          this.successMsg = 'Registro exitoso. Serás redirigido al login.';
          setTimeout(() => {
            this.successMsg = '';
            this.router.navigate(['']);
          }, 2000);
        },
        error: e => {
          this.errorMsg = e?.error?.message || e?.error?.error || 'Ocurrió un error al registrar.';
        }
      });
  }

  volver(): void {
    this.router.navigate(['/login']);
  }
}
