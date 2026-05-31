import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { DashboardTecnicoData } from '../../../interfaces/dashboard-tecnico-data';
import { MatCardModule } from '@angular/material/card';
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
  imports: [MatCardModule]
})
export class TecnicoGraficoEvolucionComponent implements AfterViewInit, OnChanges, OnDestroy {
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

  ngOnDestroy(): void {
    this.destroyChart();
  }

  private destroyChart(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  private renderChart(): void {
    if (!this.chartCanvas || !this.data?.length) {
      return;
    }

    this.destroyChart();

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
            fill: false,
            borderColor: '#60a5fa',
            backgroundColor: '#60a5fa',
            pointBackgroundColor: '#93c5fd',
            pointBorderColor: '#93c5fd',
            pointRadius: 4,
            pointHoverRadius: 5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: {
            labels: {
              color: '#cbd5e1'
            }
          }
        },
        scales: {
          x: {
            ticks: {
              color: '#94a3b8'
            },
            grid: {
              color: 'rgba(148, 163, 184, 0.12)'
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: '#94a3b8'
            },
            grid: {
              color: 'rgba(148, 163, 184, 0.12)'
            }
          }
        }
      }
    });
  }
}