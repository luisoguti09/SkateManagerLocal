import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';
interface Tarifario {
  id: number;
  individual1: string | number;
  individual2: string | number;
  individual3: string | number;
  pareja: string | number;
  conjunto: string | number;
  createdAt: string;
}
type Campo = 'individual1' | 'individual2' | 'individual3' | 'pareja' | 'conjunto';
@Component({
  selector: 'app-tarifario-general', standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tarifario-general.component.html',
  styleUrls: ['./tarifario-general.component.scss'],
})
export class TarifarioGeneralComponent implements OnInit {
  @Input() editar = false;
  private auth = inject(AuthService);
  private http = inject(HttpClient);
  actual: Tarifario | null = null;
  historial: Tarifario[] = [];
  cargando = false;
  guardando = false;
  listo = false;
  error = '';
  mensaje = '';
  formulario: Record<Campo, string | number> = { individual1: '', individual2: '', individual3: '', pareja: '', conjunto: '' };
  campos: { clave: Campo; nombre: string }[] = [
    { clave: 'individual1', nombre: '1 participación individual' },
    { clave: 'individual2', nombre: '2 participaciones individuales' },
    { clave: 'individual3', nombre: '3 participaciones individuales' },
    { clave: 'pareja', nombre: 'Cada participación en pareja, por deportista' },
    { clave: 'conjunto', nombre: 'Cada Show / Cuarteto / Sincro, por deportista' },
  ];
  get puedeEditar() { return this.editar && this.auth.getRolNombre() === 'tesoreria'; }
  get options() { return { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken() || ''}` }) }; }
  ngOnInit() { void this.cargar(); }
  async cargar() {
    this.cargando = true; this.listo = false; this.error = '';
    try {
      const r = await firstValueFrom(this.http.get<{ actual: Tarifario | null; historial: Tarifario[] }>(`${environment.SERVER_API}/precios-participacion/general`, this.options));
      this.actual = r.actual; this.historial = r.historial;
      for (const c of this.campos) this.formulario[c.clave] = r.actual?.[c.clave] ?? '';
      this.listo = true;
    } catch (e: any) { this.error = e.error?.error || 'No se pudo cargar el tarifario general.'; }
    finally { this.cargando = false; }
  }
  completarComunicado() {
    this.formulario = { individual1: 55000, individual2: 65000, individual3: 70000, pareja: 35000, conjunto: 30000 };
    this.mensaje = 'Valores del comunicado 36/26 cargados en el formulario. Revisalos y publicá para aplicarlos.';
  }
  async guardar() {
    if (!this.puedeEditar || !this.listo || this.guardando) return;
    if (!window.confirm('¿Publicar estos aranceles generales? Se usarán en las próximas confirmaciones de nómina. Los cargos existentes conservarán sus importes.')) return;
    this.guardando = true; this.error = ''; this.mensaje = '';
    try {
      await firstValueFrom(this.http.post(`${environment.SERVER_API}/precios-participacion/general`, { ...this.formulario, versionActual: this.actual?.id ?? null }, this.options));
      this.mensaje = 'Tarifario publicado. Los cargos ya confirmados no se modificaron.';
      await this.cargar();
    } catch (e: any) {
      this.error = e.error?.error || 'No se pudo publicar el tarifario.';
      if (e.status === 409) this.listo = false;
    } finally { this.guardando = false; }
  }
}
