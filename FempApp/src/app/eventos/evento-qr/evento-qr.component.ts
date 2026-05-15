import { Component, inject, Input, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { QrCanvasComponent } from '../../shared/qr/qr-canvas/qr-canvas.component';
import { buildEventPayload } from '../../shared/qr/qr.util';
import { EventosService } from '../../services/eventos.service';
import { ActivatedRoute } from '@angular/router';


type EventoLite = { id: number; titulo?: string; nombre?: string; qrEventCode: string };

@Component({
  selector: 'app-evento-qr',
  standalone: true,
  imports: [CommonModule, MatButtonModule, QrCanvasComponent],
  templateUrl: './evento-qr.component.html'
})

export class EventoQrComponent implements OnInit {

  @Input() size = 256;
  @ViewChild('qrc', { static: false }) qrc?: QrCanvasComponent;

  public history = window.history;
  public urlPng = '';
  public eventoId = 0;
  public evSvc = inject(EventosService);
  public evento: any;
  public payload = '';
  public pngUrl  = '';
  public csvUrl  = '';

  private route = inject(ActivatedRoute);

  ngOnInit(): void {

     const id = Number(this.route.snapshot.paramMap.get('id'));
  this.eventoId = id;

  this.evSvc.getById(id).subscribe(ev => {
    this.evento = ev;
    this.pngUrl = this.evSvc.pngUrl(id);          // -> http://localhost:3000/eventos/:id/qr.png
    this.csvUrl = this.evSvc.csvUrl(id);          // -> http://localhost:3000/eventos/:id/inscripciones.csv
  });
  }



   copiar() {
    const link = `${location.origin}/admin/eventos/${this.eventoId}/qr`;
    navigator.clipboard.writeText(link).catch(() => {});
  }

   renovar() {
    this.evSvc.regenerarQr(this.eventoId).subscribe(() => {
      // bust cache
      this.urlPng = this.evSvc.pngUrl(this.eventoId) + `?t=${Date.now()}`;
    });
  }

  descargar(){
    const data = this.qrc?.toDataURL();
    if (!data) return;
    const a = document.createElement('a');
    a.href = data;
    a.download = `evento-${this.evento.id}-qr.png`;
    a.click();
  }
}
