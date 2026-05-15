import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  standalone: true,
  selector: 'app-pago-pendiente',
  templateUrl: './pago-pendiente.component.html',
  styleUrls: ['./pago-pendiente.component.scss'],
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
})
export class PagoPendienteComponent {
  private router = inject(Router);

  ngOnInit() {
    setTimeout(() => this.router.navigate(['/dashboard-deport']), 6000);
  }

  volver() {
    this.router.navigate(['/dashboard-deport']);
  }
}
