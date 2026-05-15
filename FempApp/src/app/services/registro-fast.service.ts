import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class RegistroFastService {

  private apURL = environment.SERVER_API;
  private http = inject(HttpClient);

  constructor() { }

  buscar(dni: string) {
    return this.http.get(`${this.apURL}/padron/${dni}`);
  }

  guardarFast(email: string, password: string, dni: string ){
    return this.http.post(`${this.apURL}/register`,{
      email: email,
      password: password,
      dni: dni
    });
  }
}
