import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { DashboardTecnicoData } from '../../../interfaces/dashboard-tecnico-data';
import {
  Chart,
  CategoryScale,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  Legend
} from 'chart.js';
import { MatCardModule } from '@angular/material/card';

Chart.register(
  CategoryScale,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  Legend
);

@Component({
  selector: 'app-tecnico-grafico-evolucion',
  standalone: true,
  templateUrl: './tecnico-grafico-evolucion.component.html',
  styleUrls: ['./tecnico-grafico-evolucion.component.scss'],
  imports: [
    MatCardModule
  ]
})
export class TecnicoGraficoEvolucionComponent implements AfterViewInit, OnChanges {

  @Input() data!: DashboardTecnicoData['evolucionMensual'];

  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

  private chart: Chart | null = null;
  private viewInitialized = false;

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    this.renderChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.viewInitialized) {
      this.renderChart();
    }
  }

  private renderChart(): void {
    if (!this.chartCanvas || !this.data?.length) {
      return;
    }

    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    const context = this.chartCanvas.nativeElement.getContext('2d');
    if (!context) {
      return;
    }

    this.chart = new Chart(context, {
      type: 'line',
      data: {
        labels: this.data.map(item => item.label),
        datasets: [
          {
            label: 'Evolución mensual',
            data: this.data.map(item => item.value),
            tension: 0.35,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }
}