import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';

import { RouterModule, Router } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';

import { forkJoin } from 'rxjs';

import { DeportistService } from '../services/deportist.service';
import { ElementosService } from '../services/elementos.service';
import { ComponentesService } from '../services/componentes.service';
import { EvaluacionesService } from '../services/evaluaciones.service';
import { AuthService } from '../services/auth.service';

type ModuloTecnico =
  | 'eventos'
  | 'deportistas'
  | 'elementos'
  | 'componentes'
  | 'evaluacion'
  | null;

@Component({
  selector: 'app-dashboard-tecnico',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    HttpClientModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTableModule,
    MatIconModule
  ],
  templateUrl: './dashboard-tecnico.component.html',
  styleUrls: ['./dashboard-tecnico.component.scss']
})
export class DashboardTecnicoComponent implements OnInit {



  public mostrarModulo = signal<ModuloTecnico>(null);

  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private deportistService = inject(DeportistService);
  private elementosService = inject(ElementosService);
  private componentesService = inject(ComponentesService);
  private evaluacionesService = inject(EvaluacionesService);
  private authService = inject(AuthService);
  private router = inject(Router);

  public deportistas: any[] = [];
  public elementos: any[] = [];
  public componentes: any[] = [];
  public evaluaciones: any[] = [];
  public nuevoElemento = {
    nombre: '',
    categoria: '',
    valor: 0
  };
  public elementosEvaluados: any[] = [];
  public componentesEvaluados: any[] = [];
  public deportistaSeleccionado: any = null;

  evaluacionForm!: FormGroup;
  cargando = false;

  ngOnInit(): void {
    this.evaluacionForm = this.fb.group({
      deportistaId: [''],
      elementoId: [''],
      componenteId: [''],
      notaElemento: [''],
      notaComponente: [''],
      observacion: ['']
    });

    this.cargarDatos();

    this.evaluacionForm.get('deportistaId')?.valueChanges.subscribe(id => {
      if (id) {
        this.cargarEvaluaciones(id);
      }
    });
  }

  cargarDatos(): void {
    this.cargando = true;

    forkJoin({
      deportistas: this.deportistService.getAll(),
      elementos: this.elementosService.getElementos(),
      componentes: this.componentesService.getComponentes()
    }).subscribe({
      next: ({ deportistas, elementos, componentes }) => {
        this.deportistas = deportistas;
        this.elementos = elementos;
        this.componentes = componentes;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error cargando datos del dashboard técnico:', err);
        this.cargando = false;

        this.snackBar.open(
          'Error al cargar datos del panel técnico',
          'Cerrar',
          { duration: 3000 }
        );
      }
    });
  }

  abrirModulo(modulo: ModuloTecnico): void {
    console.log('Módulo seleccionado:', modulo);
    this.mostrarModulo.set(modulo);
  }

  guardarEvaluacion(): void {

    const data = {
      deportistaId: this.evaluacionForm.value.deportistaId,
      observacion: this.evaluacionForm.value.observacion,
      elementos: this.elementosEvaluados,
      componentes: this.componentesEvaluados
    };

    console.log('Evaluación completa:', data);

    this.evaluacionesService.crearEvaluacion(data).subscribe({
      next: (res) => {
        console.log('Evaluación guardada backend:', res);

        this.snackBar.open('Evaluación guardada correctamente', 'Cerrar', {
          duration: 2500
        });

        this.cargarEvaluaciones(data.deportistaId);
      },
      error: (err) => {
        console.error('Error guardando evaluación:', err);

        this.snackBar.open('Error al guardar evaluación', 'Cerrar', {
          duration: 3000
        });
      }
    });
  }

  componenteForm = this.fb.group({
    nombre: [''],
    disciplina: [''],
    categoria: [''],
    puntajeMinimo: [''],
    puntajeMaximo: [''],
    descripcion: ['']
  });

  crearComponente(): void {
    const data = this.componenteForm.value;

    this.componentesService.crearComponente(data).subscribe({
      next: (nuevo) => {
        this.componentes = [...this.componentes, nuevo];
        this.componenteForm.reset();
        this.snackBar.open('Componente creado correctamente', 'Cerrar', { duration: 2500 });
      },
      error: (err) => {
        console.error('Error creando componente:', err);
        this.snackBar.open('Error al crear componente', 'Cerrar', { duration: 2500 });
      }
    });
  }

  cargarEvaluaciones(deportistaId: number): void {

    this.evaluacionesService.getEvaluacionesPorDeportista(deportistaId).subscribe({
      next: (res) => {
        this.evaluaciones = res;
        console.log('Evaluaciones desde backend:', res);
      },
      error: (err) => {
        console.error('Error cargando evaluaciones:', err);
        this.evaluaciones = [];
      }
    });
  }

  crearElemento(): void {
    this.elementosService.crearElemento(this.nuevoElemento).subscribe({
      next: (nuevo) => {
        this.elementos = [...this.elementos, nuevo];

        this.nuevoElemento = {
          nombre: '',
          categoria: '',
          valor: 0
        };

        this.snackBar.open('Elemento creado correctamente', 'Cerrar', {
          duration: 2500
        });
      },
      error: (err) => {
        console.error('Error creando elemento:', err);
        this.snackBar.open('Error al crear elemento', 'Cerrar', {
          duration: 2500
        });
      }
    });
  }

  agregarElemento() {
    this.elementosEvaluados.push({
      elementoId: null,
      nota: null
    });
  }

  agregarComponente() {
    this.componentesEvaluados.push({
      componenteId: null,
      nota: null
    });
  }

  getNombreElemento(id: number): string {
    return this.elementos.find(e => e.id === id)?.nombre || `Elemento ${id}`;
  }

  getNombreComponente(id: number): string {
    return this.componentes.find(c => c.id === id)?.nombre || `Componente ${id}`;
  }
  seleccionarDeportista(deportista: any): void {
    this.deportistaSeleccionado = deportista;

    this.evaluacionForm.patchValue({
      deportistaId: deportista.id
    });

    this.mostrarModulo.set('evaluacion');

    this.cargarEvaluaciones(deportista.id);
  }

  getTotalEvaluaciones(): number {
    return this.evaluaciones.length;
  }

  getPromedioElementos(): number {
    const notas = this.evaluaciones
      .flatMap(ev => ev.elementos || [])
      .map((el: any) => Number(el.nota))
      .filter((n: number) => !isNaN(n));

    if (!notas.length) return 0;

    return notas.reduce((a, b) => a + b, 0) / notas.length;
  }

  getPromedioComponentes(): number {
    const notas = this.evaluaciones
      .flatMap(ev => ev.componentes || [])
      .map((comp: any) => Number(comp.nota))
      .filter((n: number) => !isNaN(n));

    if (!notas.length) return 0;

    return notas.reduce((a, b) => a + b, 0) / notas.length;
  }

  getUltimaEvaluacion(): any {
    return this.evaluaciones?.[0] ?? null;
  }

  getEvolucionElemento(id: number) {
    return this.evaluaciones
      .map(ev => ({
        fecha: ev.createdAt,
        nota: ev.elementos?.find((e: any) => e.elementoId === id)?.nota
      }))
      .filter(e => e.nota !== undefined);
  }

  getEvolucionComponente(id: number) {
    return this.evaluaciones
      .map(ev => ({
        fecha: ev.createdAt,
        nota: ev.componentes?.find((c: any) => c.componenteId === id)?.nota
      }))
      .filter(c => c.nota !== undefined);
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  volver(): void {
    this.router.navigate(['/login']);
  }

}
