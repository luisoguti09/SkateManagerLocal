import {Component,inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute,RouterLink} from '@angular/router';
import {HttpClient} from '@angular/common/http';
import {finalize} from 'rxjs';
import {AuthService} from '../../services/auth.service';
import {environment} from '../../../environments/environment';
@Component({standalone:true,imports:[CommonModule,FormsModule,RouterLink],template:`
<main><header class="page-header"><img src="assets/icons/MARCAFEMPA1.png" alt="FEMPA"><span class="eyebrow">FEMPA · TU CUENTA</span><a [routerLink]="gestion?'/dashboard-tesoreria':'/perfil'">{{gestion?'← Tesorería':'Mi perfil'}}</a><h1>{{gestion?'Cobros anuales · Tesorería':titulo}}</h1><a *ngIf="!gestion && datos && !datos.requierePago" [routerLink]="dashboard">Ir a mi panel →</a><button *ngIf="!gestion" (click)="salir()">Cerrar sesión</button>
</header><p *ngIf="error" role="alert" class="alerta">{{error}}</p><p *ngIf="mensaje" role="status">{{mensaje}}</p>
<section class="periodo"><label>Temporada<input type="number" [(ngModel)]="temporada" min="2020" max="2100" [disabled]="busy"></label><button (click)="cargar()" [disabled]="busy">Consultar temporada</button></section>
<ng-container *ngIf="!gestion && datos"><p class="season">Temporada {{datos.temporada}}</p><p>Un pago anual por persona y temporada, según su rol. No incluye inscripciones a eventos.</p>
<p>Estado: <strong>{{estado(datos.licencia?.estado)}}</strong></p><p *ngIf="datos.habilitada">Pago anual confirmado o exención vigente.</p>
<p *ngIf="!datos.cuentaAprobada">Tu cuenta necesita aprobación para pagar.</p><p *ngIf="!datos.cobrosHabilitados">{{avisoCobro}}</p><p *ngIf="datos.aviso">{{datos.aviso}}</p>
<div class="resumen-pago" *ngIf="datos.cotizacion as q"><p>Arancel: {{moneda(q.importeArancelCentavos)}}</p><p *ngIf="q.descuentoCentavos">Descuento del periodo: {{moneda(q.descuentoCentavos)}}</p><p *ngIf="q.porcentaje">Beca anual: {{q.porcentaje}}% · {{moneda(q.beneficioCentavos)}}</p><h2>Total: {{moneda(q.totalCentavos)}}</h2></div>

<button *ngIf="!datos.habilitada" (click)="pagar()" [disabled]="busy||!datos.cuentaAprobada||!datos.cobrosHabilitados||!datos.cotizacion">{{datos.cotizacion?.exento?'Aplicar exención':'Pagar con Mercado Pago'}}</button>
<button *ngIf="datos.licencia" (click)="accion('comprobar')" [disabled]="busy">Comprobar estado del pago</button>
<p *ngIf="datos.intento">Si ya pagaste, comprobá el estado antes de volver a pagar.</p>
</ng-container>
<ng-container *ngIf="gestion"><a routerLink="/licencias/configuracion">Configurar periodos y aranceles</a> · <a routerLink="/tesoreria/becas">Becas y exenciones</a>
<p *ngIf="preparacion">Temporada habilitada: {{preparacion.temporada}} · Cuenta MP verificada: {{preparacion.connected?'Sí':'No'}} · Cobro: {{preparacion.habilitado?'habilitado':'cerrado'}} · {{preparacion.pilotoUsuarioId?'Prueba restringida':'Sin restricción de piloto'}}. {{preparacion.mensaje}}</p>
<form (ngSubmit)="cargar()"><label>Nombre o DNI<input name="buscar" [(ngModel)]="buscar" maxlength="100" [disabled]="busy"></label><button [disabled]="busy">Buscar</button></form><p>Hasta 200 resultados. Usá nombre o DNI para acotar. La exportación respeta la búsqueda y la temporada consultadas.</p><button *ngIf="tesorero" (click)="exportar()" [disabled]="busy||!consulta">Exportar importes y fechas</button>
<article *ngFor="let u of usuarios"><h3>{{u.nombre}} · DNI {{u.dni}} · {{u.rol}}</h3><p>{{u.club}} · {{estado(u.licencia?.estado)}}</p><p *ngIf="u.cotizacion">Total cotizado: {{u.cotizacion.totalCentavos/100|currency:'ARS':'symbol':'1.2-2'}} · Beca: {{u.cotizacion.porcentaje}}%</p>
<p *ngFor="let o of u.operaciones">Pago {{o.paymentId}} · {{o.estado}} · {{o.importeCentavos/100|currency:'ARS':'symbol':'1.2-2'}} · {{o.fechaAprobacion|date:'dd/MM/yyyy HH:mm'}} · Webhook: {{o.webhook?'recibido':'no recibido'}}</p>
<button *ngIf="tesorero&&u.licencia" (click)="comprobar(u.id)" [disabled]="busy">Consultar pago en Mercado Pago</button>
</article>

</ng-container></main>`,styles:[`
:host{display:block;min-height:100dvh;background:#f3f6fa;padding:24px 16px;color:#182b42}*{box-sizing:border-box}.page-header{position:relative;padding:8px 130px 24px 0;border-bottom:1px solid #e1e8f1}.page-header img{position:absolute;right:0;top:8px;width:100px;height:80px;object-fit:contain}.eyebrow{display:block;font-size:12px;font-weight:700;letter-spacing:.08em;color:#526780;margin-bottom:18px}.page-header h1{font-size:clamp(26px,4vw,38px);line-height:1.2;margin:20px 0;font-weight:700}.page-header a{display:inline-block;margin-right:20px;color:#155ab5;text-decoration:none;font-weight:600;min-height:36px}.periodo{display:flex;align-items:end;gap:16px;margin:24px 0}.periodo label{max-width:160px;margin:0}.periodo button{margin:0}.season{font-size:14px;font-weight:700;color:#526780}.resumen-pago{background:#edf4ff;border:1px solid #d8e5f8;border-radius:18px;padding:24px;margin:24px 0}.resumen-pago p{display:flex;justify-content:space-between;gap:16px}.resumen-pago h2{font-size:30px;margin:22px 0 0}.page-header~p{line-height:1.6}@media(max-width:600px){:host{padding:12px}.page-header{padding-right:0;padding-top:80px}.page-header img{left:0;top:0;width:80px;height:65px}.periodo{flex-wrap:wrap}.resumen-pago{padding:18px}}
main{max-width:920px;margin:0 auto;padding:28px;background:white;color:#17344d;border-radius:20px}label,form{display:grid;gap:10px;margin:12px 0}input{padding:12px;border:1px solid #bccddb;border-radius:8px}button{margin:8px 8px 8px 0;padding:12px;background:#155ab5;color:white;border:0;border-radius:8px;cursor:pointer}button:disabled{opacity:.5}article{padding:18px;border-bottom:1px solid #ccc}.alerta{padding:12px;background:#fff1d5}`]})
export class LicenciaAnualComponent{
 private http=inject(HttpClient);private auth=inject(AuthService);private route=inject(ActivatedRoute);private base=environment.SERVER_API.replace(/\/$/,'')+'/licencias-anuales';
 gestion=this.route.snapshot.data['gestion']===true;tesorero=this.auth.getUsuario()?.rol==='tesoreria';temporada=Number(this.route.snapshot.queryParamMap.get('temporada'))||2027;datos:any;usuarios:any[]=[];preparacion:any;buscar='';consulta='';busy=false;error='';mensaje='';form:any;seleccionada:any;
 get dashboard(){return this.auth.getUsuario()?.rol==='deportista'?'/dashboard-deport':'/dashboard-prof';}
 salir(){this.auth.logout();}
 get titulo(){return this.auth.getUsuario()?.rol==='delegado'?'Pago de cuota anual de delegado':'Pago de Licencia Provincial';}
 moneda(centavos:number){return new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:2}).format(centavos/100);}
 get avisoCobro(){return this.datos?.motivoCierre==='piloto'?'El pago está disponible únicamente para la cuenta de prueba.':this.datos?.motivoCierre==='temporada'?'El cobro de esta temporada todavía no está abierto.':'El cobro está temporalmente cerrado.';}
 private get opts(){return{headers:{Authorization:'Bearer '+this.auth.getToken()}};}
 constructor(){if(!this.gestion&&this.route.snapshot.queryParamMap.has('payment_id'))this.accion('comprobar');else this.cargar();}
 estado(s:string){return ({solicitada:'Pendiente de cobro',pendiente:'Pago pendiente',conciliada:'Pago confirmado',exenta:'Exención aplicada',requiere_revision:'Requiere revisión',pago_duplicado:'Pagos duplicados: revisar',en_proceso:'Pago en proceso',sin_pago_aprobado:'Sin pago aprobado'} as any)[s]||'Pendiente de pago';}
 fallo(e:any){this.error=e.error?.error||'No se pudo completar la operación. Volvé a comprobar el estado.';}
 cargar(){if(this.busy)return;this.busy=true;this.error='';this.form=null;this.consulta='';const q=new URLSearchParams({temporada:String(this.temporada),buscar:this.buscar.trim()}).toString();this.http.get<any>(this.base+(this.gestion?'/tesoreria?':'/mia?')+q,this.opts).pipe(finalize(()=>this.busy=false)).subscribe({next:r=>{if(this.gestion){this.usuarios=r;this.consulta=q;}else this.datos=r;},error:e=>this.fallo(e)});if(this.gestion)this.http.get<any>(this.base+'/preparacion',this.opts).subscribe({next:r=>this.preparacion=r,error:e=>this.fallo(e)});}
 accion(tipo:string){if(this.busy)return;this.busy=true;this.error='';const year=this.datos?.temporada||this.temporada;this.http.post<any>(this.base+'/'+tipo,{temporada:year},this.opts).pipe(finalize(()=>this.busy=false)).subscribe({next:r=>this.datos=r,error:e=>this.fallo(e)});}
 pagar(){if(this.busy)return;this.busy=true;this.error='';this.http.post<any>(this.base+'/checkout',{temporada:this.datos.temporada},this.opts).pipe(finalize(()=>this.busy=false)).subscribe({next:r=>{if(r.url)window.location.assign(r.url);else{this.mensaje=r.mensaje;this.busy=false;this.cargar();}},error:e=>this.fallo(e)});}
 comprobar(id:number){if(this.busy)return;this.busy=true;this.error='';this.http.post(this.base+'/comprobar/'+id,{temporada:Number(new URLSearchParams(this.consulta).get('temporada'))},this.opts).pipe(finalize(()=>this.busy=false)).subscribe({next:()=>{this.busy=false;this.cargar();},error:e=>this.fallo(e)});}
 exportar(){this.http.get(this.base+'/exportar.csv?'+this.consulta,{...this.opts,responseType:'blob'}).subscribe({next:b=>{const url=URL.createObjectURL(b),a=document.createElement('a');a.href=url;a.download='licencias.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},error:e=>this.fallo(e)});}
}
