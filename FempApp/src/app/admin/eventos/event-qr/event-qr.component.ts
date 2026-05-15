import { Component, inject, Input, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router } from '@angular/router';
import { EventosService } from '../../../services/eventos.service';
import { MatIconModule } from '@angular/material/icon';
import { EventoLite } from '../../../interfaces/evento';
import { BackBarComponent } from '../../../shared/back-bar/back-bar.component';
import { QrCanvasComponent } from '../../../shared/qr/qr-canvas/qr-canvas.component';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    BackBarComponent,
    QrCanvasComponent
  ],
  templateUrl: './event-qr.component.html'
})
export class EventQrComponent implements OnInit {

  @Input() backLink?: string | any[];

  public evento?: EventoLite;
  public payload: string = '';
  public urlPng: string = '';
  public csvHref: string = '';
  public evSvc = inject(EventosService);
  public title = 'QR del evento';

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);

  ngOnInit(): void {
  const id = Number(this.route.snapshot.paramMap.get('id'));
  if (!id) return;

  this.evSvc.getById(id).subscribe({
    next: (ev) => {
      this.evento = ev;

      if (!ev.qrEventCode) {
        this.evSvc.regenerarQr(ev.id).subscribe(r => {
          this.evento!.qrEventCode = r.token;
          this.setPayloadAndPng(this.evento!.id, r.token);
        });
      } else {
        this.setPayloadAndPng(ev.id, ev.qrEventCode);
      }
    }
  });
}

private setPayloadAndPng(id: number, token: string) {
  this.payload = `FEMPAPP://checkin?e=${id}&t=${encodeURIComponent(token)}`;
  this.urlPng  = this.evSvc.pngUrl(id);
}

  renovar() {
    if (!this.evento) return;
    this.evSvc.regenerarQr(this.evento.id).subscribe(r => {
      this.evento!.qrEventCode = r.token;
      this.setPayloadAndPng(this.evento!.id, r.token);
    });
  }

  copiar() {
    const link = `${location.origin}/admin/eventos/${this.evento?.id}/qr`;
    navigator.clipboard.writeText(link).catch(() => { });
  }

  descargar() {
    const a = document.createElement('a');
    a.href = this.urlPng;
    a.download = `evento-${this.evento?.id}.png`;
    a.click();
  }
  goBack() {
    this.location.back();
  }

}
