import {Component,Input,OnInit,OnChanges,inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {PerfilesDeportivosService} from '../../services/perfiles-deportivos.service';
import {CuentaService} from '../../services/cuenta.service';
import {DeportesCatalogoService,DeporteCatalogo} from '../../services/deportes-catalogo.service';
import {finalize} from 'rxjs';
@Component({selector:'app-otros-deportes',standalone:true,imports:[CommonModule,FormsModule],template:`
<section class="panel"><h2>Perfiles de {{deporte}}</h2><p *ngIf="error" role="alert">{{error}}</p><p *ngIf="ok" role="status">{{ok}}</p>
<form *ngIf="catalogo" (ngSubmit)="guardar()" #f="ngForm">
<label>Disciplina<select name="disciplina" [(ngModel)]="form.disciplina" (ngModelChange)="form.categoria=''" required [disabled]="busy"><option value="">Seleccioná</option><option *ngFor="let d of catalogo.disciplinas" [value]="d.nombre">{{d.nombre}}</option></select></label>
<label *ngIf="categorias.length">Categoría<select name="categoria" [(ngModel)]="form.categoria" required [disabled]="busy"><option value="">Seleccioná</option><option *ngFor="let c of categorias" [value]="c">{{c}}</option></select></label>
<p *ngIf="form.disciplina && !categorias.length">Esta disciplina todavía no tiene categorías cargadas. Podés guardar tu perfil y completarlo cuando Administración las publique.</p>
<label>Temporada<input name="temporada" type="number" [(ngModel)]="form.temporada" min="2000" max="2199" required [disabled]="busy"></label>
<p>Club: {{clubNombre || 'Solicitá a Administración que complete tu club.'}}</p>
<button [disabled]="busy||f.invalid||!clubId">{{editando?'Guardar cambios':'Agregar perfil'}}</button><button type="button" *ngIf="editando" (click)="limpiar()" [disabled]="busy">Cancelar edición</button>
</form><article *ngFor="let p of perfiles"><h3>{{p.disciplina}} · {{p.categoria || 'Categoría pendiente'}}</h3><p>{{p.temporada}} · {{p.club}}</p><button *ngIf="catalogo" type="button" (click)="editar(p)" [disabled]="busy">Editar</button></article></section>`,styles:[`.panel{padding:24px;background:#f3f9f6;border-radius:20px;color:#17344d;margin-top:16px}form{display:grid;gap:16px}label{display:grid;gap:6px}input,select{padding:12px;border:1px solid #bccddb;border-radius:8px;background:white}button{padding:12px;background:#155ab5;color:white;border:0;border-radius:8px;cursor:pointer}button:disabled{opacity:.5}article{padding:16px;background:white;margin-top:16px;border-radius:10px}`]})
export class OtrosDeportesComponent implements OnInit,OnChanges{
 @Input() usuarioId!:number;@Input() deporte='';
 private api=inject(PerfilesDeportivosService);private cuenta=inject(CuentaService);private cat=inject(DeportesCatalogoService);private version=0;
 catalogo?:DeporteCatalogo;perfiles:any[]=[];form:any={disciplina:'',categoria:'',temporada:new Date().getFullYear()};clubNombre='';clubId:number|null=null;editando:number|null=null;busy=false;error='';ok='';
 get categorias(){return this.catalogo?.disciplinas.find(d=>d.nombre===this.form.disciplina)?.categorias||[];}
 ngOnInit(){this.cuenta.mia().subscribe({next:u=>{this.clubNombre=u.club||'';this.cuenta.clubes().subscribe({next:cs=>this.clubId=cs.find(c=>c.nombre===this.clubNombre)?.id||null,error:()=>this.error='No se pudieron cargar clubes.'});},error:()=>this.error='No se pudo consultar la cuenta.'});}
 ngOnChanges(){const version=++this.version;this.limpiar();this.catalogo=undefined;this.perfiles=[];this.error='';this.ok='';this.cat.listar().subscribe({next:ds=>{if(version===this.version)this.catalogo=ds.find(d=>d.nombre===this.deporte);},error:()=>{if(version===this.version)this.error='No se pudo cargar el catálogo.';}});this.cargar();}
 cargar(){const version=this.version;this.api.getByUsuario(this.usuarioId).subscribe({next:ps=>{if(version===this.version)this.perfiles=ps.filter(p=>p.deporte===this.deporte);},error:()=>{if(version===this.version)this.error='No se pudieron cargar perfiles.';}});}
 limpiar(){this.editando=null;this.form={disciplina:'',categoria:'',temporada:new Date().getFullYear()};}
 editar(p:any){this.editando=p.id;this.form={disciplina:p.disciplina,categoria:p.categoria||'',temporada:Number(p.temporada)};}
 guardar(){if(this.busy||!this.clubId)return;this.busy=true;this.error='';this.ok='';const version=this.version;
 const data:any={...this.form,categoria:this.form.categoria||null,temporada:String(this.form.temporada),deporte:this.deporte,usuarioId:this.usuarioId,origenCategoria:'CAP',divisional:null,modalidad:null,licencia:null,clubId:this.clubId,clubSedeId:null,activa:true};
 (this.editando?this.api.update(this.editando,data):this.api.create(data)).pipe(finalize(()=>this.busy=false)).subscribe({next:()=>{if(version!==this.version)return;this.ok='Perfil guardado.';this.limpiar();this.cargar();},error:e=>{if(version===this.version)this.error=e.error?.error||'No se pudo guardar.';}});}
}
