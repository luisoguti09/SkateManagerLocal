import {Component,inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute,RouterLink} from '@angular/router';
import {HttpClient} from '@angular/common/http';
import {finalize} from 'rxjs';
import {AuthService} from '../../services/auth.service';
import {environment} from '../../../environments/environment';
@Component({standalone:true,imports:[CommonModule,FormsModule,RouterLink],template:`
<main><a routerLink="/perfil">← Mi perfil</a><h1>{{gestion?'Licencias · Tesorería':'Mi licencia provincial FEMPA'}}</h1>
<p *ngIf="error" role="alert" class="alerta">{{error}}</p><p *ngIf="mensaje" role="status">{{mensaje}}</p>
<label>Temporada<input type="number" [(ngModel)]="temporada" min="2020" max="2100" [disabled]="busy"></label><button (click)="cargar()" [disabled]="busy">Consultar temporada</button>
<ng-container *ngIf="!gestion && datos"><h2>Temporada consultada: {{datos.temporada}}</h2><p>Una licencia por persona y temporada, aunque tengas varios perfiles deportivos. No incluye inscripciones a eventos.</p>
<p>Estado: <strong>{{estado(datos.licencia?.estado)}}</strong></p><p *ngIf="datos.habilitada">Licencia habilitada por pago verificado o exención vigente.</p>
<p *ngIf="!datos.documentosAprobadosVigentes">Antes de pagar, la cuenta y los documentos deben estar aprobados y vigentes. Revisá Mi solicitud.</p><p *ngIf="!datos.cobrosHabilitados">El cobro todavía no está abierto para tu cuenta.</p><p *ngIf="datos.aviso">{{datos.aviso}}</p>
<div *ngIf="datos.cotizacion as q"><p>Arancel: {{q.importeArancelCentavos/100|currency:'ARS':'symbol':'1.2-2'}}</p><p>Descuento del periodo: {{q.descuentoCentavos/100|currency:'ARS':'symbol':'1.2-2'}}</p><p>Beca de licencia: {{q.porcentaje}}% · {{q.beneficioCentavos/100|currency:'ARS':'symbol':'1.2-2'}}</p><h2>Total: {{q.totalCentavos/100|currency:'ARS':'symbol':'1.2-2'}}</h2><p>Sin comisión adicional de plataforma.</p></div>
<button *ngIf="!datos.licencia" (click)="accion('solicitar')" [disabled]="busy">Solicitar licencia</button>
<button *ngIf="datos.licencia && !datos.habilitada" (click)="pagar()" [disabled]="busy||!datos.documentosAprobadosVigentes||!datos.cobrosHabilitados||!datos.cotizacion">{{datos.cotizacion?.exento?'Aplicar exención':'Ir a Mercado Pago'}}</button>
<button *ngIf="datos.licencia" (click)="accion('comprobar')" [disabled]="busy">Comprobar estado del pago</button>
<p *ngIf="datos.intento">El checkout vence: {{datos.intento.vence|date:'dd/MM/yyyy HH:mm'}}. Volver de Mercado Pago no acredita por sí solo el pago.</p>
</ng-container>
<ng-container *ngIf="gestion"><a routerLink="/licencias/configuracion">Configurar periodos y aranceles</a> · <a routerLink="/tesoreria/becas">Becas y exenciones</a>
<p *ngIf="preparacion">Temporada habilitada: {{preparacion.temporada}} · Cuenta MP verificada: {{preparacion.connected?'Sí':'No'}} · Cobro: {{preparacion.habilitado?'habilitado':'cerrado'}} · {{preparacion.pilotoUsuarioId?'Solo deportista ID '+preparacion.pilotoUsuarioId:'Sin restricción de piloto'}}. {{preparacion.mensaje}}</p>
<form (ngSubmit)="cargar()"><label>Nombre o DNI<input name="buscar" [(ngModel)]="buscar" maxlength="100" [disabled]="busy"></label><button [disabled]="busy">Buscar</button></form><p>Hasta 200 resultados. Usá nombre o DNI para acotar. La exportación respeta la búsqueda y la temporada consultadas.</p><button *ngIf="tesorero" (click)="exportar()" [disabled]="busy||!consulta">Exportar importes y fechas</button>
<article *ngFor="let u of usuarios"><h3>{{u.nombre}} · DNI {{u.dni}} · ID {{u.id}}</h3><p>{{u.club}} · {{estado(u.licencia?.estado)}} · Documentación {{u.documentos?'vigente y aprobada':'pendiente'}}</p><p>Solicitud nacional: {{u.licencia?.fechaNacional||'Sin verificar'}}</p><p *ngIf="u.cotizacion">Total cotizado: {{u.cotizacion.totalCentavos/100|currency:'ARS':'symbol':'1.2-2'}} · Beca: {{u.cotizacion.porcentaje}}%</p>
<p *ngFor="let o of u.operaciones">Pago {{o.paymentId}} · {{o.estado}} · {{o.importeCentavos/100|currency:'ARS':'symbol':'1.2-2'}} · {{o.fechaAprobacion|date:'dd/MM/yyyy HH:mm'}} · Webhook: {{o.webhook?'recibido':'no recibido'}}</p>
<button *ngIf="tesorero && (!u.licencia||u.licencia.estado==='solicitada')" (click)="editar(u)" [disabled]="busy">Verificar fecha nacional</button><button *ngIf="tesorero&&u.licencia" (click)="comprobar(u.id)" [disabled]="busy">Consultar pago en Mercado Pago</button>
</article>
<form *ngIf="form" (ngSubmit)="guardar()" #f="ngForm"><h2>{{seleccionada.nombre}} · {{form.temporada}}</h2><p>Ingresá la fecha verificada en el registro nacional. Determina el periodo y arancel; la deportista no puede modificarla.</p><label>Fecha de solicitud nacional<input type="date" name="fecha" [(ngModel)]="form.fechaNacional" required [disabled]="busy"></label><label>Motivo o referencia de comprobación<input name="motivo" [(ngModel)]="form.motivo" minlength="5" maxlength="500" required [disabled]="busy"></label><button [disabled]="busy||f.invalid">Guardar verificación</button></form>
</ng-container></main>`,styles:[`main{max-width:1000px;margin:24px auto;padding:24px;background:white;color:#17344d;border-radius:20px}label,form{display:grid;gap:10px;margin:12px 0}input{padding:12px;border:1px solid #bccddb;border-radius:8px}button{margin:8px 8px 8px 0;padding:12px;background:#155ab5;color:white;border:0;border-radius:8px;cursor:pointer}button:disabled{opacity:.5}article{padding:18px;border-bottom:1px solid #ccc}.alerta{padding:12px;background:#fff1d5}`]})
export class LicenciaAnualComponent{
 private http=inject(HttpClient);private auth=inject(AuthService);private route=inject(ActivatedRoute);private base=environment.SERVER_API.replace(/\/$/,'')+'/licencias-anuales';
 gestion=this.route.snapshot.data['gestion']===true;tesorero=this.auth.getUsuario()?.rol==='tesoreria';temporada=Number(this.route.snapshot.queryParamMap.get('temporada'))||2027;datos:any;usuarios:any[]=[];preparacion:any;buscar='';consulta='';busy=false;error='';mensaje='';form:any;seleccionada:any;
 private get opts(){return{headers:{Authorization:'Bearer '+this.auth.getToken()}};}
 constructor(){if(!this.gestion&&this.route.snapshot.queryParamMap.has('payment_id'))this.accion('comprobar');else this.cargar();}
 estado(s:string){return ({solicitada:'Pendiente de cobro',pendiente:'Pago pendiente',conciliada:'Pago confirmado',exenta:'Exención aplicada',requiere_revision:'Requiere revisión',pago_duplicado:'Pagos duplicados: revisar',en_proceso:'Pago en proceso',sin_pago_aprobado:'Sin pago aprobado'} as any)[s]||'Sin solicitar';}
 fallo(e:any){this.error=e.error?.error||'No se pudo completar la operación. Volvé a comprobar el estado.';}
 cargar(){if(this.busy)return;this.busy=true;this.error='';this.form=null;this.consulta='';const q=new URLSearchParams({temporada:String(this.temporada),buscar:this.buscar.trim()}).toString();this.http.get<any>(this.base+(this.gestion?'/tesoreria?':'/mia?')+q,this.opts).pipe(finalize(()=>this.busy=false)).subscribe({next:r=>{if(this.gestion){this.usuarios=r;this.consulta=q;}else this.datos=r;},error:e=>this.fallo(e)});if(this.gestion)this.http.get<any>(this.base+'/preparacion',this.opts).subscribe({next:r=>this.preparacion=r,error:e=>this.fallo(e)});}
 accion(tipo:string){if(this.busy)return;this.busy=true;this.error='';const year=this.datos?.temporada||this.temporada;this.http.post<any>(this.base+'/'+tipo,{temporada:year},this.opts).pipe(finalize(()=>this.busy=false)).subscribe({next:r=>this.datos=r,error:e=>this.fallo(e)});}
 pagar(){if(this.busy)return;this.busy=true;this.error='';this.http.post<any>(this.base+'/checkout',{temporada:this.datos.temporada},this.opts).pipe(finalize(()=>this.busy=false)).subscribe({next:r=>{if(r.url)window.location.assign(r.url);else{this.mensaje=r.mensaje;this.busy=false;this.cargar();}},error:e=>this.fallo(e)});}
 editar(u:any){this.seleccionada=u;this.form={usuarioId:u.id,temporada:Number(new URLSearchParams(this.consulta).get('temporada')),fechaNacional:u.licencia?.fechaNacional||'',revision:u.licencia?.revision||0,motivo:''};}
 guardar(){if(this.busy)return;this.busy=true;this.error='';this.http.put(this.base+'/fecha-nacional',this.form,this.opts).pipe(finalize(()=>this.busy=false)).subscribe({next:()=>{this.mensaje='Fecha verificada y registrada.';this.busy=false;this.cargar();},error:e=>this.fallo(e)});}
 comprobar(id:number){if(this.busy)return;this.busy=true;this.error='';this.http.post(this.base+'/comprobar/'+id,{temporada:Number(new URLSearchParams(this.consulta).get('temporada'))},this.opts).pipe(finalize(()=>this.busy=false)).subscribe({next:()=>{this.busy=false;this.cargar();},error:e=>this.fallo(e)});}
 exportar(){this.http.get(this.base+'/exportar.csv?'+this.consulta,{...this.opts,responseType:'blob'}).subscribe({next:b=>{const url=URL.createObjectURL(b),a=document.createElement('a');a.href=url;a.download='licencias.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},error:e=>this.fallo(e)});}
}
