import {Component,OnInit,inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {HttpClient} from '@angular/common/http';
import {AuthService} from '../../services/auth.service';
import {environment} from '../../../environments/environment';
@Component({standalone:true,imports:[CommonModule,FormsModule,RouterLink],selector:'app-licencias-config',templateUrl:'./licencias-config.component.html',styleUrls:['./licencias-config.component.scss']})
export class LicenciasConfigComponent implements OnInit{
 private http=inject(HttpClient);private auth=inject(AuthService);private url=environment.SERVER_API.replace(/\/$/,'')+'/licencias-config';
 datos:any=null;revision=0;motivo='';historial:any[]=[];busy=false;error='';mensaje='';avisos:any[]=[];
 buscar='';club='';estado='aprobado';clubes:string[]=[];registros:any[]=[];cargandoCotejo=false;cotejoListo=false;aplicados='';errorCotejo='';
 temporada=2027;nuevaTemporada=new Date().getFullYear()+1;temporadas:number[]=[2027];seccion='deportistas';correoOperativo=false;private cargaId=0;
 get editar(){return this.auth.getUsuario()?.rol==='tesoreria';}get opts(){return{headers:{Authorization:'Bearer '+this.auth.getToken()}};}
 ngOnInit(){this.cargar();if(this.editar)this.buscarCotejo();else this.seccion='periodos';}
 fallo(e:any){this.busy=false;this.error=e.error?.error||'No se pudo completar la operación. Reintentá.';}
 cargar(){const id=++this.cargaId;this.busy=true;this.error='';this.datos=null;this.historial=[];this.avisos=[];
  this.http.get<any>(this.url+'?temporada='+this.temporada,this.opts).subscribe({next:r=>{if(id!==this.cargaId)return;this.datos=r.datos;this.revision=r.revision;this.avisos=r.avisos||[];this.correoOperativo=r.correoOperativo;this.busy=false;},error:e=>{if(id===this.cargaId)this.fallo(e);}});
  this.http.get<any[]>(this.url+'/historial?temporada='+this.temporada,this.opts).subscribe({next:r=>{if(id===this.cargaId)this.historial=r;},error:e=>{if(id===this.cargaId)this.fallo(e);}});
  this.http.get<number[]>(this.url+'/temporadas',this.opts).subscribe({next:r=>this.temporadas=[...new Set([2027,this.temporada,...r])].sort((a,b)=>b-a),error:()=>{}});
 }
 cambiarTemporada(){this.motivo='';this.mensaje='';this.cargar();}
 crearTemporada(){if(!Number.isInteger(this.nuevaTemporada)||this.nuevaTemporada<2020||this.nuevaTemporada>2100)return;this.temporada=this.nuevaTemporada;this.seccion='periodos';this.cambiarTemporada();}
 parametros(){return new URLSearchParams({buscar:this.buscar.trim(),club:this.club,estado:this.estado}).toString();}
 get filtrosCambiados(){return this.parametros()!==this.aplicados;}
 buscarCotejo(){if(this.cargandoCotejo)return;this.cargandoCotejo=true;this.cotejoListo=false;this.errorCotejo='';const q=this.parametros();this.http.get<any>(this.url+'/cotejo?'+q,this.opts).subscribe({next:r=>{this.registros=r.registros;this.clubes=r.clubes;this.aplicados=q;this.cotejoListo=true;this.cargandoCotejo=false;},error:e=>{this.cargandoCotejo=false;this.errorCotejo=e.error?.error||'No se pudo cargar el padrón. Reintentá la búsqueda.';}});}
 descargar(ruta:string,nombre:string){this.http.get(this.url+'/'+ruta,{...this.opts,responseType:'blob'}).subscribe({next:blob=>{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=nombre;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},error:e=>this.fallo(e)});}
 exportar(){if(!this.cotejoListo||this.filtrosCambiados)return;this.descargar('cotejo.csv?'+this.aplicados,'cotejo-deportistas.csv');}
 exportarAranceles(){this.descargar('aranceles.csv?temporada='+this.temporada,'aranceles-licencias-'+this.temporada+'.csv');}
 agregar(){this.datos.tramos.push({nombre:'Periodo '+(this.datos.tramos.length+1),desde:'',hasta:'',importe:null,vencimiento:'',descuento:{activo:false,porcentaje:0,desde:'',hasta:''}});}
 guardar(){this.busy=true;this.error='';this.mensaje='';this.http.put(this.url+'?temporada='+this.temporada,{datos:this.datos,revision:this.revision,motivo:this.motivo},this.opts).subscribe({next:()=>{this.mensaje='Configuración guardada con historial.';this.motivo='';this.cargar();},error:e=>this.fallo(e)});}
}
