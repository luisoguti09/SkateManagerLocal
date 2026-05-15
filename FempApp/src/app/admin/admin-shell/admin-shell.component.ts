import { Component, ViewChild, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-admin-shell',
  imports: [
    CommonModule, 
    RouterLink, 
    RouterOutlet,
    MatSidenavModule, 
    MatToolbarModule, 
    MatListModule, 
    MatIconModule, 
    MatButtonModule
  ],
  templateUrl: './admin-shell.component.html',
  styleUrls: ['./admin-shell.component.scss']
})
export class AdminShellComponent {

  @ViewChild('sidenav') sidenav!: MatSidenav;

  private bp = inject(BreakpointObserver);
  private location = inject(Location);
  private auth = inject(AuthService);
  private router = inject(Router);

  public mode: 'side' | 'over' = 'side';
  public opened: boolean  = true;

  ngOnInit() {

    this.bp.observe([Breakpoints.Medium, Breakpoints.Small, Breakpoints.XSmall])
      .subscribe(state => {
        const isSmall = state.matches;
        this.mode = isSmall ? 'over' : 'side';
        this.opened = !isSmall;
      });

  }

  toggleSide() {
     if (this.sidenav) this.sidenav.toggle(); 
    }

  closeOnNav() { 
    if (this.mode === 'over' && this.sidenav) this.sidenav.close(); 
  }

  back() {
     this.location.back();
     }

     logout() {
  this.auth.logout();           
  this.router.navigate(['/login']);
}

}
