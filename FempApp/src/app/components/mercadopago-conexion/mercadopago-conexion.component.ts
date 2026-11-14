import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';
interface Connection { connectionMode?: string; configured: boolean; connected: boolean; message?: string; collectorId?: string; nickname?: string; mode?: string; expiresAt?: string; verifiedAt?: string; }
interface Pending { status: string; collectorId?: string; nickname?: string; }
@Component({standalone:true, selector:'app-mercadopago-conexion', imports:[CommonModule,RouterLink],templateUrl:'./mercadopago-conexion.component.html',styleUrl:'./mercadopago-conexion.component.scss'})
export class MercadopagoConexionComponent implements OnInit {
 private http=inject(HttpClient); private auth=inject(AuthService); private route=inject(ActivatedRoute);
 private base=environment.SERVER_API.replace(/\/$/,'')+'/mercadopago'; private key='skate-manager-mp-oauth-ticket';
 connection?:Connection; pending?:Pending; busy=false; error=''; ok='';
 private get options(){return {headers:{Authorization:'Bearer '+(this.auth.getToken()||'')}};}
 ngOnInit(){
  if(this.route.snapshot.queryParamMap.get('resultado')==='error')this.error='No se completó la autorización. Puede haber vencido, haberse cancelado o corresponder a otra cuenta. Iniciá nuevamente con la cuenta institucional.';
  this.http.get<Connection>(this.base+'/conexion',this.options).subscribe({next:c=>{
   this.connection=c;
   if(c.connectionMode==='direct'){sessionStorage.removeItem(this.key);this.pending=undefined;this.error='';return;}
   const ticket=sessionStorage.getItem(this.key);
   if(ticket)this.http.post<Pending>(this.base+'/oauth/pendiente',{ticket},this.options).subscribe({next:p=>this.pending=p,error:()=>sessionStorage.removeItem(this.key)});
  },error:e=>this.error=e.error?.error||'No se pudo consultar la conexión.'});
 }
 begin(){this.busy=true;this.error='';this.ok='';
  this.http.post<{url:string;ticket:string}>(this.base+'/oauth/iniciar',{},this.options).pipe(finalize(()=>this.busy=false)).subscribe({next:data=>{
   const url=new URL(data.url);if(url.origin!=='https://auth.mercadopago.com.ar'||url.pathname!=='/authorization'){this.error='Dirección de autorización inválida.';return;}
   sessionStorage.setItem(this.key,data.ticket);window.location.assign(url.href);
  },error:e=>this.error=e.error?.error||'No se pudo iniciar la autorización.'});
 }
 confirm(){const ticket=sessionStorage.getItem(this.key);if(!ticket){this.error='Iniciá nuevamente desde este navegador.';return;}
  this.busy=true;this.error='';this.http.post<Connection>(this.base+'/oauth/confirmar',{ticket},this.options).pipe(finalize(()=>this.busy=false)).subscribe({next:c=>{this.connection=c;this.pending=undefined;sessionStorage.removeItem(this.key);this.ok='Cuenta vinculada. La conexión quedó registrada; todavía no se habilitaron cobros.';},error:e=>this.error=e.error?.error||'No se pudo confirmar la cuenta.'});
 }
 verify(){this.busy=true;this.error='';this.ok='';this.http.post<Connection>(this.base+'/conexion/verificar',{},this.options).pipe(finalize(()=>this.busy=false)).subscribe({next:c=>{this.connection=c;this.ok='Mercado Pago confirmó la cuenta receptora.';},error:e=>{if(this.connection)this.connection={...this.connection,connected:false};this.error=e.error?.error||'No se pudo comprobar la conexión.';}});}
}
