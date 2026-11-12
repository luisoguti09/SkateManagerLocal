import {Component,Input,OnInit,inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {PerfilesDeportivosService} from '../../services/perfiles-deportivos.service';
import {CuentaService} from '../../services/cuenta.service';
import {finalize} from 'rxjs';
@Component({selector:'app-freestyle-perfiles',standalone:true,imports:[CommonModule,FormsModule],template:`
<section class="freestyle"><h2>Perfiles de ROLLER FREESTYLE</h2><p>Reglamento nacional · San Juan 2026. Elegí STREET o PARK (BOWL), y la categoría de tu convocatoria.</p>
<p *ngIf="error" role="alert">{{error}}</p><p *ngIf="ok" role="status">{{ok}}</p>
<form (ngSubmit)="guardar()" #f="ngForm">
<label>Disciplina<select name="disciplina" [(ngModel)]="form.disciplina" required [disabled]="busy"><option value="">Seleccioná</option><option>STREET</option><option>PARK (BOWL)</option></select></label>
<label>Categoría<select name="categoria" [(ngModel)]="form.categoria" required [disabled]="busy"><option value="">Seleccioná</option><option *ngFor="let c of categorias">{{c}}</option></select></label>
<label>Temporada<input type="number" name="temporada" [(ngModel)]="form.temporada" min="2000" max="2199" required [disabled]="busy"></label>
<p>Club actual: <strong>{{clubNombre || 'Sin club asignado: completá Mi solicitud o solicitá el cambio a Administración.'}}</strong></p>
<button [disabled]="busy||f.invalid||!clubId">{{editando?'Guardar cambios':'Agregar perfil'}}</button><button type="button" *ngIf="editando" (click)="limpiar()" [disabled]="busy">Cancelar edición</button>
</form><article *ngFor="let p of perfiles"><h3>{{p.disciplina}} · {{p.categoria}}</h3><p>Temporada {{p.temporada}} · {{p.club}}</p><button type="button" (click)="editar(p)" [disabled]="busy">Editar</button></article>
</section>`,styles:[`.freestyle{background:#f3f9f6;padding:24px;border-radius:20px;color:#17344d;margin-top:16px}form{display:grid;gap:16px}label{display:grid;gap:6px}select,input{padding:12px;border:1px solid #bccddb;border-radius:9px;background:white}button{padding:12px;border:0;border-radius:8px;background:#155ab5;color:white;cursor:pointer}button:disabled{opacity:.5}article{background:white;border-radius:12px;padding:16px;margin-top:16px}`]})
export class FreestylePerfilesComponent implements OnInit{
 @Input() usuarioId!:number;private api=inject(PerfilesDeportivosService);private cuenta=inject(CuentaService);
 categorias=['PRO FEMENINO','PRO MASCULINO','JUNIOR FEMENINO','JUNIOR MASCULINO'];perfiles:any[]=[];form:any={disciplina:'',categoria:'',temporada:new Date().getFullYear()};clubNombre='';clubId:number|null=null;editando:number|null=null;busy=false;error='';ok='';
 ngOnInit(){this.cuenta.mia().subscribe({next:u=>{this.clubNombre=u.club||'';this.cuenta.clubes().subscribe({next:cs=>this.clubId=cs.find(c=>c.nombre===this.clubNombre)?.id||null,error:()=>this.error='No se pudieron cargar clubes.'});},error:()=>this.error='No se pudo consultar la cuenta.'});this.cargar();}
 cargar(){this.api.getByUsuario(this.usuarioId).subscribe({next:ps=>this.perfiles=ps.filter(p=>p.deporte==='ROLLER FREESTYLE'),error:()=>this.error='No se pudieron consultar perfiles.'});}
 limpiar(){this.editando=null;this.form={disciplina:'',categoria:'',temporada:new Date().getFullYear()};}
 editar(p:any){this.editando=p.id;this.form={disciplina:p.disciplina,categoria:p.categoria,temporada:p.temporada};}
 guardar(){if(this.busy||!this.clubId)return;this.busy=true;this.error='';this.ok='';
 const data:any={...this.form,temporada:String(this.form.temporada),deporte:'ROLLER FREESTYLE',usuarioId:this.usuarioId,origenCategoria:'CAP',divisional:null,modalidad:null,licencia:null,clubId:this.clubId,clubSedeId:null,activa:true};
 (this.editando?this.api.update(this.editando,data):this.api.create(data)).pipe(finalize(()=>this.busy=false)).subscribe({next:()=>{this.ok='Perfil guardado.';this.limpiar();this.cargar();},error:e=>this.error=e.error?.error||'No se pudo guardar.'});}
}
