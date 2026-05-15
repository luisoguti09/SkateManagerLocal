import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-back-bar',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './back-bar.component.html',
  styleUrls: ['./back-bar.component.scss']
})
export class BackBarComponent {

  @Input() title = '';
  @Input() showBack = true;
  @Input() backLink?: string | any[];

  @Output() back = new EventEmitter<void>();

  private router = inject(Router);
  private location = inject(Location);

  constructor() { }

  goBack() {
    
    this.back.emit();
   
    if (this.backLink) {
      Array.isArray(this.backLink)
        ? this.router.navigate(this.backLink)
        : this.router.navigateByUrl(this.backLink);
    } else {
      this.location.back();
    }
  }

}

