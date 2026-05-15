// pago-exitoso.component.ts (idéntico patrón para fallido/pendiente)
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { take } from 'rxjs/operators';
import { PagosService } from '../../../services/pagos.service';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-pago-exitoso',
  standalone: true, 
  imports: [CommonModule, MatButtonModule],
  templateUrl: './pago-exitoso.component.html',
  styleUrls: ['./pago-exitoso.component.scss']
})
export class PagoExitosoComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private pagos = inject(PagosService);

  public status = '';
  public paymentId = '';
  public preferenceId = '';
  public externalRef = '';
  public validado = false;
  public detalleValidacion: any;

  ngOnInit() {
    this.route.queryParams.pipe(take(1)).subscribe((p: Params) => {
      // Leer parámetros que envía MercadoPago
      // https://www.mercadopago.com.ar/developers/es/guides/online-payments/checkout-pro/integration/
      this.status       = p['status'] || p['collection_status'] || '';
      this.paymentId    = p['payment_id'] || p['collection_id'] || '';
      this.preferenceId = p['preference_id'] || '';
      this.externalRef  = p['external_reference'] || ''; 

      console.log('status:', this.status);
      console.log('payment_id:', this.paymentId);
      console.log('preference_id:', this.preferenceId);

      // validar del lado del server
      if (this.paymentId) {
        this.pagos.validarPago(this.paymentId).subscribe({
          next: d => { this.validado = true; this.detalleValidacion = d; },
          error: _ => { this.validado = false; }
        });
      }

      // Redirigir suave al dashboard
      setTimeout(() => this.router.navigate(['/dashboard-deport']), 4000);
    });
  }

  volver() {
    this.router.navigate(['/dashboard-deport']);
  }
}
