import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  standalone: true,
  selector: 'app-pago-fallido',
  templateUrl: './pago-fallido.component.html',
  styleUrls: ['./pago-fallido.component.scss'],
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
})
export class PagoFallidoComponent {
  private router = inject(Router);

  volver() {
    this.router.navigate(['/dashboard-deport']);
  }
}
