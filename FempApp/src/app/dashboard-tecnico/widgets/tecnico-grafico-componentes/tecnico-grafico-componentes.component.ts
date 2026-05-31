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
  ArcElement,
  DoughnutController,
  Tooltip,
  Legend
} from 'chart.js';

Chart.register(ArcElement, DoughnutController, Tooltip, Legend);

@Component({
  selector: 'app-tecnico-grafico-componentes',
  standalone: true,
  templateUrl: './tecnico-grafico-componentes.component.html',
  styleUrls: ['./tecnico-grafico-componentes.component.scss'],
  imports: [MatCardModule]
})
export class TecnicoGraficoComponentesComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() data!: DashboardTecnicoData['distribucionComponentes'];
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
      type: 'doughnut',
      data: {
        labels: this.data.map(item => item.label),
        datasets: [
          {
            data: this.data.map(item => item.value),
            backgroundColor: [
              '#60a5fa',
              '#34d399',
              '#f59e0b',
              '#f472b6',
              '#a78bfa'
            ],
            borderColor: '#111827',
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#cbd5e1'
            }
          }
        }
      }
    });
  }
}