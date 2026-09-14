import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';

import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { PagosService } from '../../services/pagos.service';
import { EventosService } from '../../services/eventos.service';

@Component({
  selector: 'app-dashboard-tesoreria',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './dashboard-tesoreria.component.html',
  styleUrl: './dashboard-tesoreria.component.scss'
})
export class DashboardTesoreriaComponent implements OnInit, OnDestroy {
  cargando = false;
  pagosCargados = false;
  errorPagos = '';
  errorEventos = '';
  errorClubes = '';
  private solicitudPagos?: Subscription;
  private solicitudClubes?: Subscription;
  private solicitudEventos?: Subscription;

  get datosDisponibles(): boolean {
    return this.pagosCargados && !this.cargando && !this.errorPagos;
  }

  get clubSeleccionado(): string {
    if (this.filtros.clubId === null && this.filtros.clubSedeId === null) return '';
    return `${this.filtros.clubId ?? 'null'}|${this.filtros.clubSedeId ?? 'null'}`;
  }

  eventos: any[] = [];
  clubes: any[] = [];
  pagos: any[] = [];

  dataSource = new MatTableDataSource<any>([]);

  resumen = {
    totalPagos: 0,
    pagados: 0,
    pendientes: 0,
    observados: 0,
    totalInscripcion: 0,
    totalComisionSkateManager: 0,
    totalGeneral: 0
  };

  filtros = {
    eventoId: null as number | null,
    clubId: null as number | null,
    clubSedeId: null as number | null,
    estado: '' as '' | 'pagado' | 'pendiente' | 'observado',
    buscar: '',
    fechaDesde: '',
    fechaHasta: ''
  };

  columnas: string[] = [
    'createdAt',
    'eventoNombreSnapshot',
    'deportistaNombreSnapshot',
    'deportistaDniSnapshot',
    'clubSnapshot',
    'cantidadParticipaciones',
    'montoBase',
    'montoComision',
    'montoTotal',
    'estadoPago',
    'estadoConciliacion'
  ];

  @ViewChild(MatPaginator) set paginator(value: MatPaginator | undefined) {
    this.dataSource.paginator = value ?? null;
  }
  @ViewChild(MatSort) set sort(value: MatSort | undefined) {
    this.dataSource.sort = value ?? null;
  }

  constructor(
    private pagosService: PagosService,
    private eventosService: EventosService,
    public auth: AuthService
  ) { }

  ngOnInit(): void {
    this.cargarEventos();
    this.cargarClubes();
    this.cargarPagos();
  }

  ngOnDestroy(): void {
    this.solicitudPagos?.unsubscribe();
    this.solicitudClubes?.unsubscribe();
    this.solicitudEventos?.unsubscribe();
  }

  logout(): void {
    this.auth.logout();
  }

  cargarEventos(): void {
    this.solicitudEventos?.unsubscribe();
    this.errorEventos = '';
    this.solicitudEventos = this.eventosService.getEventos().subscribe({
      next: (eventos: any[]) => {
        this.eventos = eventos || [];
      },
      error: (error: any) => {
        console.error('Error cargando eventos:', error);
        this.errorEventos = 'No se pudo cargar el listado de eventos.';
      }
    });
  }

  cargarPagos(): void {
    this.solicitudPagos?.unsubscribe();
    this.cargando = true;
    this.errorPagos = '';
    this.pagosCargados = false;

    const filtrosLimpios = {
      eventoId: this.filtros.eventoId ?? null,
      clubId: this.filtros.clubId ?? null,
      clubSedeId: this.filtros.clubSedeId ?? null,
      estado: this.filtros.estado || null,
      buscar: this.filtros.buscar || null,
      fechaDesde: this.filtros.fechaDesde || null,
      fechaHasta: this.filtros.fechaHasta || null
    };

    this.solicitudPagos = this.pagosService.listarPagos(filtrosLimpios).subscribe({
      next: (pagos: any[]) => {
        this.pagos = pagos || [];
        this.dataSource.data = this.pagos;
        this.dataSource.paginator?.firstPage();

        this.calcularResumenLocal();
        this.pagosCargados = true;
        this.cargando = false;
      },
      error: (error: any) => {
        console.error('Error cargando pagos:', error);
        this.pagos = [];
        this.dataSource.data = [];
        this.calcularResumenLocal();
        this.errorPagos = 'No pudimos cargar los pagos. Los importes y el listado no están disponibles. Intentá nuevamente.';
        this.cargando = false;
      }
    });
  }

  cargarClubes(): void {
    this.solicitudClubes?.unsubscribe();
    this.errorClubes = '';
    this.clubes = [];
    const eventoId = this.filtros.eventoId ?? null;

    this.solicitudClubes = this.pagosService.obtenerClubesFiltro(eventoId).subscribe({
      next: (clubes: any[]) => {
        this.clubes = clubes || [];
      },
      error: (error: any) => {
        console.error('Error cargando clubes:', error);
        this.errorClubes = 'No se pudo cargar el listado de clubes y sedes.';
      }
    });
  }

  aplicarFiltros(): void {
    this.cargarPagos();
  }

  limpiarFiltros(): void {
    this.filtros = {
      eventoId: null,
      clubId: null,
      clubSedeId: null,
      estado: '',
      buscar: '',
      fechaDesde: '',
      fechaHasta: ''
    };

    this.cargarClubes();
    this.cargarPagos();
  }

  onEventoChange(): void {
    this.filtros.clubId = null;
    this.filtros.clubSedeId = null;
    this.cargarClubes();
    this.aplicarFiltros();
  }

  onClubChange(value: string): void {
    if (!value) {
      this.filtros.clubId = null;
      this.filtros.clubSedeId = null;
      this.aplicarFiltros();
      return;
    }

    const [clubId, clubSedeId] = value.split('|');

    this.filtros.clubId = clubId !== 'null' ? Number(clubId) : null;
    this.filtros.clubSedeId = clubSedeId !== 'null' ? Number(clubSedeId) : null;

    this.aplicarFiltros();
  }

  calcularResumenLocal(): void {
    const base = {
      totalPagos: 0,
      pagados: 0,
      pendientes: 0,
      observados: 0,
      totalInscripcion: 0,
      totalComisionSkateManager: 0,
      totalGeneral: 0
    };

    this.resumen = this.pagos.reduce((acc, pago) => {
      acc.totalPagos += 1;

      acc.totalInscripcion += Number(pago.montoBase || 0);
      acc.totalComisionSkateManager += Number(pago.montoComision || 0);
      acc.totalGeneral += Number(pago.montoTotal || 0);

      if (pago.estadoPago === 'approved' && pago.estadoConciliacion === 'ok') {
        acc.pagados += 1;
      } else if (pago.estadoPago === 'pendiente' || pago.estadoPago === 'pending') {
        acc.pendientes += 1;
      } else {
        acc.observados += 1;
      }

      return acc;
    }, base);
  }

  formatoMoneda(valor: any): string {
    const numero = Number(valor || 0);

    return numero.toLocaleString('es-AR', {
      style: 'currency',
      currency: 'ARS'
    });
  }

  estadoPagoLabel(estado: string): string {
    const mapa: Record<string, string> = {
      approved: 'Pagado',
      pending: 'Pendiente MP',
      pendiente: 'Pendiente',
      rejected: 'Rechazado',
      cancelled: 'Cancelado',
      refunded: 'Devuelto',
      charged_back: 'Contracargo'
    };

    return mapa[estado] || estado || 'Sin estado';
  }

  estadoConciliacionLabel(estado: string): string {
    const mapa: Record<string, string> = {
      ok: 'Conciliado',
      pendiente: 'Pendiente',
      requiere_revision: 'Requiere revisión'
    };

    return mapa[estado] || estado || 'Sin estado';
  }

  exportarCsv(): void {
    if (!this.datosDisponibles || !this.pagos.length) return;
    const headers = [
      'Fecha',
      'Evento',
      'Deportista',
      'DNI',
      'Club',
      'Sede',
      'Participaciones',
      'Monto base',
      'Comision',
      'Total',
      'Estado pago',
      'Conciliacion',
      'Payment ID',
      'Preference ID',
      'External Reference'
    ];

    const rows = this.pagos.map((pago) => [
      pago.createdAt || '',
      pago.eventoNombreSnapshot || '',
      pago.deportistaNombreSnapshot || '',
      pago.deportistaDniSnapshot || '',
      pago.clubSnapshot || '',
      pago.clubSedeSnapshot || '',
      pago.cantidadParticipaciones || '',
      pago.montoBase || '',
      pago.montoComision || '',
      pago.montoTotal || '',
      pago.estadoPago || '',
      pago.estadoConciliacion || '',
      pago.paymentId || '',
      pago.preferenceId || '',
      pago.externalReference || ''
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `pagos_tesoreria_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    window.URL.revokeObjectURL(url);
  }
}
