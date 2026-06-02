import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import {
  NgApexchartsModule,
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexStroke,
  ApexXAxis,
  ApexYAxis,
  ApexGrid,
  ApexTooltip,
  ApexLegend
} from 'ng-apexcharts';

export type EvolucionMensualItem = {
  mes: string;
  valor: number;
};

export type EvolucionChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  dataLabels: ApexDataLabels;
  stroke: ApexStroke;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  grid: ApexGrid;
  tooltip: ApexTooltip;
  legend: ApexLegend;
};

@Component({
  selector: 'app-tecnico-grafico-evolucion',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './tecnico-grafico-evolucion.component.html',
  styleUrls: ['./tecnico-grafico-evolucion.component.scss']
})
export class TecnicoGraficoEvolucionComponent implements OnChanges {
  @Input() data: EvolucionMensualItem[] = [];

  public chartOptions: EvolucionChartOptions = {
    series: [
      {
        name: 'Evolución mensual',
        data: []
      }
    ],
    chart: {
      type: 'line',
      height: 320,
      toolbar: {
        show: false
      },
      animations: {
        enabled: true
      },
      zoom: {
        enabled: false
      }
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth',
      width: 3
    },
    xaxis: {
      categories: []
    },
    yaxis: {
      min: 0,
      max: 100,
      decimalsInFloat: 0
    },
    grid: {
      show: true
    },
    tooltip: {
      enabled: true
    },
    legend: {
      show: true
    }
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.actualizarGrafico();
    }
  }

  private actualizarGrafico(): void {
    const items = Array.isArray(this.data) ? this.data : [];

    this.chartOptions = {
      ...this.chartOptions,
      series: [
        {
          name: 'Evolución mensual',
          data: items.map(item => item.valor)
        }
      ],
      xaxis: {
        ...this.chartOptions.xaxis,
        categories: items.map(item => item.mes)
      }
    };
  }
}