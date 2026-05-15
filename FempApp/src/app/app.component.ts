import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss', '../styles.scss']
})
export class AppComponent implements OnInit {
  title = 'FempApp';
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