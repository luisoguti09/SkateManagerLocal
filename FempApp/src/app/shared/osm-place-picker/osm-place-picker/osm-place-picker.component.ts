import { AfterViewInit, Component, ElementRef, EventEmitter, inject, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { OsmService } from '../../../services/osm.service';

export interface PlaceOut {
  lat: number;
  lng: number;
  address: string;
  placeId?: string;   
  provider?: 'osm';   
}

@Component({
  selector: 'app-osm-place-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './osm-place-picker.component.html',
  styleUrls: ['./osm-place-picker.component.scss']
})
export class OsmPlacePickerComponent implements AfterViewInit, OnDestroy {

  @Input() center: { lat: number, lng: number } | null = null;
  @Output() placeChange = new EventEmitter<PlaceOut>();

  @ViewChild('mapEl', { static: true }) mapEl!: ElementRef<HTMLDivElement>;
  @ViewChild('q', { static: true }) qEl!: ElementRef<HTMLInputElement>;

  suggestions: { title: string; lat: number; lng: number; id: string }[] = [];

  private map?: L.Map;
  private marker?: L.Marker;
  private osm = inject(OsmService);

  constructor() {}

  ngAfterViewInit(): void {
    // Fix de íconos en Angular (carga desde CDN para no mover assets)
    (L.Icon.Default.prototype as any)._getIconUrl = function (name: string) {
      const urls: any = {
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      };
      return urls[name];
    };

    const c = this.center ?? { lat: -34.6037, lng: -58.3816 }; // CABA por defecto

    this.map = L.map(this.mapEl.nativeElement, {
      zoomControl: true,
      attributionControl: true
    }).setView([c.lat, c.lng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(this.map);

    this.marker = L.marker([c.lat, c.lng], { draggable: true }).addTo(this.map);

    this.marker.on('moveend', async (e: any) => {
      const { lat, lng } = e.target.getLatLng();
      const address = await this.osm.reverse(lat, lng);
      this.placeChange.emit({ lat, lng, address, provider: 'osm' });
    });
  }

  async onInput(): Promise<void> {
    const q = this.qEl.nativeElement.value.trim();
    if (!q) { this.suggestions = []; return; }
    const res = await this.osm.search(q);
    this.suggestions = res.map(r => ({
      title: r.display_name,
      lat: Number(r.lat),
      lng: Number(r.lon),
      id: String(r.osm_id),
    }));
  }

  async pick(s: { title: string; lat: number; lng: number; id: string }) {
    this.suggestions = [];
    this.qEl.nativeElement.value = s.title;
    this.map?.panTo([s.lat, s.lng]);
    this.marker?.setLatLng([s.lat, s.lng]);
    this.placeChange.emit({ lat: s.lat, lng: s.lng, address: s.title, placeId: s.id, provider: 'osm' });
  }

  useMyLocation(): void {
    navigator.geolocation?.getCurrentPosition(async pos => {
      const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      this.map?.panTo([c.lat, c.lng]);
      this.marker?.setLatLng([c.lat, c.lng]);
      const addr = await this.osm.reverse(c.lat, c.lng);
      this.qEl.nativeElement.value = addr || 'Mi ubicación';
      this.placeChange.emit({ lat: c.lat, lng: c.lng, address: addr || 'Mi ubicación', provider: 'osm' });
    });
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }
}
