import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { UsuariosService } from '../../../services/usuarios.service';

@Component({
  standalone: true,
  selector: 'app-qr-viewer',
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './qr-viewer.component.html',
  styleUrls: ['./qr-viewer.component.scss']
})
export class QrViewerComponent implements OnDestroy {

  private api = inject(UsuariosService);
  private sanitizer = inject(DomSanitizer);
  private objectUrl?: string;


  public uid?: number | string;
  public imgUrl?: SafeUrl;

  
  generar(){ 
    const id = Number(this.uid); if (!id) 
      return;
    this.api.generar(id).subscribe(() => this.ver());
  }

  ver(){ 
    const id = Number(this.uid); if (!id)
       return;
    this.api.getQrPng(id, true).subscribe(blob => {
      if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = URL.createObjectURL(blob);
      this.imgUrl = this.sanitizer.bypassSecurityTrustUrl(this.objectUrl);
    });
  }

  ngOnDestroy(){ 
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl); 
  }
  
}
