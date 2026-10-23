import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
export const estados: Record<string,string> = {pendiente:'Pendiente de revisión',requiere_correcciones:'Requiere correcciones',aprobado:'Aprobada',bloqueado:'Bloqueada'};
export const camposCuenta = [
 {key:'nombre',label:'Nombre completo'}, {key:'edad',label:'Edad'}, {key:'club',label:'Club'},
 {key:'categoria',label:'Categoría'}, {key:'nivel',label:'Nivel'}, {key:'domicilio',label:'Domicilio'},
 {key:'telefono',label:'Teléfono'}, {key:'fechaNacimiento',label:'Fecha de nacimiento'},
 {key:'fotoPerfil',label:'Foto de perfil'}, {key:'dniFrente',label:'DNI · frente'}, {key:'dniDorso',label:'DNI · dorso'}, {key:'fichaMedica',label:'Ficha médica'}
];
@Injectable({providedIn:'root'})
export class CuentaService {
 private http=inject(HttpClient); private auth=inject(AuthService); private base=environment.SERVER_API.replace(/\/$/,'')+'/cuenta';
 private get opts(){return {headers:{Authorization:'Bearer '+(this.auth.getToken() || '')}};}
 clubes(){return this.http.get<{id:number;nombre:string}[]>(this.base+'/clubes',this.opts);}
 enviar(files:FormData){return this.http.post<any>(this.base+'/mia/enviar',files,this.opts);}
 mia(){return this.http.get<any>(this.base+'/mia',this.opts);}
 guardar(data:any){return this.http.patch<any>(this.base+'/mia',data,this.opts);}
 subir(files:FormData){return this.http.post<any>(this.base+'/mia/archivos',files,this.opts);}
 reenviar(revision:number){return this.http.post<any>(this.base+'/mia/reenviar',{revision},this.opts);}
 listar(estado:string,q:string,page:number,club:string=""){return this.http.get<any>(this.base+'/admin/usuarios',{...this.opts,params:{...(estado?{estado}:{}),q,page,...(club?{club}:{})}});}
 detalle(id:number){return this.http.get<any>(this.base+'/admin/usuarios/'+id,this.opts);}
 decidir(id:number,data:any){return this.http.patch<any>(this.base+'/admin/usuarios/'+id+'/estado',data,this.opts);}
 documentos(id:number,data:any){return this.http.patch<any>(this.base+'/admin/usuarios/'+id+'/documentacion',data,this.opts);}
 reintentar(id:number){return this.http.post(this.base+'/admin/correos/'+id+'/reintentar',{},this.opts);}
 archivo(id:number,field:string){return this.http.get(this.base+'/'+id+'/archivo/'+field,{...this.opts,responseType:'blob'});}
 descargar(id:number,field:string){
   return this.archivo(id,field);
 }
}
export function guardarArchivo(blob:Blob,field:string){
 const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=field+(blob.type.includes('pdf')?'.pdf':'.jpg');a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
