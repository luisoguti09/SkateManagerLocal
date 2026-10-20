import {Component,inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {HttpClient} from '@angular/common/http';
import {finalize} from 'rxjs';
import {environment} from '../../../environments/environment';
import {AuthService} from '../../services/auth.service';
@Component({standalone:true,selector:'app-recuperar-cuenta',imports:[CommonModule,FormsModule,RouterLink],templateUrl:'./recuperar-cuenta.component.html',styleUrls:['./recuperar-cuenta.component.scss']})
export class RecuperarCuentaComponent{
 private http=inject(HttpClient);private auth=inject(AuthService);email='';password='';confirm='';busy=false;error='';message='';done=false;solicitado=false;emailOculto='';
 token=new URLSearchParams(location.hash.slice(1)).get('token') || '';
 constructor(){if(this.token)history.replaceState(null,'',location.pathname+location.search);}
 get passwordError(): string {
  if(this.password.length<8)return 'Usá al menos 8 caracteres.';
  if(!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(this.password) || !/[0-9]/.test(this.password))return 'Incluí al menos una letra y un número.';
  if(new TextEncoder().encode(this.password).length>72)return 'La contraseña es demasiado larga. Acortala un poco.';
  return '';
 }
 corregirCorreo(){this.solicitado=false;this.message='';this.error='';}
 enviar(){
  if(this.busy)return;this.error='';this.message='';
  if(this.token && (this.passwordError || this.password!==this.confirm)){this.error=this.passwordError || 'Las contraseñas no coinciden.';return;}
  const correo=this.email.trim();
  if(!this.token && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)){this.error='Ingresá un correo válido, por ejemplo nombre@gmail.com.';return;}
  this.busy=true;const url=environment.SERVER_API+'/auth/'+(this.token?'reset-password':'forgot-password');
  this.http.post<any>(url,this.token?{token:this.token,password:this.password}:{email:correo}).pipe(finalize(()=>this.busy=false)).subscribe({next:r=>{this.message=r.message;if(this.token){this.auth.clearSession();this.password='';this.confirm='';this.done=true;}else{const partes=correo.split('@');this.emailOculto=partes[0].slice(0,1)+'***@'+partes[1];this.solicitado=true;this.message='';}},error:e=>this.error=e.error?.error || 'No se pudo completar. Intentá nuevamente.'});
 }
}
