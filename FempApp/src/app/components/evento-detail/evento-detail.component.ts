import { Component, inject, OnInit } from '@angular/core';
import { Evento, EventoLite } from '../../interfaces/evento';
import { NuevoEventoDto, EditEventoDto } from '../../interfaces/evento-dto';
import { ActivatedRoute, Router, RouterLink, RouterOutlet } from '@angular/router';
import { EventosService } from '../../services/eventos.service';
import { MatCard, MatCardActions } from '@angular/material/card';
import { MatCardModule } from '@angular/material/card';
import { FormControl, Validators, FormsModule, ReactiveFormsModule, FormGroup, FormBuilder } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDialog } from '@angular/material/dialog';
import { MatListModule } from '@angular/material/list';
import { AuthService } from '../../services/auth.service';
import { CertificadoService } from '../../services/certificado.service';

import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogsComponent } from '../dialogs/dialogs.component';
import { PagosService } from '../../services/pagos.service';
import { Observable } from 'rxjs';
import { CertEvento, CertUsuario } from '../../interfaces/certificados';
import { PerfilDeportivo } from '../../interfaces/perfil-deportivo.interface';
import { PerfilesDeportivosService } from '../../services/perfiles-deportivos.service';
// import { showAthleteRegistro } from '../dialogs/dialogs.component';

@Component({
  selector: 'app-evento-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    RouterLink,
    RouterOutlet,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatSelectModule,
    MatToolbarModule,
    MatListModule,

  ],
  templateUrl: './evento-detail.component.html',
  styleUrl: './evento-detail.component.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class EventoDetailComponent implements OnInit {

  public evento!: Evento;
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private eventServ = inject(EventosService);
  private pagos = inject(PagosService);
  private certServ = inject(CertificadoService);
  private auth = inject(AuthService);
  private matDialog = inject(MatDialog);
  private perfilesService = inject(PerfilesDeportivosService);

  public chartData: any[] = [];
  public chartLabels: string[] = [];
  public chartOptions: any = {};
  public form!: FormGroup;
  public displayedColumns: string[] = ['id', 'nombre', 'fecha', 'hora', 'lugar', 'acciones'];
  public deportistasInscritos: any[] = [];
  public eventos: Evento[] = [];
  public deportistas: any[] = [];
  public listMode = false;
  public data: Evento[] = [];
  injectedRoute = inject(ActivatedRoute);
  public listTitle = 'Eventos Disponibles';
  public eventosDisponibles: Evento[] = [];
  public inscripto: boolean = false;
  public inscribiendo: boolean = false;
  public evento$!: Observable<EventoLite>;
  public perfilesDeportivos: PerfilDeportivo[] = [];
  public perfilSeleccionadoId: number | null = null;




  constructor() { }



  ngOnInit(): void {

    const mode = (this.injectedRoute.snapshot.data?.['mode'] as string) || '';
    if (mode === 'inscriptos' || mode === 'disponibles') {
      this.listMode = true;
      this.listTitle = (mode === 'inscriptos') ? 'Mis Eventos' : 'Eventos Disponibles';

      if (mode === 'inscriptos') {
        const dni = this.auth.getUsuario()?.dni;
        if (dni != null) {
          this.eventServ.getEventosDelUsuario(Number(dni)).subscribe({
            next: (evs) => this.eventos = evs ?? [],
            error: () => (this.eventos = [])
          });
        } else {
          this.eventos = [];
        }
      } else {
        this.mostrarTodosEventos();
      }
      return;
    }

    const raw = this.injectedRoute.snapshot.paramMap.get('id')
      ?? this.injectedRoute.snapshot.paramMap.get('evento');
    const id = raw ? Number(raw) : NaN;
    if (!Number.isFinite(id)) {
      this.router.navigate(['/dashboard-deport']);
      return;
    }
    this.eventServ.getEventoById(id).subscribe({
      next: (ev) => {
        this.evento = ev;
        this.setInscriptoPara(id);
      },
      error: () => this.router.navigate(['/dashboard-deport'])
    });
    this.formularioInscripcion();
    this.cargarPerfiles();
  }

  cargarPerfiles(): void {
    const usuario = this.auth.getUsuario();
    if (!usuario?.id) return;

    this.perfilesService.getByUsuario(usuario.id).subscribe({
      next: (perfiles) => {
        this.perfilesDeportivos = perfiles || [];
        console.log('Perfiles cargados:', this.perfilesDeportivos);
      },
      error: (err) => {
        console.error('Error cargando perfiles:', err);
        this.perfilesDeportivos = [];
      }
    });
  }

  private setInscriptoPara(eventoId: number): void {
    const dni = this.auth.getUsuario()?.dni;
    if (dni == null) { this.inscripto = false; return; }

    this.eventServ.getEventosDelUsuario(Number(dni)).subscribe({
      next: (evs) => this.inscripto = (evs ?? []).some(e => e.id === eventoId),
      error: () => this.inscripto = false
    });
  }

  inscribirse(): void {
    if (!this.evento) return;

    const user = this.auth.getUsuario();
    if (!user?.id) return;

    if (!this.perfilSeleccionadoId) {
      alert('Seleccioná un perfil deportivo antes de inscribirte');
      return;
    }

    this.inscribiendo = true;

    this.eventServ.inscribirDeportista(
      this.evento.id,
      user.id,
      this.perfilSeleccionadoId
    ).subscribe({
      next: () => {
        this.inscripto = true;
        this.inscribiendo = false;
        this.abrirDialogo(true);
      },
      error: (err) => {
        console.error('Error al inscribirse:', err);
        this.inscribiendo = false;
        this.abrirDialogo(false);
      }
    });
  }


  seleccionarPerfil(id: number): void {
    this.perfilSeleccionadoId = id;
  }

  mostrarEventosById(id: number) {
    this.eventServ.getEventoById(id).subscribe({
      next: (evento) => {
        this.evento = evento;
        this.getDeportistasInscriptos(this.evento.id);
        console.log('Evento:', this.evento);
      },
      error: (error) => console.error('Error fetching event:', error)
    });
  }

  mostrarTodosEventoss() {
    this.eventServ.getEventos().subscribe({
      next: (eventos: Evento[]) => {
        this.eventos = eventos;
      },
      error: (error: any) => {
        console.error('Error fetching events:', error);
      }
    });
  }

  mostrarTodosEventos() {
    this.eventServ.getEventos().subscribe({
      next: (eventos) => {
        this.eventos = eventos;
        this.eventosDisponibles = eventos;
      },
      error: (e) => console.error('Error fetching events:', e)
    });
  }

  actualizarEvento() {
    const id = this.evento.id;
    const dto = { ...this.evento };
    this.eventServ.updateEvento(id, dto).subscribe({
      next: (ev) => { this.evento = ev; },
      error: (er) => console.error('Error actualizando evento:', er),
    });
  }

  descargarCertificado(e: Evento) {
    const u = this.auth.getUsuario();
    if (!u) { return; }

    this.certServ.generar(
      { nombre: u.nombre, dni: u.dni, club: u.club, categoria: u.categoria },
      { titulo: e.titulo, fechaInicio: this.evento.fechaInicio ?? new Date(), lugar: e.lugar, nivel: e.nivel },
      { filename: `cert_${u.dni}.pdf` }
    );
  }

  async descargarCert(): Promise<void> {
    const u = this.auth.getUsuario();
    if (!u || !this.evento || !this.inscripto) return;

    const perfil =
      this.perfilesDeportivos.find(p => p.id === this.perfilSeleccionadoId)
      ?? this.perfilesDeportivos[0];

    const certUsuario: CertUsuario = {
      nombre: u.nombre,
      dni: u.dni,
      club: perfil?.club ?? u.club ?? '',
      categoria: perfil?.categoria ?? u.categoria ?? '',
      disciplina: perfil?.disciplina ?? 'Patinaje Artístico',
      licencia: perfil?.licencia ?? '',
      modalidad: perfil?.modalidad ?? '',
      divisional: perfil?.divisional ?? ''
    };

    const certEvento: CertEvento = {
      titulo: this.evento.titulo || this.evento.nombre || 'Evento sin título',
      fechaInicio: this.evento.fechaInicio ?? new Date(),
      lugar: this.evento.lugar ?? '............................',
      nivel: this.evento.nivel ?? ''
    };

    await this.certServ.generar(
      certUsuario,
      certEvento,
      { filename: `cert_${u.dni}_${this.evento.id}.pdf` }
    );
  }

  verDetalleEvento(id: number) {
    this.router.navigate(['/evento-detail', id]);
  }

  inscribirseYPagar() {
    const user = this.auth.getUsuario();
    if (!user?.id || !this.evento?.id) { this.abrirDialogo(false); return; }

    if (this.deportistasInscritos.some(dep => dep.id === user.id)) {
      this.abrirDialogo(false); return;
    }

    this.eventServ.inscribirDeportista(this.evento.id, user.id, this.perfilSeleccionadoId).subscribe({
      next: () => {
        const price = Number(this.evento?.precio ?? 200);
        this.pagos.crearPreferencia({
          title: `Inscripción - ${this.evento.titulo}`,
          quantity: 1,
          unit_price: price,
          external_reference: `${this.evento.id}-${user.id}`
        }).subscribe({
          next: ({ init_point }) => { window.location.href = init_point; },
          error: () => this.abrirDialogo(false)
        });
      },
      error: () => this.abrirDialogo(false)
    });
  }

  inscribirseEvento() {
    const userId = this.auth.getUsuario()?.id;
    if (!userId || !this.evento?.id) {
      this.abrirDialogo(false);
      return;
    }

    const yaInscripto = this.deportistasInscritos.some(dep => dep.id === userId);
    if (yaInscripto) {
      this.abrirDialogo(false);
      return;
    }

    this.eventServ.inscribirDeportista(this.evento.id, userId).subscribe({
      next: () => this.abrirDialogo(true),
      error: () => this.abrirDialogo(false)
    });
  }

  irAScanner() {
    if (!this.evento || !this.inscripto) return;

    this.router.navigate(
      ['/asistencias/scanner'],
      { queryParams: { eventoId: this.evento.id } }
    );
  }


  abrirDialogo(success: boolean): void {
    this.matDialog.open(DialogsComponent, {
      data: { success },
      panelClass: 'custom-dialog-panel'
    });

    setTimeout(() => {
      this.matDialog.closeAll();
      this.router.navigate(['/dashboard-deport']);
    }, 3000);
  }

  volver() {
    this.router.navigate(['/dashboard-deport']);
  }

  trackById(_: number, e: Evento) { return e.id; }

  formularioInscripcion() {
    this.form = this.fb.group({
      eventoId: ['', Validators.required],
      deportistaId: ['', Validators.required]
    });
  }

  onSubmitInscripcion() {
    this.inscribirseEvento();
  }


  getDeportistasInscriptos(eventoId: number) {
    this.eventServ.getDeportistasInscriptos(eventoId).subscribe({
      next: (usuarios: any[]) => {
        this.deportistasInscritos = usuarios;
        console.log('Inscriptos:', usuarios);
      },
      error: (error: any) => {
        console.error('Error obteniendo inscriptos:', error);
      }
    });
  }

  get puedeVerInscriptos(): boolean {
    return this.auth.hasAnyRole(['administrador', 'tecnico']);
  }

  mostrarEventoById(id: number) {
    this.eventServ.getEventoById(id).subscribe({
      next: (evento) => {
        this.evento = evento;
        if (this.puedeVerInscriptos) {
          this.getDeportistasInscriptos(this.evento.id);
        }
      },
      error: (error) => console.error('Error fetching event:', error)
    });
  }

  guardarCambios() {
    const raw = this.form.getRawValue();

    const dto: EditEventoDto = {
      titulo: raw.titulo,
      descripcion: raw.descripcion,
      fechaInicio: raw.fechaInicio,
      fechaFin: raw.fechaFin,
      lugar: raw.lugar,
      nivel: raw.nivel,
      inscripcionRequierePago: raw.inscripcionRequierePago,
      precio: raw.precio,
      permiteEfectivo: raw.permiteEfectivo,
      certificadoAuto: raw.certificadoAuto
    };

    this.eventServ.updateEvento(this.evento.id, dto).subscribe({
      next: (ev) => {
        this.evento = ev;
        // snack / feedback visual
        this.matDialog.open(DialogsComponent, {
          data: { success: true, message: 'Evento actualizado con éxito.' },
          panelClass: 'custom-dialog-panel'
        });
      },
      error: (err) => console.error(err)
    });
  }


}
