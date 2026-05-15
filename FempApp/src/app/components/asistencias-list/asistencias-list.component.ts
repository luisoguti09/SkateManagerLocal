import { Component, inject } from '@angular/core';
import { AsistenciasListService } from '../../services/asistencias-list.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-asistencias-list',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatCardModule,
    CommonModule,
    FormsModule,
    MatTableModule
  ],
  templateUrl: './asistencias-list.component.html',
  styleUrl: './asistencias-list.component.scss'
})
export class AsistenciasListComponent {

  private snackBar = inject(MatSnackBar);
  private asistencias = inject(AsistenciasListService);
  private location = inject(Location);

  public eventoSeleccionado: { id: number; nombre: string } | null = null; public asistenciasData: any[] = [];
  public eventoIdFiltro: number | null = null;
  public displayedColumns = ['deportista', 'dni', 'evento', 'lugar', 'fecha', 'hora'];

  ngOnInit(): void {
    this.cargarAsistencias();
  }

  cargarAsistencias(): void {
    this.asistencias.listar(this.eventoIdFiltro ?? undefined).subscribe({
      next: (res) => {
        this.asistenciasData = res;
      },
      error: (err) => {
        console.error('Error cargando asistencias:', err);
        this.snackBar.open('Error al cargar asistencias', 'Cerrar', { duration: 2500 });
      }
    });
  }

  limpiarFiltro(): void {
    this.eventoIdFiltro = null;
    this.cargarAsistencias();
  }

  handleQrText(qrText: string) {
    if (!this.eventoSeleccionado) {
      this.snackBar.open('Elegí un evento', 'OK', { duration: 2500 });
      return;
    }
    this.asistencias.registrar(this.eventoSeleccionado.id, qrText).subscribe({
      next: (r) => {
        this.snackBar.open(r.created ? '¡Asistencia marcada!' : 'Ya estaba marcada', 'OK', { duration: 2500 });
      },
      error: (e) => {
        const msg = e?.error?.error ?? 'Error registrando asistencia';
        this.snackBar.open(msg, 'OK', { duration: 3000 });
      }
    });
  }

  volver() {
    this.location.back();
  }

}
