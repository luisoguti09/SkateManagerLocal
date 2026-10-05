import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PagosService } from '../../../services/pagos.service';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
@Component({
  selector: 'app-pago-exitoso',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  templateUrl: './pago-exitoso.component.html',
  styleUrls: ['./pago-exitoso.component.scss'],
})
export class PagoExitosoComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private pagos = inject(PagosService);
  paymentId = '';
  cargando = false;
  validado = false;
  error = '';
  estado = '';
  ngOnInit() {
    this.paymentId =
      this.route.snapshot.queryParamMap.get('payment_id') ||
      this.route.snapshot.queryParamMap.get('collection_id') ||
      '';
    this.verificar();
  }
  verificar() {
    if (!this.paymentId) {
      this.error = 'Falta la referencia del pago. Consultá tu inscripción.';
      return;
    }
    this.cargando = true;
    this.error = '';
    this.validado = false;
    this.pagos.validarPago(this.paymentId).subscribe({
      next: (d) => {
        this.estado = d.status;
        this.validado =
          d.status === 'approved' && d.estadoConciliacion === 'ok';
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        this.error =
          'No pudimos verificar el pago. Ingresá con tu cuenta y consultá tu inscripción o reintentá.';
      },
    });
  }
  volver() {
    this.router.navigate(['/dashboard-deport']);
  }
}
