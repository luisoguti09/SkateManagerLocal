import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PagosService {
  
  private apiURL = environment.SERVER_API;
  private http = inject(HttpClient);

  crearPreferencia(body: {
    title: string;
    quantity: number;
    unit_price: number;
    external_reference?: string;
  }): Observable<{ init_point: string; id: string }> {
    return this.http.post<{ init_point: string; id: string }>(
      `${this.apiURL}/pagos/crear-preferencia`,
      body
    );
  }

  
validarPago(paymentId: string) {
  return this.http.get<any>(`${this.apiURL}/pagos/confirmar?payment_id=${paymentId}`);
}
  
}