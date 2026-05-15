import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { BackBarComponent } from '../../shared/back-bar/back-bar.component';
import { BrowserMultiFormatReader, Result } from '@zxing/library';
import { EventosService } from '../../services/eventos.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Location as NgLocation } from '@angular/common'; //
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-scan-event',
  standalone: true,
  imports: [CommonModule, BackBarComponent, MatButtonModule],
  templateUrl: './scan-event.component.html',
  styleUrls: ['./scan-event.component.scss']
})
export class ScanEventComponent implements OnInit, OnDestroy {

  private location = inject(NgLocation);
  private router = inject(Router);
  private eventos = inject(EventosService);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  private reader = new BrowserMultiFormatReader();
  private stream?: MediaStream;


  public eventoId: number = 0;
  public msg = '';

  ngOnInit(): void {

    this.route.queryParamMap.subscribe(params => {
      const raw = params.get('eventoId');
      this.eventoId = raw ? Number(raw) : 0;
      console.log('eventoId recibido en scanner:', this.eventoId);
    });
    this.start();
  }
  
  ngOnDestroy() { this.stop(); }

  async start() {
    try {
      this.stop();
      const devices = await this.reader.listVideoInputDevices();
      const back = devices.find(d => /back|rear|environment/i.test(d.label)) ?? devices[0];
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: back?.deviceId ? { exact: back.deviceId } : undefined, facingMode: 'environment' }
      });

      const video = document.querySelector('video') as HTMLVideoElement;
      video.srcObject = this.stream;

      this.reader.decodeFromVideoDevice(back?.deviceId ?? null, video, async (res: Result | undefined) => {
        if (!res) return;
        const token = res.getText();
        this.msg = 'Registrando asistencia…';
        this.reader.reset();
        try {
          const id = this.eventoId ?? 0; // o navega si no hay id
          await firstValueFrom(this.eventos.scanAsistencia(token, id));
          this.msg = '¡Asistencia registrada!';
        } catch {
          this.msg = 'QR inválido o evento inactivo';
        } finally {
          setTimeout(() => { this.msg = ''; this.start(); }, 1200);
        }
      });
    } catch {
      this.msg = 'No se pudo abrir la cámara';
    }
  }

  stop() {
    this.reader.reset();
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = undefined;
  }

  onBack(): void {
    if ((window.history?.length || 0) > 1) {
      this.location.back();
    } else {

      this.router.navigate(['/dashboard-deport']);
    }
  }


}
