import { Subscription } from 'rxjs';
import { Component, Input, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
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

  private _userId?: number;
  private iniciado = false;
  private peticion?: Subscription;
  private cd = inject(ChangeDetectorRef);
  @Input() set userId(value: number | undefined) {
    if (value === this._userId) return;
    this._userId = value;
    if (this.iniciado) this.reintentar();
  }
  get userId() { return this._userId; }

  private auth = inject(AuthService);
  private qr = inject(QrService);
  private sanitizer = inject(DomSanitizer);



  public qrUrl?: SafeUrl;
  private objectUrl?: string;
  public loading = false;
  public error: string | null = null;

  ngOnInit(): void { this.iniciado = true; this.reintentar(); }

  ngOnDestroy(): void {
    this.peticion?.unsubscribe();
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
  }

  reintentar(): void {
    this.peticion?.unsubscribe();
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = undefined;
    this.qrUrl = undefined;
    this.error = null;
    const id = this.userId ?? this.auth.getUsuario()?.id;
    if (!id) {
      this.loading = false;
      this.error = 'No pudimos identificar tu cuenta. Volvé a ingresar.';
      this.cd.markForCheck();
      return;
    }
    this.loading = true;
    this.peticion = this.qr.getPng(id, true).subscribe({
      next: blob => {
        this.objectUrl = URL.createObjectURL(blob);
        this.qrUrl = this.sanitizer.bypassSecurityTrustUrl(this.objectUrl);
        this.loading = false;
        this.cd.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.error = 'No pudimos cargar tu QR. Probá nuevamente.';
        this.cd.markForCheck();
      }
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