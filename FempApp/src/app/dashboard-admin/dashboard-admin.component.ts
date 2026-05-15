import { Component, inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UsuariosService } from '../services/usuarios.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressBarModule } from '@angular/material/progress-bar';



@Component({
  selector: 'app-dashboard-admin',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatListModule,
    MatToolbarModule,
    MatProgressBarModule
  ],
  templateUrl: './dashboard-admin.component.html',
  styleUrls: ['./dashboard-admin.component.scss']
})
export class DashboardAdminComponent implements OnInit {
  private usuarioService = inject(UsuariosService);
  private snackBar = inject(MatSnackBar);
  public usuariosPendientes: any[] = [];
  public cargando = false;
  displayedColumns: string[] = ['nombre', 'email', 'rol', 'acciones'];

  ngOnInit() {
    this.obtenerUsuariosPendientes();
  }

  obtenerUsuariosPendientes() {
    this.cargando = true;
    this.usuarioService.getUsuariosPendientes()
      .subscribe({
        next: (res: any) => {
          this.usuariosPendientes = res;
          this.cargando = false;
        },
        error: () => {
          this.snackBar.open('Error al obtener usuarios pendientes', 'Cerrar', { duration: 3000 });
          this.cargando = false;
        }
      });
  }

  aprobarUsuario(id: number) {
    this.usuarioService.aprobarUsuario(id)
      .subscribe({
        next: () => {
          this.snackBar.open('Usuario aprobado', 'Cerrar', { duration: 3000 });
          this.usuariosPendientes = this.usuariosPendientes.filter(u => u.id !== id);
        },
        error: () => {
          this.snackBar.open('Error al aprobar usuario', 'Cerrar', { duration: 3000 });
        }
      });
  }
}

