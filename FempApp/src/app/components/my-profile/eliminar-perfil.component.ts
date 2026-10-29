import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
@Component({standalone:true, imports:[MatDialogModule,MatButtonModule],
 template:`<div class="confirmacion"><h2 mat-dialog-title>¿Eliminamos este perfil?</h2>
 <mat-dialog-content><p><strong>{{data?.disciplina}}</strong> · {{data?.categoria}}</p>
 <p>Se quitará de tus perfiles deportivos. Si tiene inscripciones asociadas, lo conservaremos para mantener tu historial.</p></mat-dialog-content>
 <mat-dialog-actions align="end"><button mat-button [mat-dialog-close]="false">Conservar perfil</button><button mat-flat-button class="eliminar" [mat-dialog-close]="true">Eliminar perfil</button></mat-dialog-actions></div>`,
 styles:[`.confirmacion{background:#f4f8ff;color:#17395f;padding:12px;border-top:5px solid #1565c0}p{line-height:1.6}mat-dialog-actions{gap:8px}button{border-radius:24px;background:#e3edfc;color:#17395f}button.eliminar{background:#a3294a;color:white}`]})
export class EliminarPerfilComponent {data=inject(MAT_DIALOG_DATA);}
