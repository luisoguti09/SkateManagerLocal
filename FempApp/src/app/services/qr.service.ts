import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment.development';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({ providedIn:'root' })
export class QrService {

  private http = inject(HttpClient);
  private apiURL = environment.SERVER_API;
  private auth = inject(AuthService);

  getPng(uid: number, bustCache = false): Observable<Blob> {
    const t = bustCache ? `?t=${Date.now()}` : '';
    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.auth.getToken() || ''}`
    });
    return this.http.get(`${this.apiURL}/usuarios/${uid}/qr.png${t}`, {
      responseType: 'blob',
      headers
    });
  }

  generar(uid: number) {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.auth.getToken() || ''}`
    });
    return this.http.post<{ token: string }>(
      `${this.apiURL}/usuarios/${uid}/qr`,
      {},
      { headers }
    );
  }
}

