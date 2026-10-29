import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
@Component({
  standalone: true, imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `<div class="confirmacion"><h2 mat-dialog-title>{{data.perfiles.length ? '¿Confirmás estos perfiles?' : '¿Confirmás la baja de todas tus participaciones?'}}</h2>
    <mat-dialog-content><ul><li *ngFor="let p of data.perfiles"><strong>{{p.disciplina}}</strong> · {{p.divisional}} · {{p.categoria}}</li></ul>
    <p>{{data.abm ? 'Podés revisar tus participaciones mientras esté abierto el período de ABM (Altas, Bajas y Modificaciones).' : 'Una vez confirmados, podrás modificarlos durante el período de ABM (Altas, Bajas y Modificaciones).'}}</p></mat-dialog-content>
    <mat-dialog-actions align="end"><button mat-button [mat-dialog-close]="false">Volver a revisar</button><button mat-flat-button color="primary" class="confirmar" [mat-dialog-close]="true">Confirmar</button></mat-dialog-actions></div>`,
  styles: [`.confirmacion{background:#f4f8ff;color:#17395f;padding:12px;border-top:5px solid #1565c0}li{margin-bottom:12px}p{line-height:1.6}button{border-radius:24px}.confirmacion .confirmar{background:#1558b2;color:#fff}.confirmacion button:not(.confirmar){background:#e3edfc;color:#17395f}mat-dialog-actions{gap:8px}`]
})
export class ConfirmarPerfilesComponent { data = inject(MAT_DIALOG_DATA); }
