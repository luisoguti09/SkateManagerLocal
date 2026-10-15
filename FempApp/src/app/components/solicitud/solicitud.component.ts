import {Component,OnInit,inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {finalize} from 'rxjs';
import {CuentaService,estados,camposCuenta,guardarArchivo} from '../../services/cuenta.service';
import {AuthService} from '../../services/auth.service';
@Component({selector:'app-solicitud',standalone:true,imports:[CommonModule,FormsModule,RouterLink],templateUrl:'./solicitud.component.html',styleUrls:['./solicitud.component.scss']})
export class SolicitudComponent implements OnInit{
 private api=inject(CuentaService);auth=inject(AuthService);u:any;form:any={};busy=false;error='';ok='';estados=estados;
 campos=camposCuenta.filter(c=>!['fotoPerfil','dniFrente','dniDorso','fichaMedica'].includes(c.key));
 archivos=camposCuenta.filter(c=>['fotoPerfil','dniFrente','dniDorso','fichaMedica'].includes(c.key));
 files:Record<string,File>={};
 ngOnInit(){this.cargar();}
 get destino(){return ({administrador:'/admin',deportista:'/dashboard-deport',tecnico:'/dashboard-tecnico',tesoreria:'/dashboard-tesoreria'} as Record<string,string>)[this.u?.rol] || '/login';}
 set(data:any){this.u=data;this.form={};for(const c of this.campos)this.form[c.key]=data[c.key]??'';this.form.solicitaLicenciaProvincial=!!data.solicitaLicenciaProvincial;this.auth.setUsuario(data);}
 cargar(){if(this.busy)return;this.busy=true;this.error='';this.api.mia().pipe(finalize(()=>this.busy=false)).subscribe({next:u=>this.set(u),error:e=>this.error=e.error?.error || 'No se pudo consultar la solicitud.'});}
 guardar(){if(this.busy)return;this.busy=true;this.error='';this.ok='';this.api.guardar({...this.form,revision:this.u.revision}).pipe(finalize(()=>this.busy=false)).subscribe({next:u=>{this.set(u);this.ok='Datos guardados.';},error:e=>this.error=e.error?.error || 'No se pudo guardar.'});}
 seleccionar(event:Event,key:string){const input=event.target as HTMLInputElement;const file=input.files?.[0];delete this.files[key];this.error='';if(!file)return;if(file.size>6*1024*1024){this.error='El archivo original debe pesar hasta 6 MB.';input.value='';return;}this.files[key]=file;}
 subir(){if(this.busy)return;const f=new FormData();for(const [key,file] of Object.entries(this.files))f.append(key,file);if(!Object.keys(this.files).length){this.error='Seleccioná un archivo.';return;}this.busy=true;this.error='';this.ok='';this.api.subir(f).pipe(finalize(()=>this.busy=false)).subscribe({next:u=>{this.set(u);this.files={};this.ok='Archivos guardados. Verificá que los documentos se lean bien.';},error:e=>this.error=e.error?.error || 'No se pudieron cargar los archivos.'});}
 reenviar(){if(this.busy)return;this.busy=true;this.error='';this.ok='';this.api.reenviar(this.u.revision).pipe(finalize(()=>this.busy=false)).subscribe({next:u=>{this.set(u);this.ok='Solicitud reenviada a la Federación.';},error:e=>this.error=e.error?.error || 'No se pudo reenviar.'});}
 descargar(key:string){this.api.descargar(this.u.id,key).subscribe({next:b=>guardarArchivo(b,key),error:()=>this.error='No se pudo descargar. Actualizá la pantalla.'});}
}
