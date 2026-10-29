import { CargaApiService } from './core/carga.interceptor';
import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { Router, RouterOutlet, NavigationStart, NavigationEnd, NavigationCancel, NavigationError, NavigationSkipped } from '@angular/router';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {CargaFempaComponent} from './shared/carga-fempa/carga-fempa.component';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CargaFempaComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss', '../styles.scss']
})
export class AppComponent implements OnInit {
  title = 'FempApp';
  carga = inject(CargaApiService);
  navegando=false;
  private destroyRef=inject(DestroyRef);
  constructor(){
    this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(event=>{
      if(event instanceof NavigationStart)this.navegando=true;
      else if(event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError || event instanceof NavigationSkipped)this.navegando=false;
    });
  }
  private router = inject(Router);
  private authService = inject(AuthService);

  ngOnInit() {
    /*const token = localStorage.getItem('auth_token');
    const usuario = this.authService.getUsuario();

    if (!token || !usuario) {
      this.router.navigate(['/login']);
    } else {
      switch (usuario.rol) {
        case 'deportista':
          this.router.navigate(['/dashboard-deport']);
          break;
        case 'administrador':
          this.router.navigate(['/dashboard-admin']);
          break;
        case 'tecnico':
          this.router.navigate(['/dashboard-tecnico']);
          break;
        default:
          this.router.navigate(['/login']);
          break;
      }
    }
  }*/
  }
}