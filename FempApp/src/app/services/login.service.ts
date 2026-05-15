import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoginService {

  private apURL = environment.SERVER_API;
  private http = inject(HttpClient);
  public loggedUser: any = null;


  public login(email: string, password: string): Observable<any>{
    return this.http.post(`${this.apURL}/login`, {
      email,
      password
    });
  }

}
