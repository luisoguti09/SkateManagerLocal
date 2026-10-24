import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AsistenciasListService, EventoAsistencias, FilaAsistencia } from '../../services/asistencias-list.service';
import { AuthService } from '../../services/auth.service';

@Component({selector:'app-asistencias-list',standalone:true,imports:[CommonModule,FormsModule,RouterLink],templateUrl:'./asistencias-list.component.html',styleUrl:'./asistencias-list.component.scss'})
export class AsistenciasListComponent implements OnInit,OnDestroy {
 private api=inject(AsistenciasListService);
 private auth=inject(AuthService);
 private resumenPeticion?:Subscription;
 private detallePeticion?:Subscription;
 eventos:EventoAsistencias[]=[];
 filas:FilaAsistencia[]=[];
 seleccionado:EventoAsistencias|null=null;
 club:string|null=null;
 buscarEvento='';buscar='';busquedaAplicada='';temporada='';
 cargando=false;cargandoDetalle=false;limitado=false;
 error='';errorDetalle='';pagina=1;total=0;limite=50;
 get tecnica(){return this.auth.getUsuario()?.rol==='tecnico';}
 get volver(){return this.tecnica?'/dashboard-prof':this.auth.getUsuario()?.rol==='juez'?'/dashboard-juez':'/admin';}
 get temporadas(){return [...new Set(this.eventos.map(e=>e.fechaInicio?.slice(0,4)).filter((s):s is string=>!!s))].sort().reverse();}
 get filtrados(){const q=this.buscarEvento.trim().toLocaleLowerCase();return this.eventos.filter(e=>(!this.temporada||e.fechaInicio?.startsWith(this.temporada))&&(!q||`${e.titulo} ${e.lugar||''}`.toLocaleLowerCase().includes(q)));}
 ngOnInit(){this.cargar();}
 cargar(){
  this.resumenPeticion?.unsubscribe();this.cerrar();this.error='';this.cargando=true;
  this.resumenPeticion=this.api.resumen().subscribe({next:r=>{this.eventos=r.eventos;this.club=r.club;this.limitado=r.limitado;this.cargando=false;},error:e=>{this.eventos=[];this.error=e.error?.error||'No pudimos cargar los eventos. Volvé a intentar.';this.cargando=false;}});
 }
 abrir(e:EventoAsistencias){this.seleccionado=e;this.buscar='';this.busquedaAplicada='';this.consultar(1);}
 cerrar(){this.detallePeticion?.unsubscribe();this.seleccionado=null;this.filas=[];this.errorDetalle='';this.cargandoDetalle=false;}
 filtrar(){this.busquedaAplicada=this.buscar.trim();this.consultar(1);}
 consultar(pagina:number){
  if(!this.seleccionado)return;
  this.detallePeticion?.unsubscribe();this.pagina=pagina;this.filas=[];this.errorDetalle='';this.cargandoDetalle=true;
  this.detallePeticion=this.api.detalle(this.seleccionado.id,pagina,this.busquedaAplicada).subscribe({next:r=>{this.filas=r.filas;this.total=r.total;this.limite=r.limite;this.cargandoDetalle=false;},error:e=>{this.total=0;this.errorDetalle=e.error?.error||'No pudimos consultar las asistencias.';this.cargandoDetalle=false;}});
 }
 ngOnDestroy(){this.resumenPeticion?.unsubscribe();this.detallePeticion?.unsubscribe();}
}
