import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { UsuariosService } from '../../../services/usuarios.service';

@Component({
  standalone: true,
  selector: 'app-all-users',
  imports: [CommonModule, MatTableModule],
  templateUrl: './all-users.component.html',
  styleUrls: ['./all-users.component.scss']
})
export class AllUsersComponent{
  private api = inject(UsuariosService);
  data:any[]=[]; cols=['nombre','dni','rol','estado'];
  ngOnInit(){ this.api.listarTodos().subscribe(r => this.data = r); }
}
