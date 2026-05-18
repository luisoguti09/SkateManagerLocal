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

  listarPagos(filtros?: {
    eventoId?: number | null;
    clubId?: number | null;
    clubSedeId?: number | null;
    estado?: 'pagado' | 'pendiente' | 'observado' | '' | null;
    buscar?: string | null;
    fechaDesde?: string | null;
    fechaHasta?: string | null;
  }) {
    const params: any = {};

    if (filtros?.eventoId !== null && filtros?.eventoId !== undefined) {
      params.eventoId = filtros.eventoId;
    }

    if (filtros?.clubId !== null && filtros?.clubId !== undefined) {
      params.clubId = filtros.clubId;
    }

    if (filtros?.clubSedeId !== null && filtros?.clubSedeId !== undefined) {
      params.clubSedeId = filtros.clubSedeId;
    }

    if (filtros?.estado) {
      params.estado = filtros.estado;
    }

    if (filtros?.buscar?.trim()) {
      params.buscar = filtros.buscar.trim();
    }

    if (filtros?.fechaDesde) {
      params.fechaDesde = filtros.fechaDesde;
    }

    if (filtros?.fechaHasta) {
      params.fechaHasta = filtros.fechaHasta;
    }

    return this.http.get<any[]>(`${this.apiURL}/pagos`, { params });
  }

  obtenerResumenEvento(eventoId: number) {
    return this.http.get<any>(
      `${this.apiURL}/pagos/resumen/evento/${eventoId}`
    );
  }

  obtenerClubesFiltro(eventoId?: number | null) {
    const params: any = {};

    if (eventoId !== null && eventoId !== undefined) {
      params.eventoId = eventoId;
    }

    return this.http.get<any[]>(
      `${this.apiURL}/pagos/filtros/clubes`,
      { params }
    );
  }

}