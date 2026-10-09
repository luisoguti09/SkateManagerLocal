import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timeout } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { PagosService } from '../../../services/pagos.service';
import { AuthService } from '../../../services/auth.service';
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
  private auth = inject(AuthService);
  eventoDestino: number | null = null;
  private destroyRef = inject(DestroyRef);
  private redireccion?: ReturnType<typeof setTimeout>;
  paymentId = '';
  cargando = false;
  validado = false;
  error = '';
  estado = '';
  ngOnInit() {
    this.destroyRef.onDestroy(() => clearTimeout(this.redireccion));
    this.paymentId =
      this.route.snapshot.queryParamMap.get('payment_id') ||
      this.route.snapshot.queryParamMap.get('collection_id') ||
      '';
    this.verificar();
  }
  verificar() {
    if (this.cargando) return;
    clearTimeout(this.redireccion);
    if (!this.paymentId) {
      this.error = 'Falta la referencia del pago. Consultá tu inscripción.';
      return;
    }
    this.cargando = true;
    this.error = '';
    this.validado = false;
    this.pagos.validarPago(this.paymentId).pipe(
      timeout(20000),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (d) => {
        this.estado = d.status;
        this.validado =
          d.status === 'approved' && d.estadoConciliacion === 'ok';
        this.cargando = false;
        if (this.validado) {
          this.eventoDestino = this.recuperarEvento();
          this.redireccion = setTimeout(() => this.volver(), 1800);
        }
      },
      error: () => {
        this.cargando = false;
        this.error =
          'No pudimos verificar el pago. Ingresá con tu cuenta y consultá tu inscripción o reintentá.';
      },
    });
  }
  private recuperarEvento(): number | null {
    const preferenceId = this.route.snapshot.queryParamMap.get('preference_id');
    if (!preferenceId) return null;
    try {
      const contexto = JSON.parse(sessionStorage.getItem('fempa.checkout.' + preferenceId) || 'null');
      const usuarioId = this.auth.getUsuario()?.id;
      const eventoId = Number(contexto?.eventoId);
      if (usuarioId != null && String(contexto?.usuarioId) === String(usuarioId) &&
          Number.isSafeInteger(eventoId) && eventoId > 0) return eventoId;
    } catch { /* Contexto ausente o inválido: usar Mis eventos. */ }
    return null;
  }
  volver() {
    clearTimeout(this.redireccion);
    const destino = this.validado && this.eventoDestino
      ? ['/evento-detail', this.eventoDestino]
      : ['/dashboard-deport/mis-eventos'];
    void this.router.navigate(destino, { replaceUrl: true });
  }
}
