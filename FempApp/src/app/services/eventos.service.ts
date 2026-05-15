import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { Evento, EventoLite } from '../interfaces/evento';
import { environment } from '../../environments/environment.development';
import { NuevoEventoDto, EditEventoDto } from '../interfaces/evento-dto';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class EventosService {

  private apiURL = environment.SERVER_API;
  private http = inject(HttpClient);
  private readonly base = `${this.apiURL}/eventos`;
  private authSrv = inject(AuthService);

  public get baseUrl(): string { return this.base; }

  getEventosA(): Observable<Evento[]> {
    return this.http.get<Evento[]>(`${this.apiURL}/eventos`)
      .pipe(
        tap(data => {
          console.log('Datos recibidos:', data);
        }),
        catchError(error => {
          console.error('Error al obtener eventos:', error);
          return of([]);
        })
      );
  }

  getEventoByIdA(id: number): Observable<Evento> {
    return this.http.get<Evento>(`${this.apiURL}/eventos/${id}`);
  }

  getEventosDelUsuarios(usuarioDni: number): Observable<Evento[]> {
    return this.http.get<Evento[]>(`${this.apiURL}/usuarios/${usuarioDni}/eventos`);
  }


  getEventosDelPatinador(dni: string): Observable<Evento[]> {
    return this.http.get<Evento[]>(`${this.apiURL}/usuarios/${dni}/eventos`);
  }

  getDeportistasInscripto(eventoId: number) {
    const token = localStorage.getItem('auth_token') || '';
    return this.http.get<any[]>(
      `${this.apiURL}/eventos/${eventoId}/usuarios`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
  }

  /** Mapea respuesta del API a tu modelo con alias (nombre, fecha) */
  private mapEvento = (e: any): Evento => ({
    ...e,
    nombre: e.titulo ?? e.nombre,
    fecha: e.fechaInicio ?? e.fecha,
  });

  getEventos(): Observable<Evento[]> {
    return this.http.get<Evento[]>(this.base).pipe(
      map(list => (list ?? []).map(this.mapEvento)),
      tap(list => console.log('Eventos:', list)),
      catchError(err => { console.error('getEventos', err); return of([]); })
    );
  }

  getEventoById(id: number): Observable<Evento> {
    return this.http.get<Evento>(`${this.base}/${id}`).pipe(map(this.mapEvento));
  }

  addEvento(dto: NuevoEventoDto): Observable<Evento> {
    return this.http.post<Evento>(this.base, dto).pipe(map(this.mapEvento));
  }

  updateEvento(id: number, dto: EditEventoDto): Observable<Evento> {
    return this.http.put<Evento>(`${this.base}/${id}`, dto).pipe(map(this.mapEvento));
  }

  deleteEvento(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  inscribirDeportista(eventoId: number, usuarioId: number, perfilDeportivoId?: number | null): Observable<any> {
    return this.http.post(`${this.base}/${eventoId}/inscribir`, {
      usuarioId,
      perfilDeportivoId
    });
  }

  getEventosDelUsuario(dni: number | string): Observable<Evento[]> {
    return this.http.get<Evento[]>(`${this.apiURL}/usuarios/${dni}/eventos`)
      .pipe(map(list => (list ?? []).map(this.mapEvento)));
  }

  getDeportistasInscriptos(eventoId: number) {
    return this.http.get<any[]>(`${this.base}/${eventoId}/usuarios`);
  }

  generarQrEvento(id: number) {
    return this.http.post<{ token: string }>(`${this.base}/${id}/qr`, {});
  }

  getQrEventoPng(id: number, transparent = true): Observable<Blob> {
    return this.http.get(`${this.base}/${id}/qr.png`, {
      responseType: 'blob',
      params: { transparent: transparent ? '1' : '0' }
    });
  }

  descargarCertificado(eventoId: number, dni: string): Observable<Blob> {
    return this.http.get(`${this.base}/${eventoId}/certificado`, {
      params: { dni },
      responseType: 'blob'
    });
  }

  public qrPng(eventId: number, bust = false) {
    const t = bust ? `?t=${Date.now()}` : '';
    const headers = new HttpHeaders({ Authorization: `Bearer ${this.authSrv.getToken() || ''}` });
    return this.http.get(`${this.base}/${eventId}/qr.png${t}`, { responseType: 'blob', headers });
  }

  pngUrl(id: number, opts?: { dl?: boolean }) {
    const url = `${this.apiURL}/eventos/${id}/qr.png`;
    return opts?.dl ? `${url}?dl=1` : url;
  }

  downloadQr(id: number) {
    const a = document.createElement('a');
    a.href = this.pngUrl(id, { dl: true });
    a.download = `evento-${id}-qr.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  getQrBlob(id: number) {
    return this.http.get(this.pngUrl(id) + '?dl=1', { responseType: 'blob' });
  }

  csvUrl(id: number, cols?: string[]) {
    const u = new URL(`${this.base}/${id}/inscripciones.csv`);
    if (cols?.length) u.searchParams.set('cols', cols.join(','));
    return u.toString();
  }

  regenerarQr(eventId: number) {
    const headers = new HttpHeaders({ Authorization: `Bearer ${this.authSrv.getToken() || ''}` });
    return this.http.post<{ ok: true; token: string }>(`${this.base}/${eventId}/qr`, {}, { headers });
  }

  public getById(id: number): Observable<EventoLite> {
    return this.http.get<EventoLite>(`${this.base}/${id}`);
  }

  scanAsistencia(token: string, eventoId: number, geo?: { lat: number; lng: number; acc?: number }) {
    const body: any = { token };
    if (geo) {
      body.lat = geo.lat;
      body.lng = geo.lng;
      if (geo.acc != null) body.acc = geo.acc;
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.authSrv.getToken() || ''}`
    });

    return this.http.post<{ created: boolean }>(
      `${this.apiURL}/eventos/${eventoId}/checkin`,
      body,
      { headers }
    );
  }

}






