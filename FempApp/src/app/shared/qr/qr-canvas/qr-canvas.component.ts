import { Component, ElementRef, Input, ViewChild, AfterViewInit, OnChanges } from '@angular/core';
import QRCode from 'qrcode';

@Component({
  selector: 'app-qr-canvas',
  standalone: true,
  template: `<canvas #qrc [attr.width]="size" [attr.height]="size" class="qr-canvas"></canvas>`,
  styles: [`.qr-canvas{ image-rendering: pixelated; }`]
})
export class QrCanvasComponent implements AfterViewInit, OnChanges {
  @Input() text = '';
  @Input() size = 256;
  @ViewChild('qrc', { static: true }) qrc!: ElementRef<HTMLCanvasElement>;

  ngAfterViewInit(){ this.draw(); }
  ngOnChanges(){ if (this.qrc) this.draw(); }

  private async draw(){
    if (!this.text) return;
    await QRCode.toCanvas(this.qrc.nativeElement, this.text, { width: this.size, margin: 1 });
  }

  toDataURL(): string | undefined {
    return this.qrc?.nativeElement?.toDataURL('image/png');
  }
}
// ejemplo de uso: <app-qr-canvas [text]="payload" [size]="256"></app-qr-canvas>