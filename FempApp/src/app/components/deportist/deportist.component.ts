import { Component, inject, OnInit } from '@angular/core';
import { DeportistService } from '../../services/deportist.service';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RegistroService } from '../../services/registro.service';
import { LoginService } from '../../services/login.service';


@Component({
  selector: 'app-deportist',
  standalone: true,
  animations: [
    trigger('detailExpand', [
      state('collapsed,void', style({height: '0px', minHeight: '0'})),
      state('expanded', style({height: '*'})),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatTableModule, 
    MatButtonModule, 
    MatIconModule,
    MatInputModule,
    RouterLink, 
    RouterOutlet
  ],
  templateUrl: './deportist.component.html',
  styleUrl: './deportist.component.scss'
})
export class DeportistComponent implements OnInit {
  
 
  private router = inject(Router);
  private depServ = inject(DeportistService);
  public empadronada: string = "";
  public displayedColumns: string[] = ['apellidoYNombre', 'fechadeNacimiento', 'club', 'categoria'];
  public dataSource = new MatTableDataSource();
  public filterValue = '';
  public pers: any;


  private regServ = inject(RegistroService);
  private logServ = inject(LoginService);

  ngOnInit() {
    
  }

  mostrarMisDatos(){
      this.regServ.buscar(this.logServ.loggedUser.usuario.dni)
        .subscribe((res: any) => {
          this.pers = res;
        });
  }

  

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase(); 
  }

}
