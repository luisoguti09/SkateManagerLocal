import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

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
export class DashboardTesoreriaComponent implements OnInit {
  cargando = false;

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

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private pagosService: PagosService,
    private eventosService: EventosService
  ) { }

  ngOnInit(): void {
    this.cargarEventos();
    this.cargarPagos();
  }

  cargarEventos(): void {
    this.eventosService.getEventos().subscribe({
      next: (eventos: any[]) => {
        this.eventos = eventos || [];
      },
      error: (error: any) => {
        console.error('Error cargando eventos:', error);
      }
    });
  }

  cargarPagos(): void {
    this.cargando = true;

    const filtrosLimpios = {
      eventoId: this.filtros.eventoId ?? null,
      clubId: this.filtros.clubId ?? null,
      clubSedeId: this.filtros.clubSedeId ?? null,
      estado: this.filtros.estado || null,
      buscar: this.filtros.buscar || null,
      fechaDesde: this.filtros.fechaDesde || null,
      fechaHasta: this.filtros.fechaHasta || null
    };

    this.pagosService.listarPagos(filtrosLimpios).subscribe({
      next: (pagos: any[]) => {
        this.pagos = pagos || [];
        this.dataSource = new MatTableDataSource<any>(this.pagos);

        setTimeout(() => {
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;
        });

        this.calcularResumenLocal();
        this.cargarClubes();

        this.cargando = false;
      },
      error: (error: any) => {
        console.error('Error cargando pagos:', error);
        this.cargando = false;
      }
    });
  }

  cargarResumenEvento(): void {
    if (!this.filtros.eventoId) {
      this.calcularResumenLocal();
      return;
    }

    this.pagosService.obtenerResumenEvento(this.filtros.eventoId).subscribe({
      next: (resumen: any) => {
        this.resumen = resumen;
      },
      error: (error: any) => {
        console.error('Error cargando resumen de evento:', error);
      }
    });
  }

  cargarClubes(): void {
    const eventoId = this.filtros.eventoId ?? null;

    this.pagosService.obtenerClubesFiltro(eventoId).subscribe({
      next: (clubes: any[]) => {
        this.clubes = clubes || [];
      },
      error: (error: any) => {
        console.error('Error cargando clubes:', error);
      }
    });
  }

  aplicarFiltros(): void {
    this.cargarPagos();
    this.cargarResumenEvento();
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
      } else if (pago.estadoPago === 'pendiente') {
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