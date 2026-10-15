import {Component,OnInit,inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Router} from '@angular/router';
import {finalize} from 'rxjs';
import {CuentaService,estados,camposCuenta,guardarArchivo} from '../../../services/cuenta.service';
@Component({selector:'app-revision-cuentas',standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./revision-cuentas.component.html',styleUrls:['./revision-cuentas.component.scss']})
export class RevisionCuentasComponent implements OnInit{
 private api=inject(CuentaService);private router=inject(Router);
 estados=estados;campos=camposCuenta;estado=this.router.url.includes('/todos')?'':'pendiente';q='';page=1;total=0;usuarios:any[]=[];u:any=null;busy=false;error='';ok='';motivo='';nuevoEstado='aprobado';seleccion:Record<string,boolean>={};
 ngOnInit(){this.cargar();}
 cargar(){if(this.busy)return;this.busy=true;this.error='';this.api.listar(this.estado,this.q,this.page).pipe(finalize(()=>this.busy=false)).subscribe({next:r=>{this.usuarios=r.usuarios;this.total=r.total;},error:e=>this.error=e.error?.error || 'No se pudo cargar el listado.'});}
 filtrar(){this.page=1;this.cargar();}
 pagina(delta:number){this.page+=delta;this.cargar();}
 abrir(id:number){if(this.busy)return;this.busy=true;this.error='';this.ok='';this.api.detalle(id).pipe(finalize(()=>this.busy=false)).subscribe({next:u=>{this.u=u;this.motivo='';this.seleccion={};this.nuevoEstado=u.estado==='bloqueado'?'pendiente':'aprobado';},error:e=>this.error=e.error?.error || 'No se pudo cargar la solicitud.'});}
 decidir(){if(this.busy || !this.u)return;this.busy=true;this.error='';this.ok='';const campos=Object.keys(this.seleccion).filter(k=>this.seleccion[k]);
 this.api.decidir(this.u.id,{estado:this.nuevoEstado,motivo:this.motivo,campos,revision:this.u.revision}).pipe(finalize(()=>this.busy=false)).subscribe({next:u=>{this.u=u;this.usuarios=this.usuarios.map(x=>x.id===u.id?{...x,estado:u.estado,revision:u.revision}:x);this.ok='Decisión guardada. La notificación quedó en la cola de correo.';},error:e=>this.error=e.error?.error || 'No se pudo guardar la decisión.'});}
 documentos(aprobada:boolean){if(this.busy)return;this.busy=true;this.error='';this.ok='';this.api.documentos(this.u.id,{aprobada,motivo:this.motivo,revision:this.u.revision}).pipe(finalize(()=>this.busy=false)).subscribe({next:u=>{this.u=u;this.ok='Revisión documental guardada.';},error:e=>this.error=e.error?.error || 'No se pudo revisar la documentación.'});}
 descargar(key:string){this.api.descargar(this.u.id,key).subscribe({next:b=>guardarArchivo(b,key),error:()=>this.error='No se pudo descargar el archivo.'});}
 reintentar(id:number){if(this.busy)return;this.busy=true;this.api.reintentar(id).pipe(finalize(()=>this.busy=false)).subscribe({next:()=>{this.ok='Correo programado para reintento. Actualizá el detalle para consultar el resultado.';},error:e=>this.error=e.error?.error || 'No se pudo reintentar.'});}
}
