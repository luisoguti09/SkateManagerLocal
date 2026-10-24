import {Component,OnInit,OnDestroy,inject,ElementRef,ChangeDetectorRef} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {HttpClient} from '@angular/common/http';
import {DomSanitizer,SafeResourceUrl} from '@angular/platform-browser';
import {Subscription,finalize} from 'rxjs';
import {environment} from '../../../environments/environment';
import {AuthService} from '../../services/auth.service';
interface Deportista {padronId:number;usuarioId:number|null;nombre:string;dni:string;categoria:string|null;documentacionAprobada:boolean|null;}
interface Panel {club:string;deportistas:Deportista[];cuentasSinPadron:{usuarioId:number;nombre:string}[];eventos:any[];}
@Component({selector:'app-panel-tecnica',standalone:true,imports:[CommonModule,FormsModule,RouterLink],templateUrl:'./panel-tecnica.component.html',styleUrls:['./panel-tecnica.component.scss']})
export class PanelTecnicaComponent implements OnInit,OnDestroy {
 private host=inject(ElementRef);private view=inject(ChangeDetectorRef);
 auth=inject(AuthService);private http=inject(HttpClient);private sanitizer=inject(DomSanitizer);
 private base=environment.SERVER_API.replace(/\/$/,'');private subscriptions=new Subscription();private archivoPeticion?:Subscription;private docPeticion?:Subscription;private version=0;
 panel:Panel|null=null;busy=false;error='';evaluaciones:any[]=[];errorEvaluaciones='';cargandoEvaluaciones=false;
 tab='resumen';buscar='';seleccion:Deportista|null=null;documentos:string[]=[];vigencias:any[]=[];cargandoDocumentos=false;errorDocumentos='';cargandoArchivo=false;
 archivo:{url:string;pdf:SafeResourceUrl|null;nombre:string}|null=null;
 labels:Record<string,string>={fotoPerfil:'Foto de perfil',dniFrente:'DNI · frente',dniDorso:'DNI · dorso',fichaMedica:'Ficha médica',certificadoWada:'Certificado WADA'};
 ngOnInit(){this.cargar();}
 get opts(){return {headers:{Authorization:'Bearer '+(this.auth.getToken()||'')}};}
 get nombre(){return this.auth.getUsuario()?.nombre?.split(' ')[0]||'Entrenadora';}
 get filtradas(){const q=this.buscar.toLocaleLowerCase();return this.panel?.deportistas.filter(p=>`${p.nombre} ${p.dni} ${p.categoria||''}`.toLocaleLowerCase().includes(q))||[];}
 get pendientes(){return this.panel?.deportistas.filter(p=>p.documentacionAprobada===false).length||0;}
 get participaciones(){return this.panel?.eventos.reduce((n,e)=>n+e.inscripciones.filter((i:any)=>!['baja','cancelada','cancelado'].includes(i.estadoInscripcion)).length,0)||0;}
 personas(evento:any){return new Set(evento.inscripciones.filter((i:any)=>!['baja','cancelada','cancelado'].includes(i.estadoInscripcion)).map((i:any)=>i.UsuarioId)).size;}
 get historial(){return this.seleccion?this.evaluaciones.filter(e=>Number(e.deportistaId)===this.seleccion!.padronId):this.evaluaciones;}
 nombreDeportista(id:number){return this.panel?.deportistas.find(p=>p.padronId===Number(id))?.nombre||'Deportista';}
 get meses(){const now=new Date();const rows=Array.from({length:6},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-5+i,1);return {key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,label:d.toLocaleDateString('es-AR',{month:'short'}),cantidad:0,alto:0};});for(const e of this.evaluaciones){const d=new Date(e.fechaEvaluacion||e.createdAt);if(!Number.isNaN(d.getTime())){const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;const r=rows.find(x=>x.key===k);if(r)r.cantidad++;}}const max=Math.max(1,...rows.map(r=>r.cantidad));return rows.map(r=>({...r,alto:r.cantidad/max*100}));}
 cargar(){if(this.busy)return;this.cerrar();this.busy=true;this.error='';this.subscriptions.add(this.http.get<Panel>(this.base+'/tecnica/panel',this.opts).pipe(finalize(()=>this.busy=false)).subscribe({next:r=>{this.panel=r;this.cargarEvaluaciones();},error:e=>{this.panel=null;this.evaluaciones=[];this.error=e.error?.error||'No pudimos cargar tu club. Reintentá.';}}));}
 cargarEvaluaciones(){this.errorEvaluaciones='';this.cargandoEvaluaciones=true;this.subscriptions.add(this.http.get<any[]>(this.base+'/evaluaciones',this.opts).pipe(finalize(()=>this.cargandoEvaluaciones=false)).subscribe({next:r=>this.evaluaciones=r,error:()=>{this.evaluaciones=[];this.errorEvaluaciones='No se pudieron consultar las evaluaciones.';}}));}
 cambiar(tab:string){this.cerrar();this.tab=tab;}
 abrir(p:Deportista){this.cerrar();this.seleccion=p;this.tab='padron';this.view.detectChanges();const detail=this.host.nativeElement.querySelector('.detail') as HTMLElement|null;detail?.focus({preventScroll:true});detail?.scrollIntoView({block:'start'});if(!p.usuarioId)return;this.cargandoDocumentos=true;this.docPeticion=this.http.get<any>(`${this.base}/tecnica/deportistas/${p.usuarioId}/documentos`,this.opts).pipe(finalize(()=>this.cargandoDocumentos=false)).subscribe({next:r=>{this.documentos=r.documentos;this.vigencias=r.vigencias||[];},error:e=>this.errorDocumentos=e.error?.error||'No se pudieron cargar los documentos.'});}
 cerrarArchivo(){this.version++;this.archivoPeticion?.unsubscribe();if(this.archivo)URL.revokeObjectURL(this.archivo.url);this.archivo=null;this.cargandoArchivo=false;}
 cerrar(){this.docPeticion?.unsubscribe();this.cerrarArchivo();this.seleccion=null;this.documentos=[];this.vigencias=[];this.errorDocumentos='';this.cargandoDocumentos=false;}
 ver(campo:string){if(!this.seleccion?.usuarioId)return;this.cerrarArchivo();this.errorDocumentos='';this.cargandoArchivo=true;const version=this.version;this.archivoPeticion=this.http.get(`${this.base}/tecnica/deportistas/${this.seleccion.usuarioId}/archivo/${campo}`,{...this.opts,responseType:'blob'}).subscribe({next:async blob=>{const b=new Uint8Array(await blob.slice(0,5).arrayBuffer());if(version!==this.version)return;const pdf=String.fromCharCode(...b)==='%PDF-',jpg=b[0]===255&&b[1]===216&&b[2]===255;if(!pdf&&!jpg){this.errorDocumentos='Formato no compatible con el visor.';this.cargandoArchivo=false;return;}const url=URL.createObjectURL(new Blob([blob],{type:pdf?'application/pdf':'image/jpeg'}));this.archivo={url,pdf:pdf?this.sanitizer.bypassSecurityTrustResourceUrl(url):null,nombre:this.labels[campo]};this.cargandoArchivo=false;},error:e=>{this.errorDocumentos='No se pudo abrir el documento. Actualizá para comprobar el acceso.';this.cargandoArchivo=false;}});}
 ngOnDestroy(){this.cerrar();this.subscriptions.unsubscribe();}
}
