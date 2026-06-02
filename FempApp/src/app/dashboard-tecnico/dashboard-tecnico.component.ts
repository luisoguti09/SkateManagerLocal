import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, FormControl } from '@angular/forms';
import { Observable, startWith, map } from 'rxjs';

import { RouterModule, Router } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

import { forkJoin } from 'rxjs';

import { DeportistService } from '../services/deportist.service';
import { ElementosService } from '../services/elementos.service';
import { ComponentesService } from '../services/componentes.service';
import { EvaluacionesService } from '../services/evaluaciones.service';
import { AuthService } from '../services/auth.service';
import { UltimoSeguimiento } from '../interfaces/ultimo-seguimiento.interface';
import { TecnicoUltimosSeguimientosComponent } from './widgets/tecnico-ultimos-seguimientos/tecnico-ultimos-seguimientos.component';
import { TecnicoGraficoEvolucionComponent } from './widgets/tecnico-grafico-evolucion/tecnico-grafico-evolucion.component';
import { VariacionElemento } from '../interfaces/variacion-elemento.interface';

type ModuloTecnico =
  | 'eventos'
  | 'deportistas'
  | 'elementos'
  | 'componentes'
  | 'evaluacion'
  | 'historial-tecnico'
  | 'analisis-tecnico'
  | null;

@Component({
  selector: 'app-dashboard-tecnico',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTableModule,
    MatIconModule,
    MatAutocompleteModule,
    TecnicoUltimosSeguimientosComponent,
    TecnicoGraficoEvolucionComponent
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
  public estadoEvaluacion: 'nueva' | 'editando' | 'guardada' = 'nueva';
  public evaluacionSeleccionada: any = null;
  public evaluacionGuardada: boolean = false;
  public elementosDeclarados: any[] = [];
  public deportistaSearchControl = new FormControl('');
  public deportistasFiltrados$!: Observable<any[]>;
  public ultimosSeguimientos: UltimoSeguimiento[] = [];
  public resumenTecnico = {
    deportistasActivos: 0,
    evaluacionesMes: 0,
    componentesActivos: 0,
    elementosActivos: 0
  };
  public tiposEvaluacion = [
    { value: 'LIBRE', label: 'Libre' },
    { value: 'FO', label: 'F.O. / Figuras Obligatorias' },
    { value: 'DANZA', label: 'Danza' }
  ];
  public filtrosHistorial = {
    buscar: '',
    tipoEvaluacion: '',
    fechaDesde: '',
    fechaHasta: ''
  };

  public evolucionMensualGeneral: { mes: string; valor: number }[] = [];
  public evaluacionForm!: FormGroup;
  public cargando: boolean = false;
  public historialTecnico: any[] = [];
  public evaluacionHistorialSeleccionada: any = null;
  public historialResultadosBusqueda: any[] = [];
  public deportistasMap: Record<number, any> = {};
  public historialListadoCompleto: any[] = [];
  public variacionesElementosDeportista: VariacionElemento[] = [];

  ngOnInit(): void {
    this.evaluacionForm = this.fb.group({
      deportistaId: [''],
      tipoEvaluacion: ['LIBRE'],
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

        this.inicializarFiltroDeportistas();

        this.resumenTecnico = {
          deportistasActivos: this.deportistas.length,
          evaluacionesMes: 0,
          componentesActivos: this.componentes.filter((c: any) => c.activo === true || c.activo === 1).length,
          elementosActivos: this.elementos.filter((e: any) => e.activo === true || e.activo === 1).length
        };

        this.cargarHistorialTecnicoInicial();
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

    if (modulo === 'historial-tecnico') {
      this.cargarHistorialTecnico();
    }
  }

  private cargarHistorialTecnicoInicial(): void {
    this.evaluacionesService.getEvaluaciones().subscribe({
      next: (evaluaciones: any[]) => {
        this.historialTecnico = evaluaciones || [];
        this.resumenTecnico.evaluacionesMes = this.contarEvaluacionesMesActual(this.historialTecnico);
        this.ultimosSeguimientos = this.construirUltimosSeguimientos(this.historialTecnico);
        this.evolucionMensualGeneral = this.construirEvolucionMensualGeneral(this.historialTecnico);
        this.aplicarFiltrosHistorialFrontend();
      },
      error: (err) => {
        console.error('Error cargando historial técnico inicial:', err);
        this.ultimosSeguimientos = [];
      }
    });
  }

  private contarEvaluacionesMesActual(evaluaciones: any[]): number {
    const hoy = new Date();
    const mes = hoy.getMonth();
    const anio = hoy.getFullYear();

    return (evaluaciones || []).filter((ev: any) => {
      const fecha = new Date(ev.fechaEvaluacion || ev.createdAt);
      return fecha.getMonth() === mes && fecha.getFullYear() === anio;
    }).length;
  }

  private construirUltimosSeguimientos(evaluaciones: any[]): UltimoSeguimiento[] {
    const mapa = new Map<number, UltimoSeguimiento>();

    for (const ev of evaluaciones || []) {
      const deportistaId = Number(ev.deportistaId);
      if (!deportistaId) continue;

      const fecha = new Date(ev.fechaEvaluacion || ev.createdAt);
      const actual = mapa.get(deportistaId);

      if (!actual || actual.fechaUltimaEvaluacion.getTime() < fecha.getTime()) {
        const elementos = Array.isArray(ev.elementos) ? ev.elementos : [];
        const componentes = Array.isArray(ev.componentes) ? ev.componentes : [];

        const notas = [
          ...elementos
            .map((el: any) => Number(el.nota))
            .filter((n: number) => Number.isFinite(n)),
          ...componentes
            .map((comp: any) => Number(comp.nota))
            .filter((n: number) => Number.isFinite(n))
        ];

        const progreso = notas.length
          ? Math.round(notas.reduce((acc: number, n: number) => acc + n, 0) / notas.length)
          : 0;

        const deportista = this.deportistas.find(
          (d: any) => Number(d.id) === deportistaId
        );

        mapa.set(deportistaId, {
          deportistaId,
          nombreCompleto:
            deportista?.apellidoYNombre ||
            deportista?.nombre ||
            `ID ${deportistaId}`,
          disciplina: ev.tipoEvaluacion || 'LIBRE',
          nivel: deportista?.nivel || deportista?.categoria || '-',
          fechaUltimaEvaluacion: fecha,
          progreso,
          cantidadElementos: elementos.length,
          cantidadComponentes: componentes.length,
          observacion: ev.observacion || ''
        });
      }
    }

    return Array.from(mapa.values())
      .sort(
        (a, b) =>
          b.fechaUltimaEvaluacion.getTime() - a.fechaUltimaEvaluacion.getTime()
      )
      .slice(0, 8);
  }

  guardarEvaluacion(): void {
    const deportistaId = this.evaluacionForm.value.deportistaId;

    if (!deportistaId) {
      this.snackBar.open('Seleccioná una deportista antes de guardar', 'Cerrar', {
        duration: 3000
      });
      return;
    }

    const notasInvalidasElementos = this.elementosEvaluados.some((e: any) => {
      const n = Number(e.nota);
      return e.nota !== null && e.nota !== '' && e.nota !== undefined && (!Number.isFinite(n) || n < 0 || n > 100);
    });

    const notasInvalidasComponentes = this.componentesEvaluados.some((c: any) => {
      const n = Number(c.nota);
      return c.nota !== null && c.nota !== '' && c.nota !== undefined && (!Number.isFinite(n) || n < 0 || n > 100);
    });

    if (notasInvalidasElementos || notasInvalidasComponentes) {
      this.snackBar.open('Las notas deben estar entre 0 y 100.', 'Cerrar', {
        duration: 3000
      });
      return;
    }

    const data = {
      deportistaId,
      tipoEvaluacion: this.evaluacionForm.value.tipoEvaluacion || 'LIBRE',
      origen: 'TECNICA',
      fechaEvaluacion: new Date(),
      observacion: this.evaluacionForm.value.observacion,
      elementos: this.elementosEvaluados,
      componentes: this.componentesEvaluados
    };

    console.log('Evaluación completa:', data);

    this.evaluacionesService.crearEvaluacion(data).subscribe({
      next: (resp) => {
        this.evaluacionSeleccionada = resp;
        this.evaluacionGuardada = true;
        this.estadoEvaluacion = 'guardada';

        this.snackBar.open('Evaluación guardada correctamente', 'Cerrar', {
          duration: 3000
        });

        this.cargarEvaluaciones(deportistaId);
      },
      error: (err) => {
        console.error('Error guardando evaluación:', err);

        this.snackBar.open('Error al guardar evaluación', 'Cerrar', {
          duration: 3000
        });
      }
    });
  }

  resetearEvaluacion(): void {
    this.evaluacionForm.reset({
      deportistaId: null,
      tipoEvaluacion: 'LIBRE',
      observacion: ''
    });

    this.deportistaSearchControl.setValue('', { emitEvent: true });

    this.deportistaSeleccionado = null;
    this.evaluacionSeleccionada = null;

    this.elementosDeclarados = [];
    this.elementosEvaluados = [];
    this.componentesEvaluados = [];

    this.evaluacionGuardada = false;
    this.estadoEvaluacion = 'nueva';

    this.evaluaciones = [];

    this.evaluacionForm.markAsPristine();
    this.evaluacionForm.markAsUntouched();
  }

  nuevaEvaluacion(): void {
    this.resetearEvaluacion();
  }

  editarEvaluacionActual(): void {
    this.estadoEvaluacion = 'editando';
    this.evaluacionGuardada = false;

    this.snackBar.open('Podés corregir la evaluación antes de volver a guardar', 'Cerrar', {
      duration: 2500
    });
  }

  abrirNuevaEvaluacion(): void {
    this.mostrarModulo.set('evaluacion');
    this.resetearEvaluacion();
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

  agregarElemento(): void {
    this.elementosEvaluados.push({
      elementoId: null,
      elementoSearch: '',
      nota: null,
      observacion: ''
    });
  }

  agregarComponente(): void {
    this.componentesEvaluados.push({
      componenteId: null,
      nota: null,
      observacion: ''
    });
  }

  normalizarBusqueda(value: any): string {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  filtrarElementosParaFila(valor: string): any[] {
    const term = this.normalizarBusqueda(valor);
    const base = this.getElementosFiltradosPorTipo();

    if (!term) {
      return base.slice(0, 25);
    }

    return base
      .filter((e: any) => {
        const nombre = this.normalizarBusqueda(e.nombre);
        const codigo = this.normalizarBusqueda(e.codigo);
        const disciplina = this.normalizarBusqueda(e.disciplina);
        const categoria = this.normalizarBusqueda(e.categoria);

        return (
          nombre.includes(term) ||
          codigo.includes(term) ||
          disciplina.includes(term) ||
          categoria.includes(term)
        );
      })
      .slice(0, 25);
  }

  seleccionarElementoFila(fila: any, elemento: any): void {
    fila.elementoId = elemento.id;
    fila.elementoSearch = `${elemento.nombre}${elemento.codigo ? ' · ' + elemento.codigo : ''}`;
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

    this.variacionesElementosDeportista =
      this.construirVariacionPorElemento(deportista.id);
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

  inicializarFiltroDeportistas(): void {
    this.deportistasFiltrados$ = this.deportistaSearchControl.valueChanges.pipe(
      startWith(''),
      map(value => {
        const texto = typeof value === 'string'
          ? value
          : this.getNombreDeportista(value);

        return this.filtrarDeportistas(texto || '');
      })
    );
  }

  filtrarDeportistas(texto: string): any[] {
    const filtro = texto.toLowerCase().trim();

    if (!filtro) {
      return this.deportistas;
    }

    return this.deportistas.filter((d: any) => {
      const nombre = (d.apellidoYNombre || d.nombre || '').toLowerCase();
      const dni = String(d.documentoN || d.dni || '').toLowerCase();
      const club = (d.club || '').toLowerCase();

      return (
        nombre.includes(filtro) ||
        dni.includes(filtro) ||
        club.includes(filtro)
      );
    });
  }

  getNombreDeportista(deportista: any): string {
    if (!deportista) return '';

    return deportista.apellidoYNombre || deportista.nombre || '';
  }

  displayDeportista = (deportista: any): string => {
    if (!deportista) return '';

    const nombre = deportista.apellidoYNombre || deportista.nombre || 'Sin nombre';
    const dni = deportista.documentoN || deportista.dni || 'Sin DNI';

    return `${nombre} - DNI: ${dni}`;
  };

  onDeportistaAutocompleteSelected(deportista: any): void {
    if (!deportista) return;

    this.deportistaSeleccionado = deportista;

    this.evaluacionForm.patchValue({
      deportistaId: deportista.id
    });

    this.cargarEvaluaciones(deportista.id);

    this.variacionesElementosDeportista =
      this.construirVariacionPorElemento(deportista.id);
  }

  getEstadoTecnicoDesdeNota(nota: number | string | null | undefined): string {
    const n = Number(nota);

    if (!Number.isFinite(n)) return '';

    if (n < 30) return 'No adquirido';
    if (n < 60) return 'En desarrollo';
    if (n < 75) return 'Consolidándose';
    if (n < 90) return 'Logrado';

    return 'Dominado';
  }

  getClaseEstadoTecnico(nota: number | string | null | undefined): string {
    const n = Number(nota);

    if (!Number.isFinite(n)) return '';

    if (n < 30) return 'estado-no-adquirido';
    if (n < 60) return 'estado-desarrollo';
    if (n < 75) return 'estado-consolidando';
    if (n < 90) return 'estado-logrado';

    return 'estado-dominado';
  }

  cargarHistorialTecnico(): void {
    this.evaluacionesService.getEvaluaciones().subscribe({
      next: (res: any[]) => {
        this.historialTecnico = res || [];
        this.aplicarFiltrosHistorialFrontend();
      },
      error: (err: any) => {
        console.error('Error cargando historial técnico:', err);

        this.snackBar.open('Error al cargar historial técnico', 'Cerrar', {
          duration: 3000
        });
      }
    });
  }

  aplicarFiltrosHistorialFrontend(): void {
    const buscar = this.normalizarTexto(this.filtrosHistorial.buscar);
    const tipoEvaluacion = this.filtrosHistorial.tipoEvaluacion;
    const fechaDesde = this.filtrosHistorial.fechaDesde;
    const fechaHasta = this.filtrosHistorial.fechaHasta;

    let base = [...this.historialTecnico];

    if (tipoEvaluacion) {
      base = base.filter((ev: any) => ev.tipoEvaluacion === tipoEvaluacion);
    }

    if (fechaDesde) {
      const desde = new Date(fechaDesde);
      base = base.filter((ev: any) => {
        const fecha = new Date(ev.fechaEvaluacion || ev.createdAt);
        return fecha >= desde;
      });
    }

    if (fechaHasta) {
      const hasta = new Date(fechaHasta);
      hasta.setHours(23, 59, 59, 999);

      base = base.filter((ev: any) => {
        const fecha = new Date(ev.fechaEvaluacion || ev.createdAt);
        return fecha <= hasta;
      });
    }

    this.historialListadoCompleto = base;

    if (!buscar) {
      this.historialResultadosBusqueda = [];
      return;
    }

    this.historialResultadosBusqueda = base.filter((ev: any) => {
      const dep = this.deportistas.find((d: any) => Number(d.id) === Number(ev.deportistaId));

      const nombre = this.normalizarTexto(dep?.apellidoYNombre || dep?.nombre || '');
      const dni = this.normalizarTexto(dep?.documentoN || dep?.dni || '');
      const club = this.normalizarTexto(dep?.club || '');
      const categoria = this.normalizarTexto(dep?.categoria || '');

      return (
        nombre.includes(buscar) ||
        dni.includes(buscar) ||
        club.includes(buscar) ||
        categoria.includes(buscar)
      );
    });
  }

  normalizarTexto(value: any): string {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\./g, '')
      .replace(/-/g, '')
      .trim();
  }

  limpiarFiltrosHistorial(): void {
    this.filtrosHistorial = {
      buscar: '',
      tipoEvaluacion: '',
      fechaDesde: '',
      fechaHasta: ''
    };

    this.evaluacionHistorialSeleccionada = null;
    this.aplicarFiltrosHistorialFrontend();
  }

  getNombreDeportistaPorId(deportistaId: number): string {
    const dep = this.deportistas.find((d: any) => Number(d.id) === Number(deportistaId));

    return dep?.apellidoYNombre || dep?.nombre || `ID ${deportistaId}`;
  }

  seleccionarEvaluacionHistorial(ev: any): void {
    this.evaluacionHistorialSeleccionada = ev;
  }

  cerrarDetalleHistorial(): void {
    this.evaluacionHistorialSeleccionada = null;
  }

  getElementosFiltradosPorTipo(): any[] {
    const tipoEvaluacion = this.evaluacionForm.value.tipoEvaluacion || 'LIBRE';

    return this.elementos
      .filter((e: any) => {
        const disciplina = String(e.disciplina || '').toUpperCase();
        const activo = e.activo === true || e.activo === 1;

        if (!activo) return false;

        if (tipoEvaluacion === 'LIBRE') {
          return disciplina === 'LIBRE' || disciplina === 'GENERAL';
        }

        if (tipoEvaluacion === 'FO') {
          return disciplina === 'FO' || disciplina === 'FIGURAS' || disciplina === 'GENERAL';
        }

        if (tipoEvaluacion === 'DANZA') {
          return disciplina === 'DANZA' || disciplina === 'GENERAL';
        }

        return false;
      })
      .sort((a: any, b: any) => {
        const nombreA = String(a.nombre || '');
        const nombreB = String(b.nombre || '');
        return nombreA.localeCompare(nombreB);
      });
  }

  onTipoEvaluacionChange(): void {
    this.elementosEvaluados = [];
    this.componentesEvaluados = [];

    this.agregarElemento();
    this.agregarComponente();

    this.snackBar.open(
      'Se reiniciaron los elementos para el nuevo tipo de evaluación.',
      'Cerrar',
      { duration: 2500 }
    );
  }

  getComponentesActivos(): any[] {
    return this.componentes
      .filter((c: any) => c.activo === true || c.activo === 1)
      .sort((a: any, b: any) => {
        const orden = ['Skating Skills', 'Transitions', 'Performance', 'Choreography'];

        const indexA = orden.indexOf(a.nombre);
        const indexB = orden.indexOf(b.nombre);

        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;

        return String(a.nombre || '').localeCompare(String(b.nombre || ''));
      });
  }

  private construirVariacionPorElemento(deportistaId: number): VariacionElemento[] {
    const evaluacionesDeportista = (this.historialTecnico || [])
      .filter((ev: any) => Number(ev.deportistaId) === Number(deportistaId))
      .sort((a: any, b: any) => {
        const fechaA = new Date(a.fechaEvaluacion || a.createdAt).getTime();
        const fechaB = new Date(b.fechaEvaluacion || b.createdAt).getTime();
        return fechaB - fechaA;
      });

    if (evaluacionesDeportista.length === 0) {
      return [];
    }

    const ultima = evaluacionesDeportista[0];
    const anterior = evaluacionesDeportista[1] || null;

    const elementosUltima = Array.isArray(ultima?.elementos) ? ultima.elementos : [];
    const elementosAnterior = Array.isArray(anterior?.elementos) ? anterior.elementos : [];

    return elementosUltima
      .map((elActual: any) => {
        const elementoId = Number(elActual.elementoId);
        const elementoAnterior = elementosAnterior.find(
          (elPrev: any) => Number(elPrev.elementoId) === elementoId
        );

        const notaActual = Number.isFinite(Number(elActual?.nota)) ? Number(elActual.nota) : null;
        const notaAnterior = elementoAnterior && Number.isFinite(Number(elementoAnterior?.nota))
          ? Number(elementoAnterior.nota)
          : null;

        const variacion =
          notaActual !== null && notaAnterior !== null
            ? notaActual - notaAnterior
            : 0;

        return {
          elementoId,
          elementoNombre:
            elActual?.elemento?.nombre ||
            this.getNombreElemento(elementoId),
          notaAnterior,
          notaActual,
          variacion,
          fechaAnterior: anterior ? new Date(anterior.fechaEvaluacion || anterior.createdAt) : null,
          fechaActual: ultima ? new Date(ultima.fechaEvaluacion || ultima.createdAt) : null
        } as VariacionElemento;
      })
      .sort((a: VariacionElemento, b: VariacionElemento) =>
        Math.abs(b.variacion) - Math.abs(a.variacion)
      );
  }

  private construirEvolucionMensualGeneral(evaluaciones: any[]): { mes: string; valor: number }[] {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    const acumuladoPorMes = new Map<string, { total: number; cantidad: number; orden: number }>();

    for (const ev of evaluaciones || []) {
      const fecha = new Date(ev.fechaEvaluacion || ev.createdAt);
      if (Number.isNaN(fecha.getTime())) continue;

      const elementos = Array.isArray(ev.elementos) ? ev.elementos : [];
      const componentes = Array.isArray(ev.componentes) ? ev.componentes : [];

      const notas = [
        ...elementos
          .map((el: any) => Number(el.nota))
          .filter((n: number) => Number.isFinite(n)),
        ...componentes
          .map((comp: any) => Number(comp.nota))
          .filter((n: number) => Number.isFinite(n))
      ];

      if (!notas.length) continue;

      const indiceEvaluacion = notas.reduce((acc: number, n: number) => acc + n, 0) / notas.length;

      const key = `${fecha.getFullYear()}-${fecha.getMonth()}`;
      const actual = acumuladoPorMes.get(key);

      if (actual) {
        actual.total += indiceEvaluacion;
        actual.cantidad += 1;
      } else {
        acumuladoPorMes.set(key, {
          total: indiceEvaluacion,
          cantidad: 1,
          orden: new Date(fecha.getFullYear(), fecha.getMonth(), 1).getTime()
        });
      }
    }

    return Array.from(acumuladoPorMes.entries())
      .sort((a, b) => a[1].orden - b[1].orden)
      .map(([key, value]) => {
        const [anio, mesIndex] = key.split('-').map(Number);
        return {
          mes: `${meses[mesIndex]} ${anio}`,
          valor: Math.round(value.total / value.cantidad)
        };
      });
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  volver(): void {
    this.router.navigate(['/login']);
  }

}
