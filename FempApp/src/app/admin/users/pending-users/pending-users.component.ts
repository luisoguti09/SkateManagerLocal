import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UsuariosService } from '../../../services/usuarios.service';

@Component({
  standalone: true,
  selector: 'app-pending-users',
  imports: [
    CommonModule, 
    MatTableModule, 
    MatButtonModule, 
    MatIconModule, 
    MatMenuModule
  ],
  templateUrl: './pending-users.component.html',
  styleUrls: ['./pending-users.component.scss']
})
export class PendingUsersComponent {
  
  private api = inject(UsuariosService);
  private snack = inject(MatSnackBar);

  public data: any[] = [];
  public cols = ['nombre','dni','rol','estado','acciones'];

  ngOnInit(){ 
    this.load(); 
  }

  load(){ 
    this.api.getUsuariosPendientes().subscribe(r => this.data = r); 
  }

  aprobar(id:number){
    this.api.aprobarUsuario(id, true).subscribe(() => {
      this.snack.open('Aprobado ✅','',{duration:1200});
      this.load();
    });
  }

  bloquear(id:number){
    this.api.aprobarUsuario(id, false).subscribe(() => {
      this.snack.open('Bloqueado ⛔','',{duration:1200});
      this.load();
    });
  }

}
