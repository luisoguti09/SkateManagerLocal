import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { TecnicoResumenCardsComponent } from './widgets/tecnico-resumen-cards/tecnico-resumen-cards.component';
import { TecnicoAccesosRapidosComponent } from './widgets/tecnico-accesos-rapidos/tecnico-accesos-rapidos.component';
import { TecnicoUltimosSeguimientosComponent } from './widgets/tecnico-ultimos-seguimientos/tecnico-ultimos-seguimientos.component';
import { DashboardTecnicoData } from '../interfaces/dashboard-tecnico-data';
import { DashboardTecnicoService } from '../services/dashboard-tecnico.service.service';

@Component({
  selector: 'app-dashboard-tecnico',
  standalone: true,
  imports: [
    CommonModule,
    TecnicoResumenCardsComponent,
    TecnicoAccesosRapidosComponent,
    TecnicoUltimosSeguimientosComponent
  ],
  templateUrl: './dashboard-tecnico.component.html',
  styleUrls: ['./dashboard-tecnico.component.scss']
})
export class DashboardTecnicoComponent implements OnInit {
  private readonly dashboardTecnicoService = inject(DashboardTecnicoService);

  public dashboardData: DashboardTecnicoData | null = null;
  public loading = true;
  public error = false;

  ngOnInit(): void {
    this.loadDashboard();
  }

  public loadDashboard(): void {
    this.loading = true;
    this.error = false;

    this.dashboardTecnicoService.getDashboardData().subscribe({
      next: (data) => {
        this.dashboardData = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading dashboard tecnico', err);
        this.error = true;
        this.loading = false;
      }
    });
  }
}