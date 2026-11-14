import {Injectable,inject} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../environments/environment';
import {AuthService} from './auth.service';
export interface DeporteCatalogo {nombre:string;fuente?:string;activo?:boolean;fijo:boolean;revision?:number;disciplinas:{nombre:string;categorias:string[]}[];}
@Injectable({providedIn:'root'})
export class DeportesCatalogoService{
 private http=inject(HttpClient);private auth=inject(AuthService);private base=environment.SERVER_API.replace(/\/$/,'')+'/deportes-catalogo';
 private get options(){return{headers:{Authorization:'Bearer '+(this.auth.getToken()||'')}};}
 acceso(){return this.http.get<{general:boolean;deportes:string[]}>(this.base+'/acceso',this.options);}
 usuarios(buscar:string){return this.http.get<any[]>(this.base+'/usuarios',{...this.options,params:{buscar}});}
 permiso(id:number){return this.http.get<any>(this.base+'/permisos/'+id,this.options);}
 guardarPermiso(data:unknown){return this.http.put<any>(this.base+'/permisos',data,this.options);}
 listar(){return this.http.get<DeporteCatalogo[]>(this.base);}
 administrar(){return this.http.get<DeporteCatalogo[]>(this.base+'/administracion',this.options);}
 guardar(data:unknown){return this.http.put<DeporteCatalogo>(this.base,data,this.options);}
}
