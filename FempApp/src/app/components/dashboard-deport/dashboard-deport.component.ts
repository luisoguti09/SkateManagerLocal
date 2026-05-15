import { Component, inject, OnInit, ViewEncapsulation, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { DeportistComponent } from '../deportist/deportist.component';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import {
  MatDialog, MatDialogActions, MatDialogClose, MatDialogContent,
  MatDialogModule, MatDialogTitle
} from '@angular/material/dialog';
import { forkJoin } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DeportistService } from '../../services/deportist.service';
import { LoginService } from '../../services/login.service';
import { RegistroService } from '../../services/registro.service';
import { EventosService } from '../../services/eventos.service';
import { CommonModule } from '@angular/common';
import { Evento } from '../../interfaces/evento';
import { trigger, style, animate, transition } from '@angular/animations';
import { DocumentacionComponent } from '../documentacion/documentacion.component'
import { Deportist } from '../../interfaces/deportist';
import { Usuario } from '../../interfaces/usuario';
import { AuthService } from '../../services/auth.service';
import { CertificadoService } from '../../services/certificado.service';
import { firstValueFrom } from 'rxjs';




@Component({
  selector: 'app-dashboard-deport',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    DeportistComponent,
    MatFormFieldModule,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatMenuModule,
    MatTableModule,
    CommonModule,
    MatDialogModule,
    MatDialogActions,
    MatDialogClose,
    MatDialogContent,
    MatDialogTitle,
    MatTabsModule,
    DocumentacionComponent,


  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-deport.component.html',
  styleUrl: './dashboard-deport.component.scss',
  animations: [
    trigger('fadeInCard', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class DashboardDeportComponent implements OnInit {

  public router = inject(Router);
  private depServ = inject(DeportistService);
  public empadronada: string = "";
  public displayedColumns: string[] = ['apellidoYNombre', 'fechadeNacimiento', 'club', 'categoria'];
  public displayedEventColumns: string[] = ['nombre', 'fecha', 'inscribirse'];
  public dataSource = new MatTableDataSource<Evento>();
  public filterValue = '';
  public pers: any = {};
  readonly dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);
  public eventosInscriptos: Evento[] = [];
  public eventosDisponibles: Evento[] = [];

  public nombre: string = '';
  public club: string = '';
  public categoria: string = '';
  public canUseApp: boolean = true; // o false, como prefieras por defecto

  public fotoPerfilUrl: string = 'assets/img/default-profile.jpg';

  private regServ = inject(RegistroService);
  private authService = inject(AuthService);
  private eventServ = inject(EventosService);
  private certServ = inject(CertificadoService);
  readonly snackBar = inject(MatSnackBar);
  private aplicarUsuarioEnHeader(u: any) {
    this.nombre = u?.nombre || '';
    this.club = u?.padron?.club || u?.club || '';
    this.categoria = u?.padron?.categoria || u?.categoria || '';
    this.fotoPerfilUrl = u?.fotoPerfil || 'assets/img/default-profile.jpg';
  }

  ngOnInit() {
    const usuario = this.authService.getUsuario();
    if (!usuario?.dni) {
      this.router.navigate(['/login']);
      return;
    }
    this.aplicarUsuarioEnHeader(usuario);

    // Gate MVP: si no está aprobado, mostramos un dashboard básico
    this.canUseApp = this.isUsuarioAprobado(usuario);



    // Me suscribo a cambios (foto, nombre...)
    this.authService.user$?.subscribe(u => {
      if (u) {
        this.aplicarUsuarioEnHeader(u);
        this.cdr.markForCheck();
      }
    });
    this.mostrarMisDatos();

    if (this.canUseApp) {
      this.mostrarEventos();
      this.mostrarEventosInscriptos();
    }
  }

  private isUsuarioAprobado(usuario: any): boolean {
    return usuario?.estado === 'aprobado'
      || usuario?.aprobado === true
      || usuario?.aprobado === 1
      || usuario?.aprobado === '1';
  }


  mostrarMisDatos(): void {
    const usuario = this.authService.getUsuario();

    if (!usuario || !usuario.dni) {
      console.warn('No se encontraron datos válidos del usuario logueado.');
      this.router.navigate(['/login']);
      return;
    }

    this.nombre = usuario.nombre || '';
    this.club = usuario?.padron?.club || usuario.club || '';
    this.categoria = usuario?.padron?.categoria || usuario.categoria || '';
    this.fotoPerfilUrl = usuario.fotoPerfil
      ? (usuario.fotoPerfil.startsWith('http')
        ? usuario.fotoPerfil
        : `https://fempapp-back-production.up.railway.app/${usuario.fotoPerfil}`)
        //: `http://localhost:3000/${usuario.fotoPerfil}`)
      : 'assets/img/default-profile.jpg';
    usuario.club = usuario?.padron?.club || '';
    usuario.categoria = usuario?.padron?.categoria || '';
    this.pers = { ...usuario };
    this.pers.fotoPerfilUrl = usuario.fotoPerfil
      ?`https://fempapp-back-production.up.railway.app/${usuario.fotoPerfil}`
      //? `http://localhost:3000/${usuario.fotoPerfil}`
      : 'assets/img/default-profile.jpg';

    this.depServ.getDeportistByDni(usuario.dni).subscribe({
      next: (res: any) => {
        const padron = Array.isArray(res)
          ? res.find((x: any) => String(x.documentoN) === String(usuario.dni))
          : res;

        if (padron) {
          this.pers.padronReferencia = padron;
          this.club = padron.club || this.club;
          this.categoria = padron.categoria || this.categoria;
          console.log('Encontrado en padrón:', padron);
        } else {
          console.warn('Este usuario no está empadronado');
        }

        this.cdr.markForCheck();
      },
      error: (err) => console.error('Error al consultar padrón:', err)
    });
  }

  irAScannerDesdeDashboard(ev: Evento) {
    if (!ev) return;

    this.router.navigate(
      ['/asistencias/scanner'],
      { queryParams: { eventoId: ev.id } }
    );
  }

  mostrarEventos(): void {
    this.eventServ.getEventos().subscribe({
      next: (eventos: Evento[]) => {
        this.eventosDisponibles = eventos ?? [];
        this.dataSource = new MatTableDataSource(this.eventosDisponibles);
        this.cdr.markForCheck();
        console.log('Eventos disponibles:', this.eventosDisponibles);
      },
      error: err => {
        console.error('Error al obtener eventos:', err);
        this.eventosDisponibles = [];
        this.cdr.markForCheck();
      }
    });
  }



  get mostrarEventosEnDashboard(): boolean {
    const path = this.router.url.split('?')[0].replace(/\/+$/, '');
    return path === '/dashboard-deport';
  }

  get mostrarMisDatosEnDashboard(): boolean {
    return this.router.url.includes('/mis-datos');
  }

  get mostrarBackInToolbar(): boolean {
    const path = this.router.url.split('?')[0];
    // Mostrar flecha en subrutas del dashboard (mis-datos / mis-eventos)
    return path.startsWith('/dashboard-deport/mis-datos')
      || path.startsWith('/dashboard-deport/mis-eventos');
  }

  mostrarEventosInscriptos(): void {
    const usuarioDni = this.authService?.loggedUser?.dni;
    if (!usuarioDni) return;

    this.eventServ.getEventosDelUsuario(usuarioDni).subscribe({
      next: (eventos: Evento[]) => {
        this.eventosInscriptos = eventos;
        console.log('Eventos inscriptos:', eventos);
      },
      error: err => {
        console.error('Error al obtener eventos inscriptos:', err);
      }
    });
  }



  inscribirEvento(eventoId: number): void {
    const usuarioId = this.authService?.loggedUser?.id;
    if (!usuarioId) return;

    this.eventServ.inscribirDeportista(eventoId, usuarioId).subscribe({
      next: () => {
        this.snackBar.open('Registro exitoso', 'Cerrar', { duration: 3000 });
        this.mostrarEventosInscriptos();
      },
      error: err => {
        console.error('Error al inscribirse al evento:', err);
        this.snackBar.open('Registro fallido', 'Cerrar', { duration: 3000 });
      }
    });
  }

  seleccionarEvento(evento: Evento): void {
    this.router.navigate(['/evento-detail', evento.id]);
  }

  trackById(_: number, e: Evento) {
    return e.id;
  }

  onAvatarError(e: Event) {
    (e.target as HTMLImageElement).src = 'assets/img/default-profile.jpg';
  }


  subirFotoPerfil(event: any) {
    const file = event.target.files[0];
    const formData = new FormData();
    formData.append('fotoPerfil', file);
    this.depServ.subirFotoPerfil(this.authService.loggedUser.dni
      , formData).subscribe({
        next: (response: any) => {
          console.log('Foto de perfil subida exitosamente', response);
          this.pers.fotoPerfilUrl = response.url;
        },
        error: (e: any) => {
          console.error('Error al subir la foto de perfil', e.error.error);
        }
      });
  }

  actualizarFotoPerfil() {
    this.depServ.obtenerFotoPerfil(this.authService.loggedUser.dni
    ).subscribe({
      next: (response: any) => {
        console.log('Foto de perfil obtenida exitosamente', response);

      },
      error: (e: any) => {
        console.error('Error al obtener la foto de perfil', e.error.error);
      }
    });
  }

  mostrarFotoPerfil() {
    this.depServ.obtenerFotoPerfil(this.authService.loggedUser.dni
    ).subscribe({
      next: (response: any) => {

      },
      error: (e: any) => {
        console.error('Error al mostrar la foto de perfil', e.error.error);
      }
    });
  }

  eliminarFotoPerfil() {
    this.depServ.eliminarFotoPerfil(this.authService.loggedUser.dni
    ).subscribe({
      next: (response: any) => {
        console.log('Foto de perfil eliminada exitosamente', response);

      },
      error: (e: any) => {
        console.error('Error al eliminar la foto de perfil', e.error.error);
      }
    });
  }

  filterData() {
    this.dataSource.filter = this.filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
    this.dataSource.filterPredicate = (data: any, filter: string) => {
      const dataStr = JSON.stringify(data).toLowerCase();
      return dataStr.includes(filter);
    }
  }

  yaInscripto(eventoId: number): boolean {
    return this.eventosInscriptos.some(e => e.id === eventoId);
  }

  volver() {
    this.router.navigate(['/dashboard-deport']);
  }


  logout() { this.authService.logout(); }

  descargarCert(e: Evento) {
    // luego lo conectamos al certService
    console.log('Descargar certificado para', e);
  }




}
