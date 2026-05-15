import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { BackBarComponent } from '../../../shared/back-bar/back-bar.component';
import { EventosService } from '../../../services/eventos.service';
import { firstValueFrom } from 'rxjs';
import { NuevoEventoDto, EditEventoDto } from '../../../interfaces/evento-dto';
import { Evento } from '../../../interfaces/evento';
import { MatCardModule } from '@angular/material/card';
import { OsmPlacePickerComponent, PlaceOut } from '../../../shared/osm-place-picker/osm-place-picker/osm-place-picker.component';


@Component({
  selector: 'app-event-editor',
  standalone: true,
  templateUrl: './event-editor.component.html',
  styleUrls: ['./event-editor.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    BackBarComponent,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    OsmPlacePickerComponent

  ]
})
export class EventEditorComponent implements OnInit {

  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  public eventServ = inject(EventosService);
  public id?: number;
  public loading = false;
  public pngUrl?: string;
  public eventoId: number | null = null;

  form = this.fb.group({
    titulo: ['', Validators.required],
    descripcion: [''],
    fechaInicio: [null as Date | null],
    fechaFin: [null as Date | null],
    lugar: [''],
    address: [''],
    lat: [null as number | null],
    lng: [null as number | null],
    placeId: [null as string | null],
    nivel: [''],
    inscripcionRequierePago: [false],
    precio: [null as number | null],
    permiteEfectivo: [false],
    certificadoAuto: [false],
  });

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isNaN(id)) {
      this.id = id;

      const evento: Evento = await firstValueFrom(
        this.eventServ.getEventoById(id)
      );

      this.form.patchValue({
        titulo: evento.titulo ?? '',
        descripcion: evento.descripcion ?? '',
        fechaInicio: evento.fechaInicio ? new Date(evento.fechaInicio) : null,
        fechaFin: evento.fechaFin ? new Date(evento.fechaFin) : null,
        lugar: evento.lugar ?? '',
        address: evento.address ?? '',
        lat: evento.lat ?? null,
        lng: evento.lng ?? null,
        placeId: evento.placeId ?? null,
        nivel: evento.nivel ?? '',
        inscripcionRequierePago: !!evento.inscripcionRequierePago,
        precio: evento.precio ?? null,
        permiteEfectivo: !!evento.permiteEfectivo,
        certificadoAuto: !!evento.certificadoAuto,
      });

    }
    this.eventoId = Number(this.route.snapshot.paramMap.get('id')) || null;
  }

  async save() {
    if (this.form.invalid) return;
    this.loading = true;

    try {
      const f = this.form.getRawValue();

      if (this.id) {
        // Editar
        const f = this.form.getRawValue();
        const titulo = f.titulo?.trim();
        const dto: EditEventoDto = {
          titulo: titulo ?? undefined,
          descripcion: f.descripcion ?? undefined,
          fechaInicio: f.fechaInicio ?? undefined,
          fechaFin: f.fechaFin ?? undefined,
          lugar: f.lugar ?? undefined,
          address: f.address ?? undefined,
          placeId: f.placeId ?? undefined,
          lat: f.lat ?? undefined,
          lng: f.lng ?? undefined,
          nivel: f.nivel ?? undefined,
          inscripcionRequierePago: f.inscripcionRequierePago ?? undefined,
          precio: f.precio ?? undefined,
          permiteEfectivo: f.permiteEfectivo ?? undefined,
          certificadoAuto: f.certificadoAuto ?? undefined,
          nombre: titulo ?? undefined,
        };

        await firstValueFrom(this.eventServ.updateEvento(this.id, dto));
      } else {
        // Crear
        const f = this.form.getRawValue();
        const titulo = (f.titulo?.trim() || 'Evento sin título');
        const dto: NuevoEventoDto = {
          titulo,
          descripcion: f.descripcion ?? undefined,
          fechaInicio: f.fechaInicio ?? null,
          fechaFin: f.fechaFin ?? null,
          lugar: f.lugar ?? undefined,
          address: f.address ?? null,
          placeId: f.placeId ?? null,
          lat: f.lat ?? null,
          lng: f.lng ?? null,
          nivel: f.nivel ?? undefined,
          inscripcionRequierePago: f.inscripcionRequierePago ?? undefined,
          precio: f.precio ?? null,
          permiteEfectivo: f.permiteEfectivo ?? undefined,
          certificadoAuto: f.certificadoAuto ?? undefined,
          nombre: titulo,
          qrEventCode: ''
        };

        await firstValueFrom(this.eventServ.addEvento(dto));
      }

      this.router.navigate(['/admin/eventos']);
    } finally {
      this.loading = false;
    }
  }

  async verPng() {
    const id = this.id;
    if (!id) return;

    const blob = await firstValueFrom(this.eventServ.getQrEventoPng(id));
    if (this.pngUrl) URL.revokeObjectURL(this.pngUrl);
    this.pngUrl = URL.createObjectURL(blob);
  }

  ngOnDestroy() {
    if (this.pngUrl) URL.revokeObjectURL(this.pngUrl);
  }

  onPlace(e: { lat: number; lng: number; address: string; placeId?: string }) {
    this.form.patchValue({
      lat: e.lat,
      lng: e.lng,
      lugar: e.address,
      placeId: e.placeId || ''
    });
  }

  onPlaceChange(p: PlaceOut) {
    this.form.patchValue({
      lugar: p.address || '',
      lat: p.lat,
      lng: p.lng,
      placeId: p.placeId ?? null
    });
  }


}
