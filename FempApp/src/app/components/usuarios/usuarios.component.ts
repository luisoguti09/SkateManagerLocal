import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatToolbarModule
  ],
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.scss']
})
export class UsuariosComponent {
  private http = inject(HttpClient);
  public usuarios: any[] = [];
  public displayedColumns: string[] = ['nombre', 'email', 'dni', 'rol', 'acciones'];
  private apiURL = environment.SERVER_API;

  ngOnInit() {
    this.http.get<any[]>(`${this.apiURL}/usuarios`)
      .subscribe(data => {
        this.usuarios = data;
      });
  }

  aprobarUsuario(id: number) {
    this.http.put(`${this.apiURL}/usuarios/${id}/aprobar`, {}).subscribe(() => {
      this.usuarios = this.usuarios.map(u =>
        u.id === id ? { ...u, aprobado: true } : u
      );
    });
  }
}
