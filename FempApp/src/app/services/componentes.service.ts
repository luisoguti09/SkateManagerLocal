import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ComponentesService {

  private apiUrl = environment.SERVER_API;
  private http = inject(HttpClient);


  getComponentes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/componentes`);
  }

  crearComponente(data: any) {
  return this.http.post<any>(`${this.apiUrl}/componentes`, data);
}
}