import {Component,OnInit,inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {DeportesCatalogoService,DeporteCatalogo} from '../services/deportes-catalogo.service';
import {finalize} from 'rxjs';
@Component({standalone:true,imports:[CommonModule,FormsModule,RouterLink],template:`
<main><a routerLink="/perfil">← Mi perfil</a><h1>Deportes y disciplinas</h1><p>Habilitá el registro de otros deportes y sus perfiles. Desactivar un deporte conserva sus cuentas y perfiles existentes.</p>
<p *ngIf="error" role="alert">{{error}}</p><p *ngIf="ok" role="status">{{ok}}</p>
<section><button *ngIf="general" type="button" (click)="nuevo()" [disabled]="busy">Agregar deporte</button><article *ngFor="let d of deportes"><strong>{{d.nombre}}</strong> · {{d.activo?'Activo':'Inactivo'}} <span *ngIf="d.fijo">· Catálogo específico</span><button *ngIf="!d.fijo" (click)="editar(d)" [disabled]="busy">Editar</button></article></section>
<form *ngIf="form" (ngSubmit)="guardar()" #f="ngForm"><h2>{{existente?'Editar deporte':'Nuevo deporte'}}</h2><label>Nombre<input name="nombre" [(ngModel)]="form.nombre" maxlength="80" required [disabled]="busy||existente"></label>
<label><input type="checkbox" name="activo" [(ngModel)]="form.activo" [disabled]="busy"> Habilitar registro y nuevos perfiles</label>
<fieldset *ngFor="let d of form.disciplinas;let i=index"><legend>Disciplina {{i+1}}</legend><label>Nombre<input [name]="'disc'+i" [(ngModel)]="d.nombre" maxlength="80" required [disabled]="busy"></label><label>Categorías: una por línea<textarea [name]="'cat'+i" [(ngModel)]="d.texto" rows="4" [disabled]="busy"></textarea></label><button type="button" (click)="form.disciplinas.splice(i,1)" [disabled]="busy||form.disciplinas.length===1">Quitar disciplina</button></fieldset>
<button type="button" (click)="form.disciplinas.push({nombre:'',texto:''})" [disabled]="busy">Agregar disciplina</button><p>Podés dejar las categorías vacías para permitir el alta rápida. Luego deberán completarse para certificar la categoría deportiva. Cambiar un nombre no modifica los perfiles ya guardados.</p>
<label>Fuente o reglamento<textarea name="fuente" [(ngModel)]="form.fuente" maxlength="1000" rows="3" [disabled]="busy"></textarea></label><label>Motivo del cambio<input name="motivo" [(ngModel)]="form.motivo" required minlength="5" maxlength="500" [disabled]="busy"></label><button [disabled]="busy||f.invalid">{{busy?'Guardando…':'Guardar catálogo'}}</button></form>
<section *ngIf="general"><h2>Administración delegada de deportes</h2><p>Otorgá a una cuenta aprobada acceso solo a los deportes seleccionados. No cambia su rol ni habilita tesorería, aprobación de cuentas o acceso a otros deportes.</p>
<form (ngSubmit)="buscarUsuarios()"><label>Nombre o correo<input name="busqueda" [(ngModel)]="busqueda" minlength="3" required></label><button [disabled]="busy">Buscar cuenta</button></form>
<article *ngFor="let u of usuarios">{{u.nombre}} · {{u.email}} · {{u.rol}} <button (click)="seleccionarUsuario(u)" [disabled]="busy">Configurar permisos</button></article>
<form *ngIf="permiso" (ngSubmit)="guardarPermiso()" #pf="ngForm"><h3>{{persona?.nombre}} · {{persona?.email}}</h3>
<label *ngFor="let d of deportesEditables"><input type="checkbox" [name]="'permiso-'+d.nombre" [ngModel]="permiso.deportes.includes(d.nombre)" (ngModelChange)="marcar(d.nombre,$event)" [disabled]="busy"> {{d.nombre}}</label>
<p>Desmarcá todos para retirar el acceso. Solo Administración general puede crear deportes y otorgar permisos.</p>
<label>Motivo<input name="motivoPermiso" [(ngModel)]="permiso.motivo" minlength="5" maxlength="500" required [disabled]="busy"></label><button [disabled]="busy||pf.invalid">Guardar permisos</button></form></section></main>`,styles:[`main{max-width:1000px;margin:24px auto;padding:24px;background:white;color:#17344d;border-radius:20px}form,fieldset,label{display:grid;gap:12px}form{margin-top:24px}input,textarea{padding:10px;border:1px solid #bccddb;border-radius:8px}input[type=checkbox]{width:20px}button{padding:10px;margin:6px;background:#155ab5;color:white;border:0;border-radius:8px;cursor:pointer}button:disabled{opacity:.5}article{padding:12px;border-bottom:1px solid #dde5eb}`]})
export class DeportesCatalogoComponent implements OnInit{
 private api=inject(DeportesCatalogoService);deportes:DeporteCatalogo[]=[];form:any=null;existente=false;busy=false;error='';ok='';
 general=false;busqueda='';usuarios:any[]=[];permiso:any=null;persona:any=null;
 get deportesEditables(){return this.deportes.filter(d=>!d.fijo);}
 ngOnInit(){this.api.acceso().subscribe({next:a=>{this.general=a.general;this.cargar();},error:e=>this.error=e.error?.error||'No se pudo verificar el acceso.'});}
 buscarUsuarios(){this.error='';this.permiso=null;this.api.usuarios(this.busqueda).subscribe({next:us=>this.usuarios=us,error:e=>this.error=e.error?.error||'No se pudo buscar la cuenta.'});}
 seleccionarUsuario(u:any){this.persona=u;this.permiso=null;this.busy=true;this.api.permiso(u.id).pipe(finalize(()=>this.busy=false)).subscribe({next:p=>this.permiso={...p,motivo:''},error:e=>this.error=e.error?.error||'No se pudo consultar el permiso.'});}
 marcar(nombre:string,activo:boolean){this.permiso.deportes=activo?[...this.permiso.deportes,nombre]:this.permiso.deportes.filter((d:string)=>d!==nombre);}
 guardarPermiso(){if(this.busy)return;this.busy=true;this.error='';this.api.guardarPermiso(this.permiso).pipe(finalize(()=>this.busy=false)).subscribe({next:p=>{this.permiso={...p,motivo:''};this.ok='Permisos guardados y auditados. La cuenta verá el acceso desde Mi perfil.';},error:e=>this.error=e.error?.error||'No se pudieron guardar los permisos.'});}
cargar(){this.api.administrar().subscribe({next:ds=>this.deportes=ds,error:e=>this.error=e.error?.error||'No se pudo consultar el catálogo.'});}
 nuevo(){this.existente=false;this.form={nombre:'',fuente:'',activo:true,revision:0,motivo:'',disciplinas:[{nombre:'',texto:''}]};}
 editar(d:DeporteCatalogo){this.existente=true;this.form={...d,motivo:'',disciplinas:d.disciplinas.map(x=>({nombre:x.nombre,texto:x.categorias.join('\n')}))};}
 guardar(){if(this.busy)return;this.busy=true;this.error='';this.ok='';const data={...this.form,disciplinas:this.form.disciplinas.map((d:any)=>({nombre:d.nombre,categorias:d.texto.split('\n').map((s:string)=>s.trim()).filter(Boolean)}))};this.api.guardar(data).pipe(finalize(()=>this.busy=false)).subscribe({next:d=>{this.ok='Catálogo guardado. Ya está disponible en el registro.';this.editar(d);this.cargar();},error:e=>this.error=e.error?.error||'No se pudo guardar.'});}
}
