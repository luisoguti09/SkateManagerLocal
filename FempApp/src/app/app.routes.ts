import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DashboardDeportComponent } from './components/dashboard-deport/dashboard-deport.component';
import { RegistroComponent } from './components/registro/registro.component';
import { RegistroFastComponent } from './components/registro-fast/registro-fast.component';
import { DeportistComponent } from './components/deportist/deportist.component';
import { DashboardProfComponent } from './components/dashboard-prof/dashboard-prof.component';
import { EventoDetailComponent } from './components/evento-detail/evento-detail.component';
import { ElementosDetailComponent } from './components/elementos-detail/elementos-detail.component';
import { DashboardTecnicoComponent } from './dashboard-tecnico/dashboard-tecnico.component';
import { DialogsComponent } from './components/dialogs/dialogs.component';
import { UsuariosComponent } from './components/usuarios/usuarios.component';
import { DocumentacionComponent } from './components/documentacion/documentacion.component';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';
import { EventEditorComponent } from './admin/eventos/event-editor/event-editor.component';
import { EventsListComponent } from './admin/eventos/events-list/events-list.component';
import { EventQrComponent } from './admin/eventos/event-qr/event-qr.component';

export const routes: Routes = [

  { path: 'login', component: LoginComponent }, // canActivate: [noAuthGuard] },
  { path: 'registro', component: RegistroComponent }, // canActivate: [noAuthGuard] },
  { path: 'registroFast', component: RegistroFastComponent }, // canActivate: [noAuthGuard] },

  { path: 'deportist', component: DeportistComponent },
  { path: 'evento-detail/:evento', component: EventoDetailComponent },
  { path: 'elementos/:id', component: ElementosDetailComponent },
  { path: 'dialogs', component: DialogsComponent },
  { path: 'usuarios', component: UsuariosComponent },
  { path: 'documentacion', component: DocumentacionComponent },
  { path: 'test', component: LoginComponent },
  {
    path: 'dashboard-deport',
    component: DashboardDeportComponent,
    children: [

      {
        path: 'mis-datos',
        loadComponent: () =>
          import('./components/my-profile/my-profile.component')
            .then(m => m.MyProfileComponent)
      },
      {
        path: 'mis-eventos',
        loadComponent: () =>
          import('./components/evento-detail/evento-detail.component')
            .then(m => m.EventoDetailComponent),
        data: { mode: 'inscriptos' }
      }
    ]
  }, // canActivate: [authGuard] },
  {
    path: 'pago-exitoso',
    loadComponent: () =>
      import('./components/pagos/pago-exitoso/pago-exitoso.component')
        .then(m => m.PagoExitosoComponent),
  },
  {
    path: 'pago-fallido',
    loadComponent: () =>
      import('./components/pagos/pago-fallido/pago-fallido.component')
        .then(m => m.PagoFallidoComponent),
  },
  {
    path: 'pago-pendiente',
    loadComponent: () =>
      import('./components/pagos/pago-pendiente/pago-pendiente.component')
        .then(m => m.PagoPendienteComponent),
  },
  { path: 'dashboard-admin', redirectTo: 'admin', pathMatch: 'full' }, // canActivate: [authGuard] },
  { path: 'dashboard-tecnico', component: DashboardTecnicoComponent }, // canActivate: [authGuard] },
  {
    path: 'dashboard-prof',
    redirectTo: 'dashboard-tecnico',
    pathMatch: 'full'
  }, // canActivate: [authGuard] },
  // Ruta por defecto redirige a login
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'dashboard-admin', redirectTo: 'admin', pathMatch: 'full' },

  {
    path: 'perfil',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/my-profile/my-profile.component').then(c => c.MyProfileComponent),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./admin/admin-shell/admin-shell.component').then(c => c.AdminShellComponent),
    children: [
      { path: '', redirectTo: 'usuarios/pendientes', pathMatch: 'full' },
      {
        path: 'usuarios/pendientes',
        loadComponent: () =>
          import('./admin/users/pending-users/pending-users.component')
            .then(c => c.PendingUsersComponent)
      },
      {
        path: 'usuarios/todos',
        loadComponent: () =>
          import('./admin/users/all-users/all-users.component')
            .then(c => c.AllUsersComponent)
      },
      {
        path: 'qr',
        loadComponent: () =>
          import('./admin/qr/qr-viewer/qr-viewer.component')
            .then(c => c.QrViewerComponent)
      },
    ]
  },
  {
    path: 'asistencias', children: [
      {
        path: '',
        loadComponent: () =>
          import('./components/asistencias-list/asistencias-list.component')
            .then(m => m.AsistenciasListComponent)
      },
      {
        path: 'scanner',
        // canActivate: [authGuard],   deportista debe estar logueado
        loadComponent: () =>
          import('./components/asistencias-scanner/asistencias-scanner.component')
            .then(c => c.AsistenciasScannerComponent)
      }
    ]
  },

  // ...otras
  {
    path: 'eventos/:id/qr',
    loadComponent: () =>
      import('../app/pages/evento-qr-page/evento-qr-page.component')
        .then(m => m.EventoQrPageComponent)
  },
  { path: 'admin/eventos', component: EventsListComponent },
  { path: 'admin/eventos/:id', component: EventEditorComponent },


  // Ruta comodín para rutas inválidas
  { path: '**', redirectTo: 'login' }
];

