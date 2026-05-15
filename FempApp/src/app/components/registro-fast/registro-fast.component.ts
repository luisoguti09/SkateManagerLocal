import { Component, inject, Input, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, FormControl, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { RegistroService } from '../../services/registro.service';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { RegistroFastService } from '../../services/registro-fast.service';

@Component({
  selector: 'app-registro-fast',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    MatButtonModule,
    RouterOutlet,
    RouterLink,
    MatListModule,
    MatDividerModule
  ],
  templateUrl: './registro-fast.component.html',
  styleUrl: './registro-fast.component.scss'
})
export class RegistroFastComponent {

  @Input("pers") pers: any;

  public formFast!: FormGroup;
  private router = inject(Router);
  private fb = inject(FormBuilder);



}
