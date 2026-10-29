import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Subject, Subscription, finalize, takeUntil } from 'rxjs';
import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
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
export class AsistenciasScannerComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private disposed = false;
  completado = false;
  confirmacion = "";

  private ev = inject(EventosService);
  private http = inject(HttpClient);
  private cd = inject(ChangeDetectorRef);
  private consulta?: Subscription;
  autorizado = false;
  verificando = false;
  motivo = '';
  nombreEvento = '';
  errorCamara = '';

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
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe(q => {
      this.consulta?.unsubscribe();
      const id = Number(q.get('eventoId'));
      this.eventoId = Number.isSafeInteger(id) && id > 0 ? id : null;
      this.verificarHabilitacion();
    });

    [this.scanAudio, this.okAudio, this.errAudio].forEach(a => {
      a.volume = 0.6;
      a.load();
    });
  }

  verificarHabilitacion(): void {
    this.consulta?.unsubscribe();
    this.autorizado = false;
    this.completado = false;
    this.nombreEvento = '';
    this.errorCamara = '';
    this.devices = [];
    this.currentDevice = undefined;
    this.motivo = '';
    if (!this.eventoId) {
      this.verificando = false;
      this.motivo = 'Abrí el registro de asistencia desde el evento en el que vas a participar.';
      this.cd.markForCheck();
      return;
    }
    this.verificando = true;
    this.consulta = this.http.get<any>(`${environment.SERVER_API}/eventos/${this.eventoId}/circuito`).pipe(takeUntil(this.destroy$)).subscribe({
      next: data => {
        this.nombreEvento = data.evento?.titulo || data.evento?.nombre || 'Evento';
        this.autorizado = data.asistenciaDisponible === true;
        this.motivo = this.autorizado ? '' : (data.motivoAsistencia || 'Tu asistencia todavía no está habilitada. Revisá tu inscripción y el pago.');
        this.verificando = false;
        this.cd.markForCheck();
      },
      error: () => {
        this.verificando = false;
        this.motivo = 'No pudimos verificar tu inscripción. Volvé a intentar.';
        this.cd.markForCheck();
      }
    });
  }

  falloCamara(): void {
    this.errorCamara = 'No pudimos abrir la cámara. Revisá el permiso del navegador y volvé a intentar.';
    this.cd.markForCheck();
  }

  onCamerasFound(devs: MediaDeviceInfo[]) {
    this.devices = devs;
    if (!this.currentDevice && devs.length) {
      this.currentDevice = devs.find(d => /back|rear|trasera|environment/i.test(d.label)) || devs[0];
    }
  }

  switchCamera() {
    if (this.devices.length < 2) return;
    const i = this.devices.findIndex(d => d.deviceId === this.currentDevice?.deviceId);
    const next = (i + 1) % this.devices.length;
    this.currentDevice = this.devices[next];
  }

  onScanSuccess(raw: string) {
    if(!this.autorizado || !this.eventoId || this.disposed || this.busy || this.completado || (raw===this.lastRaw && Date.now()-this.lastAt<2500))return;
    this.lastRaw=raw;this.lastAt=Date.now();
    try {
      const url=new URL(raw);
      const eid=Number(url.searchParams.get('e'));
      const token=url.searchParams.get('t') || '';
      if(url.protocol.toLowerCase()!=='fempapp:' || url.hostname.toLowerCase()!=='checkin' || !Number.isSafeInteger(eid) || eid<=0 || !token){
        throw new Error('Escaneá el QR del evento. El QR personal no registra tu asistencia en esta pantalla.');
      }
      if(this.eventoId!==eid)throw new Error('Este QR corresponde a otro evento. Revisá el evento seleccionado.');
      this.busy=true;
      const enviar=(geo?:{lat:number;lng:number;acc?:number})=>{
        if(this.disposed || this.eventoId!==eid || !this.autorizado)return;
        this.ev.scanAsistencia(token,eid,geo).pipe(takeUntil(this.destroy$),finalize(()=>{this.busy=false;if(!this.disposed)this.cd.markForCheck();})).subscribe({
          next:r=>this.okSnack(r.created),error:e=>this.errSnack(e)
        });
      };
      if(!navigator.geolocation){enviar();return;}
      navigator.geolocation.getCurrentPosition(pos=>enviar({lat:pos.coords.latitude,lng:pos.coords.longitude,acc:pos.coords.accuracy}),()=>enviar(),{enableHighAccuracy:true,timeout:8000});
    } catch(e) {
      this.busy=false;
      this.openSnack(e instanceof TypeError?'No reconocimos el QR. Escaneá el código del evento.':(e as Error).message,false);
      this.playErr();
    }
  }

  private okSnack(created:boolean) {
    this.completado=true;
    const titulo=this.nombreEvento || 'este evento';
    this.confirmacion=created?`Tu asistencia a ${titulo} quedó registrada.`:`Tu asistencia a ${titulo} ya estaba registrada. No se agregó otra.`;
    this.openSnack(this.confirmacion,true);this.playOk();
    this.pushHistory({ok:true,msg:this.confirmacion});
  }
  volver(){this.autorizado=false;void this.router.navigate(this.eventoId ? ['/evento-detail', this.eventoId] : ['/dashboard-deport']);}
  ngOnDestroy(){this.disposed=true;this.consulta?.unsubscribe();this.destroy$.next();this.destroy$.complete();[this.scanAudio,this.okAudio,this.errAudio].forEach(a=>a.pause());}

  private errSnack(e: any) {
    if (e?.status === 401 || e?.status === 403) {
      this.autorizado = false;
      this.motivo = e?.error?.error || 'Tu asistencia ya no está habilitada. Revisá tu inscripción.';
    }
    const s = e?.error?.error || e?.error?.message || e?.message || '';
    const dup = /duplicate entry|ya registrada|ER_DUP_ENTRY/i.test(s);
    const msg = dup ? 'Asistencia ya registrada'
                    : (s || 'No pudimos registrar la asistencia. Acercate a mesa de control.');
    this.openSnack(msg, dup);
    dup ? this.playOk() : this.playErr();
    this.pushHistory({ ok: !dup ? false : true, msg });
  }

  private pushHistory(item: { ok: boolean; msg: string; raw?: string }) {
    this.cd.markForCheck();
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
