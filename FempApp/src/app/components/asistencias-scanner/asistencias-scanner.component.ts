import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { BarcodeFormat } from '@zxing/library';
import { EventosService } from '../../services/eventos.service';
import { EventoLite } from '../../interfaces/evento';
import { MatIconModule } from '@angular/material/icon';
import { AudioService } from '../../services/audio.service';
import { AsistenciasListService } from '../../services/asistencias-list.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-asistencias-scanner',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    ZXingScannerModule,
    MatSnackBarModule,
    FormsModule,
    MatSlideToggleModule,
  ],
  templateUrl: './asistencias-scanner.component.html',
  styleUrls: ['./asistencias-scanner.component.scss']
})
export class AsistenciasScannerComponent implements OnInit {

  private ev = inject(EventosService);
  private snack = inject(MatSnackBar);
  private audioSrvc = inject(AudioService);
  private asistSrv = inject(AsistenciasListService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // sonidos
  private okAudio = new Audio('assets/sounds/success-sound.mp3');
  private errAudio = new Audio('assets/sounds/error-fail.mp3');
  private scanAudio = new Audio('assets/sounds/scanner-beep.mp3');

  mute = false;
  eventos: EventoLite[] = [];
  eventoId: number | null = null;

  devices: MediaDeviceInfo[] = [];
  currentDevice?: MediaDeviceInfo;
  allowedFormats: BarcodeFormat[] = [BarcodeFormat.QR_CODE];

  busy = false;
  lastRaw = '';
  lastAt = 0;

  history: { ok: boolean; msg: string; raw?: string; time: Date }[] = [];

  ngOnInit(): void {
    // tomar eventoId desde la URL (nuevo nombre o el viejo eventold)
    this.route.queryParamMap.subscribe(q => {
      const fromUrl = Number(q.get('eventoId') || q.get('eventold'));
      if (fromUrl) {
        this.eventoId = fromUrl;
      }
    });

    this.ev.getEventos().subscribe({
      next: (list) => {
        this.eventos = (list ?? []).map(e => ({
          id: e.id!,
          nombre: e.nombre,
          titulo: e.titulo ?? e.nombre ?? `Evento #${e.id}`,
          qrEventCode: e.qrEventCode
        }));
        // si vino eventoId en la URL pero no existe en la lista, lo dejamos en null
        if (this.eventoId && !this.eventos.some(ev => ev.id === this.eventoId)) {
          this.eventoId = null;
        }
      },
      error: () => this.eventos = []
    });

    [this.scanAudio, this.okAudio, this.errAudio].forEach(a => {
      a.volume = 0.6;
      a.load();
    });
  }

  onCamerasFound(devs: MediaDeviceInfo[]) {
    this.devices = devs;
    console.log('Cámaras encontradas:', devs);
    if (!this.currentDevice && devs.length) {
      this.currentDevice = devs[0];
    }
  }

  switchCamera() {
    if (this.devices.length < 2) return;
    const i = this.devices.findIndex(d => d.deviceId === this.currentDevice?.deviceId);
    const next = (i + 1) % this.devices.length;
    this.currentDevice = this.devices[next];
  }

  onScanSuccess(raw: string) {
    try {
      let token = raw;
      let eid = this.eventoId!;

      // payload tipo FEMPAPP://checkin?e=<id>&t=<qrEventCode>
      if (/^fempapp:\/\/checkin/i.test(raw)) {
        const u = new URL(raw.replace('FEMPAPP://', 'https://'));
        eid = Number(u.searchParams.get('e'));
        token = u.searchParams.get('t') || '';
      }

       console.log('SCAN → eventoId:', eid, 'token:', token);

      if (!eid || !token) {
        this.pushHistory({ ok: false, msg: 'QR inválido o evento no seleccionado', raw });
        this.playErr();
        return;
      }

      this.busy = true;
      this.lastRaw = raw;
      this.lastAt = Date.now();

      navigator.geolocation.getCurrentPosition(
        pos => {
          const { latitude, longitude, accuracy } = pos.coords;
          this.ev.scanAsistencia(token, eid, { lat: latitude, lng: longitude, acc: accuracy })
            .subscribe({
              next: () => this.okSnack(),
              error: e => this.errSnack(e),
              complete: () => this.busy = false
            });
        },
        _err => {
          this.ev.scanAsistencia(token, eid)
            .subscribe({
              next: () => this.okSnack(),
              error: e => this.errSnack(e),
              complete: () => this.busy = false
            });
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } catch (e) {
      console.error(e);
      this.playErr();
      this.pushHistory({ ok: false, msg: 'Error leyendo el QR', raw });
    }
  }

  private okSnack() {
    this.openSnack('¡Asistencia registrada!', true);
    this.playOk();
    this.pushHistory({ ok: true, msg: 'Asistencia registrada' });

     setTimeout(() => {
    this.router.navigate(['/dashboard-deport'], { replaceUrl: true });
  }, 600);
  }

  private errSnack(e: any) {
    const s = e?.error?.error || e?.error?.message || e?.message || '';
    const dup = /duplicate entry|ya registrada|ER_DUP_ENTRY/i.test(s);
    const msg = dup ? 'Asistencia ya registrada'
                    : (s || 'No pudimos registrar la asistencia. Acercate a mesa de control.');
    this.openSnack(msg, dup);
    dup ? this.playOk() : this.playErr();
    this.pushHistory({ ok: !dup ? false : true, msg });
  }

  private pushHistory(item: { ok: boolean; msg: string; raw?: string }) {
    this.history.unshift({ ...item, time: new Date() });
    if (this.history.length > 20) this.history.pop();
  }

  private openSnack(msg: string, ok = true) {
    this.snack.open(msg, 'OK', {
      duration: 2500,
      panelClass: ok ? ['snack-ok'] : ['snack-err'],
      horizontalPosition: 'center',
      verticalPosition: 'top',
    });
  }

  private async playOk() {
    if (this.mute) return;
    try {
      await this.scanAudio.play();
      setTimeout(() => this.okAudio.play().catch(() => this.beep(1200, 110)), 80);
    } catch {
      this.beep(880, 90);
      setTimeout(() => this.beep(1200, 90), 80);
    }
    if (navigator.vibrate) navigator.vibrate(50);
  }

  private playErr() {
    if (this.mute) return;
    this.errAudio.play().catch(() => this.beep(320, 180));
    if (navigator.vibrate) navigator.vibrate([30, 40, 30]);
  }

  private beep(freq = 440, durMs = 120) {
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durMs / 1000);

      osc.connect(gain).connect(ctx.destination);
      osc.start();
      setTimeout(() => { osc.stop(); ctx.close(); }, durMs);
    } catch { }
  }
}
