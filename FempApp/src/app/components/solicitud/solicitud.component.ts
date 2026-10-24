import {Component,OnInit,OnDestroy,inject,ChangeDetectorRef,ElementRef} from '@angular/core';
import {DomSanitizer,SafeResourceUrl} from '@angular/platform-browser';
import {Subscription} from 'rxjs';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {finalize} from 'rxjs';
import {CuentaService,estados,camposCuenta,guardarArchivo} from '../../services/cuenta.service';
import {AuthService} from '../../services/auth.service';
@Component({selector:'app-solicitud',standalone:true,imports:[CommonModule,FormsModule,RouterLink],templateUrl:'./solicitud.component.html',styleUrls:['./solicitud.component.scss']})
export class SolicitudComponent implements OnInit,OnDestroy {
 private sanitizer=inject(DomSanitizer);
 vistaArchivo: {key:string;label:string;url:string;pdf:SafeResourceUrl|null}|null=null;
 cargandoArchivo='';errorArchivo='';
 private peticionArchivo?:Subscription;
 private versionArchivo=0;
 cerrarArchivo(){
  this.versionArchivo++;
  this.peticionArchivo?.unsubscribe();this.peticionArchivo=undefined;
  if(this.vistaArchivo)URL.revokeObjectURL(this.vistaArchivo.url);
  this.vistaArchivo=null;this.cargandoArchivo='';this.errorArchivo='';
 }
 ngOnDestroy(){this.cerrarArchivo();this.wadaPeticion?.unsubscribe();}
 verArchivo(key:string,label:string){
  if(!this.u || this.busy)return;
  this.cerrarArchivo();this.cargandoArchivo=key;
  const version=this.versionArchivo;
  this.peticionArchivo=this.api.archivo(this.u.id,key).subscribe({
   next:async blob=>{
    try {
     // Solo se crean URL locales para imágenes y PDF recibidos por la API autenticada.
     const bytes=new Uint8Array(await blob.slice(0,5).arrayBuffer());
     if(version!==this.versionArchivo)return;
     const pdf=String.fromCharCode(...bytes)==='%PDF-';
     const jpg=bytes[0]===255 && bytes[1]===216 && bytes[2]===255;
     if(!pdf && !jpg)throw new Error('unsupported');
     const url=URL.createObjectURL(new Blob([blob],{type:pdf?'application/pdf':'image/jpeg'}));
     this.vistaArchivo={key,label,url,pdf:pdf?this.sanitizer.bypassSecurityTrustResourceUrl(url):null};
     this.cargandoArchivo='';this.enfocar('[data-visor]');
    } catch {
     if(version===this.versionArchivo){this.cargandoArchivo='';this.errorArchivo='No se pudo mostrar el archivo. Podés intentar descargarlo.';}
    }
   },
   error:()=>{if(version===this.versionArchivo){this.cargandoArchivo='';this.errorArchivo='No se pudo abrir el documento. Actualizá el detalle y volvé a intentar.';}}
  });
 }

 private api=inject(CuentaService);private vista=inject(ChangeDetectorRef);private host=inject(ElementRef);
 auth=inject(AuthService);u:any;form:any={};busy=false;error='';ok='';estados=estados;
 clubes:{id:number;nombre:string}[]=[];cargandoClubes=false;errorClubes='';
 files:Partial<Record<string,File>>={};
 temporada=new Date().getFullYear();requisitoWada:any;errorWada='';
 fechas:Record<string,string>={fichaMedica:'fichaMedicaFecha',certificadoWada:'wadaFecha'};
 private wadaPeticion?:Subscription;
 consultarWada(){this.wadaPeticion?.unsubscribe();this.errorWada='';this.requisitoWada=null;this.wadaPeticion=this.api.requisitoWada(this.temporada).subscribe({next:r=>this.requisitoWada=r,error:()=>this.errorWada='No se pudo consultar el requisito para esa temporada.'});}
 renovarDocumento(campo:string){
  if(this.busy||!this.fechas[campo])return;
  const fecha=this.form[this.fechas[campo]];if(!fecha){this.error='Ingresá la fecha de expedición.';return;}
  const f=new FormData();f.append('datos',JSON.stringify({revision:this.u.revision,[this.fechas[campo]]:fecha}));
  const file=this.files[campo];if(file)f.append(campo,file);
  this.busy=true;this.error='';this.ok='';this.cerrarArchivo();
  this.api.renovarDocumentos(f).pipe(finalize(()=>this.busy=false)).subscribe({next:u=>{this.set(u);this.files={};this.ok='Documento actualizado. La revisión documental queda pendiente; tu cuenta continúa aprobada.';},error:e=>this.error=e.error?.error||'No se pudo guardar. Actualizá y reintentá.'});
 }
 get archivos(){return camposCuenta.filter(c=>this.u?.politicaDocumentos?.visibles?.includes(c.key));}
 get deportiva(){return ['deportista','tecnico'].includes(this.u?.rol);}
 get editable(){return this.u && (this.u.estado==='requiere_correcciones' || (this.u.estado==='pendiente' && !this.u.solicitudEnviada));}
 get campos(){return camposCuenta.filter(c=>!['fotoPerfil','dniFrente','dniDorso','fichaMedica','certificadoAntecedentes','certificadoWada','categoria','club'].includes(c.key) && (c.key!=='nivel' || this.u?.rol==='tecnico'));}
 get observacionesCampos(){return camposCuenta.filter(c=>c.key!=='categoria' && this.u?.camposCorregir?.includes(c.key));}
 get destino(){return ({administrador:'/admin',deportista:'/dashboard-deport',tecnico:'/dashboard-prof',juez:'/dashboard-juez',tesoreria:'/dashboard-tesoreria'} as Record<string,string>)[this.u?.rol] || '/login';}
 get tituloEstado(){return this.u?.etapaSolicitud || this.estados[this.u?.estado] || 'Mi solicitud';}
 ngOnInit(){this.cargar();this.cargarClubes();}
 private enfocar(selector:string){this.vista.detectChanges();const el=this.host.nativeElement.querySelector(selector) as HTMLElement|null;el?.focus({preventScroll:true});el?.scrollIntoView({block:'start',behavior:'auto'});}
 set(data:any){this.u=data;this.form={};for(const c of this.campos)this.form[c.key]=data[c.key]??'';this.form.club=data.club??'';for(const k of Object.values(this.fechas))this.form[k]=data[k]??'';this.auth.setUsuario(data);}
 cargar(){if(this.busy)return;this.cerrarArchivo();this.busy=true;this.error='';this.api.mia().pipe(finalize(()=>this.busy=false)).subscribe({next:u=>{this.set(u);this.files={};},error:e=>{this.error=e.error?.error || 'No se pudo consultar la solicitud.';}});}
 cargarClubes(){if(this.cargandoClubes)return;this.cargandoClubes=true;this.errorClubes='';this.api.clubes().pipe(finalize(()=>this.cargandoClubes=false)).subscribe({next:r=>{this.clubes=Array.isArray(r)?r:[];if(!this.clubes.length)this.errorClubes='No hay clubes disponibles. Consultá a la Federación antes de enviar.';},error:()=>this.errorClubes='No se pudo cargar el listado de clubes. Reintentá.'});}
 seleccionar(event:Event,key:string){const input=event.target as HTMLInputElement;const file=input.files?.[0];delete this.files[key];this.error='';if(!file)return;const pdf=['fichaMedica','certificadoAntecedentes','certificadoWada'].includes(key) && file.type==='application/pdf';if(!['image/jpeg','image/png','image/webp',...(['fichaMedica','certificadoAntecedentes','certificadoWada'].includes(key)?['application/pdf']:[])].includes(file.type)){this.error='Seleccioná JPG, PNG o WebP; la ficha médica y el certificado también admiten PDF.';input.value='';return;}if(file.size>(pdf?2:6)*1024*1024){this.error=pdf?'El PDF debe pesar hasta 2 MB.':'La imagen debe pesar hasta 6 MB.';input.value='';return;}this.files[key]=file;}
 enviar(){
  if(this.busy || !this.editable)return;
  this.cerrarArchivo();this.error='';this.ok='';
  if(!this.u.politicaDocumentos){this.error='Actualizá la aplicación y el backend antes de enviar.';return;}
  const faltantes=(this.u.politicaDocumentos.obligatorios as string[]).filter(k=>!this.files[k] && !this.u.documentos?.[k]);
  if(faltantes.length){this.error='Completá: '+this.archivos.filter(c=>faltantes.includes(c.key)).map(c=>c.label).join(', ')+'.';this.enfocar('.error');return;}
  if(this.deportiva && !this.clubes.some(c=>c.nombre===this.form.club)){this.error='Seleccioná un club del listado.';this.enfocar('.error');return;}
  const datos={...this.form,revision:this.u.revision};for(const k of Object.values(this.fechas))if(!datos[k])delete datos[k];
  const f=new FormData();f.append('datos',JSON.stringify(datos));
  for(const [key,file] of Object.entries(this.files))if(file)f.append(key,file);
  this.busy=true;
  this.api.enviar(f).pipe(finalize(()=>this.busy=false)).subscribe({
   next:u=>{this.set(u);this.files={};this.ok='Solicitud enviada. La Federación revisará tus datos y documentos.';this.enfocar('[data-estado]');},
   error:e=>{this.error=e.error?.error || 'No pudimos confirmar el envío. Tus datos siguen en pantalla. Podés reintentar; si ya se recibió, no se duplicará.';this.enfocar('.error');}
  });
 }
 renovarCertificado(){
  if(this.busy || this.u?.rol!=='tecnico' || this.u?.estado!=='aprobado')return;
  const archivo=this.files['certificadoAntecedentes'];
  if(!archivo){this.error='Seleccioná el certificado antes de enviarlo.';return;}
  const f=new FormData();f.append('revision',String(this.u.revision));f.append('certificadoAntecedentes',archivo);
  this.busy=true;this.error='';this.ok='';this.cerrarArchivo();
  this.api.renovarCertificado(f).pipe(finalize(()=>this.busy=false)).subscribe({
   next:u=>{this.set(u);this.files={};this.ok='Certificado recibido. Queda pendiente de revisión documental por Administración; tu cuenta continúa aprobada.';this.enfocar('[data-estado]');},
   error:e=>this.error=e.error?.error || 'No se pudo guardar el certificado. Actualizá el estado antes de reintentar.'
  });
 }
 salir(){if(this.busy)return;this.cerrarArchivo();this.auth.logout();}
 descargar(key:string){this.api.descargar(this.u.id,key).subscribe({next:b=>guardarArchivo(b,key),error:()=>{this.error='No se pudo descargar el archivo.';this.enfocar('.error');}});}
}
