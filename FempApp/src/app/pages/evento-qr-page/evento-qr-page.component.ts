import { Component, inject, Input, ViewChild } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { BackBarComponent } from '../../shared/back-bar/back-bar.component';
import { EventosService } from '../../services/eventos.service';
import { EventoLite } from '../../interfaces/evento';
import { QrCanvasComponent } from '../../shared/qr/qr-canvas/qr-canvas.component';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-evento-qr-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    QrCanvasComponent,
    BackBarComponent,
    MatIconModule
  ],
  templateUrl: './evento-qr-page.component.html',
  styleUrls: ['./evento-qr-page.component.scss']
})
export class EventoQrPageComponent {

  public evento?: EventoLite;
  public error?: string;
  public payload = '';
  public urlPng = '';
  public evSvc = inject(EventosService);
  public title = 'QR del evento';

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);

  @ViewChild(QrCanvasComponent) qrc?: QrCanvasComponent;
  @Input() backLink?: string | any[];

  constructor() { }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.evSvc.getById(id).subscribe({
      next: (ev) => {
        this.evento = ev;
        this.payload = `FEMPAPP://checkin?e=${ev.id}&t=${encodeURIComponent(ev.qrEventCode || '')}`;
        this.urlPng = this.evSvc.pngUrl(ev.id);
      }
    });
  }

  copiar() {
    const link = `${location.origin}/admin/eventos/${this.evento?.id}/qr`;
    navigator.clipboard.writeText(link).catch(() => { });
  }

  descargar() {
    window.open(this.urlPng + `?t=${Date.now()}`, '_blank');
    const data = this.qrc?.toDataURL();
    if (!data) return;
    const a = document.createElement('a');
    a.href = data;
    a.download = `evento-${this.evento!.id}-qr.png`;
    a.click();
  }

  async descargarPng() {
  const id = this.evento?.id;
  if (!id) return;

  const blob = await firstValueFrom(this.evSvc.getQrBlob(id));
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `qr-evento-${id}.png`;
  a.click();
  URL.revokeObjectURL(url);
}

  async compartir() {
    const data = this.qrc?.toDataURL();
    if (!data || !this.evento) return;

    const blob = await (await fetch(data)).blob();
    const file = new File([blob], `evento-${this.evento.id}-qr.png`, { type: 'image/png' });

    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: 'QR del evento',
        text: `Escaneá para check-in del evento ${this.evento.titulo || this.evento.nombre || this.evento.id}.`
      });
    } else {
      await navigator.clipboard.writeText(this.payload);
      alert('No se puede compartir como archivo en este dispositivo; copié el link del QR al portapapeles.');
    }
  }

  goBack() {
    this.location.back();
  }

}
