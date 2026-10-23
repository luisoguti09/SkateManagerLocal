import {Component,OnInit,OnDestroy,inject,ChangeDetectorRef,ElementRef} from '@angular/core';
import {DomSanitizer,SafeResourceUrl} from '@angular/platform-browser';
import {Subscription} from 'rxjs';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Router} from '@angular/router';
import {finalize,switchMap,catchError,EMPTY} from 'rxjs';
import {CuentaService,estados,camposCuenta,guardarArchivo} from '../../../services/cuenta.service';
@Component({selector:'app-revision-cuentas',standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./revision-cuentas.component.html',styleUrls:['./revision-cuentas.component.scss']})
export class RevisionCuentasComponent implements OnInit,OnDestroy{
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
 ngOnDestroy(){this.cerrarArchivo();}
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
 private vista=inject(ChangeDetectorRef);private host=inject(ElementRef);
 private api=inject(CuentaService);private router=inject(Router);
 estados=estados;get campos(){return camposCuenta.filter(c=>c.key!=='categoria' && (!['fotoPerfil','dniFrente','dniDorso','fichaMedica'].includes(c.key) || this.u?.politicaDocumentos?.visibles?.includes(c.key) || this.u?.documentos?.[c.key]));}
 get camposCorregibles(){return this.campos.filter(c=>!['fotoPerfil','dniFrente','dniDorso','fichaMedica'].includes(c.key) || this.u?.politicaDocumentos?.visibles?.includes(c.key));}
 club='';clubes:{id:number;nombre:string}[]=[];errorClubes='';
 estado=this.router.url.includes('/todos')?'':'pendiente';q='';page=1;total=0;usuarios:any[]=[];u:any=null;busy=false;error='';ok='';motivo='';nuevoEstado='aprobado';seleccion:Record<string,boolean>={};
 private enfocar(selector:string){
  this.vista.detectChanges();
  const elemento=this.host.nativeElement.querySelector(selector) as HTMLElement | null;
  elemento?.focus({preventScroll:true});
  elemento?.scrollIntoView({block:'start',behavior:'auto'});
 }
 volver(){if(this.busy)return;this.cerrarArchivo();this.u=null;this.motivo='';this.seleccion={};this.error='';this.ok='';this.enfocar('header');}
 ngOnInit(){this.cargar();this.api.clubes().subscribe({next:r=>this.clubes=r,error:()=>this.errorClubes='No se pudo cargar el selector de clubes. Podés seguir consultando todas las cuentas.'});}
 cargar(){if(this.busy)return;this.busy=true;this.error='';this.api.listar(this.estado,this.q,this.page,this.club).pipe(finalize(()=>this.busy=false)).subscribe({next:r=>{this.usuarios=r.usuarios;this.total=r.total;},error:e=>this.error=e.error?.error || 'No se pudo cargar el listado.'});}
 filtrar(){this.page=1;this.cargar();}
 pagina(delta:number){this.page+=delta;this.cargar();}
 abrir(id:number){if(this.busy)return;this.cerrarArchivo();this.busy=true;this.error='';this.ok='';this.api.detalle(id).pipe(finalize(()=>this.busy=false)).subscribe({next:u=>{this.u=u;this.motivo='';this.seleccion={};this.nuevoEstado=u.estado==='bloqueado'?'pendiente':'aprobado';this.enfocar('[data-solicitud]');},error:e=>this.error=e.error?.error || 'No se pudo cargar la solicitud.'});}
 decidir(){
  if(this.busy || !this.u)return;
  this.busy=true;this.error='';this.ok='';
  const campos=Object.keys(this.seleccion).filter(k=>this.seleccion[k]);
  this.api.decidir(this.u.id,{estado:this.nuevoEstado,motivo:this.motivo,campos,revision:this.u.revision}).pipe(
   switchMap(()=>{
    this.cerrarArchivo();this.u=null;this.motivo='';this.seleccion={};this.page=1;this.usuarios=[];this.total=0;
    this.ok='Decisión guardada. La notificación quedó en la cola de correo.';
    this.enfocar('header');
    return this.api.listar(this.estado,this.q,this.page,this.club).pipe(catchError(()=>{
     this.error='La decisión se guardó, pero no se pudo actualizar el listado. Pulsá Buscar para reintentarlo.';
     this.enfocar('.error');return EMPTY;
    }));
   }),
   finalize(()=>this.busy=false)
  ).subscribe({
   next:r=>{this.usuarios=r.usuarios;this.total=r.total;},
   error:e=>{this.error=e.error?.error || 'No se pudo guardar la decisión.';this.enfocar('.error');}
  });
 }
 documentos(aprobada:boolean){if(this.busy)return;this.busy=true;this.error='';this.ok='';this.api.documentos(this.u.id,{aprobada,motivo:this.motivo,revision:this.u.revision}).pipe(finalize(()=>this.busy=false)).subscribe({next:u=>{this.u=u;this.ok='Revisión documental guardada.';},error:e=>this.error=e.error?.error || 'No se pudo revisar la documentación.'});}
 descargar(key:string){this.api.descargar(this.u.id,key).subscribe({next:b=>guardarArchivo(b,key),error:()=>this.error='No se pudo descargar el archivo.'});}
 reintentar(id:number){if(this.busy)return;this.busy=true;this.api.reintentar(id).pipe(finalize(()=>this.busy=false)).subscribe({next:()=>{this.ok='Correo programado para reintento. Actualizá el detalle para consultar el resultado.';},error:e=>this.error=e.error?.error || 'No se pudo reintentar.'});}
}
