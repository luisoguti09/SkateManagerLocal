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
 private http=inject(HttpClient);private auth=inject(AuthService);email='';password='';confirm='';busy=false;error='';message='';done=false;
 token=new URLSearchParams(location.hash.slice(1)).get('token') || '';
 constructor(){if(this.token)history.replaceState(null,'',location.pathname+location.search);}
 enviar(){
  if(this.busy)return;this.error='';this.message='';
  if(this.token && (this.password!==this.confirm || this.password.length<12 || new TextEncoder().encode(this.password).length>72)){this.error='Usá al menos 12 caracteres, hasta 72 bytes, y repetí la misma contraseña.';return;}
  this.busy=true;const url=environment.SERVER_API+'/auth/'+(this.token?'reset-password':'forgot-password');
  this.http.post<any>(url,this.token?{token:this.token,password:this.password}:{email:this.email}).pipe(finalize(()=>this.busy=false)).subscribe({next:r=>{this.message=r.message;if(this.token){this.auth.clearSession();this.password='';this.confirm='';this.done=true;}},error:e=>this.error=e.error?.error || 'No se pudo completar. Intentá nuevamente.'});
 }
}
