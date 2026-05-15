import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard-prof',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
  ],
  templateUrl: './dashboard-prof.component.html',
  styleUrl: './dashboard-prof.component.scss'
})
export class DashboardProfComponent {

}
