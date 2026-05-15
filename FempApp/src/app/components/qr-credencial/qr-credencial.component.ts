import { Component, Input, OnDestroy, inject } from '@angular/core';
import { UsuariosService } from '../../services/usuarios.service';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { QrService } from '../../services/qr.service';

@Component({
  selector: 'app-qr-credencial',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule
  ],
  templateUrl: './qr-credencial.component.html',
  styleUrls: ['./qr-credencial.component.scss']
})

export class QrCredencialComponent implements OnDestroy {

  @Input() userId?: number;

  private auth = inject(AuthService);
  private qr = inject(QrService);
  private sanitizer = inject(DomSanitizer);



  public qrUrl?: SafeUrl;
  private objectUrl?: string;
  public loading = false;
  public error: string | null = null;

  ngOnInit(): void {

    const id = this.userId ?? this.auth.getUsuario()?.id;
    if (id) this.cargar(id, /*bust*/ true);

  }

  ngOnDestroy(): void {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
  }

   private cargar(id: number, bustCache = false): void {
    this.loading = true;
    this.error = null;
    this.qr.getPng(id, bustCache).subscribe({
      next: (blob) => {
        if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
        this.objectUrl = URL.createObjectURL(blob);
        this.qrUrl = this.sanitizer.bypassSecurityTrustUrl(this.objectUrl);
        this.loading = false;
      },
      error: () => { this.loading = false; this.error = 'No se pudo cargar el QR'; }
    });
  }

  renovar(): void {
    const id = this.userId ?? this.auth.getUsuario()?.id;
    if (!id) return;
    this.loading = true;
    this.qr.generar(id).subscribe({
      next: () => this.cargar(id, true),
      error: () => this.cargar(id, true) // fallback
    });
  }

  descargar(): void {
    if (!this.objectUrl) return;
    const a = document.createElement('a');
    a.href = this.objectUrl;
    a.download = 'mi-credencial-qr.png';
    a.click();
  }
}