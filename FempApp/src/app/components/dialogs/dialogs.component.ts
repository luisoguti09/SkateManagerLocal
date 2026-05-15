import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dialogs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dialogs.component.html',
  styleUrl: './dialogs.component.scss',
})
export class DialogsComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { success: boolean }) {}
}
