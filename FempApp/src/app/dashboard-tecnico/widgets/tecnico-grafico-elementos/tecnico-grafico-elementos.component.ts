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
  ArcElement,
  DoughnutController,
  Tooltip,
  Legend
} from 'chart.js';
import { MatCardModule } from '@angular/material/card';

Chart.register(
  ArcElement,
  DoughnutController,
  Tooltip,
  Legend
);

@Component({
  selector: 'app-tecnico-grafico-elementos',
  templateUrl: './tecnico-grafico-elementos.component.html',
  styleUrls: ['./tecnico-grafico-elementos.component.scss'],
  imports: [
    MatCardModule,
  ]
})
export class TecnicoGraficoElementosComponent implements AfterViewInit, OnChanges {
  @Input() data!: DashboardTecnicoData['distribucionElementos'];

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
      type: 'doughnut',
      data: {
        labels: this.data.map(item => item.label),
        datasets: [
          {
            data: this.data.map(item => item.value)
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  }
}