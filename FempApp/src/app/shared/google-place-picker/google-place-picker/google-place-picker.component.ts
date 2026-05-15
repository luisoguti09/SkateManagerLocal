/// <reference types="google.maps" />
import {
  AfterViewInit, Component, ElementRef, EventEmitter, inject, Input, OnDestroy, Output, ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { GmapsLoaderService } from '../../../services/gmaps-loader.service';

export interface PlaceOut {
  lat: number;
  lng: number;
  address: string;
  placeId?: string;
}

@Component({
  selector: 'app-google-place-picker',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './google-place-picker.component.html',
  styleUrls: ['./google-place-picker.component.scss'],
})
export class GooglePlacePickerComponent implements AfterViewInit, OnDestroy {

  @Input() center: google.maps.LatLngLiteral | null = null;
  @Output() placeChange = new EventEmitter<PlaceOut>();

  @ViewChild('gmap',   { static: true }) gmapRef!:   ElementRef<HTMLDivElement>;
  @ViewChild('search', { static: true }) searchRef!: ElementRef<HTMLInputElement>;

  public selectedAddress = '';

  private map?: google.maps.Map;
  private marker?: google.maps.Marker;                       
  private autocomplete?: google.maps.places.Autocomplete;
  private placeListener?: google.maps.MapsEventListener;

  private loader = inject(GmapsLoaderService);

  async ngAfterViewInit() {
    await this.loader.load();                                
    const initial = this.center ?? { lat: -34.6037, lng: -58.3816 };

    this.map = new google.maps.Map(this.gmapRef.nativeElement, {
      center: initial,
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    this.marker = new google.maps.Marker({ map: this.map, position: initial });

    this.autocomplete = new google.maps.places.Autocomplete(this.searchRef.nativeElement, {
      fields: ['geometry', 'formatted_address', 'place_id'],
    });

    this.placeListener = this.autocomplete.addListener('place_changed', () => {
      const p   = this.autocomplete!.getPlace();
      const loc = p.geometry?.location;
      if (!loc) return;

      const lat = loc.lat();
      const lng = loc.lng();

      this.map!.panTo({ lat, lng });
      this.marker!.setPosition({ lat, lng });

      this.selectedAddress = p.formatted_address ?? '';
      this.placeChange.emit({ lat, lng, address: this.selectedAddress, placeId: p.place_id ?? undefined });
    });
  }

  useMyLocation() {
    navigator.geolocation?.getCurrentPosition((pos) => {
      const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      this.map?.panTo(c);
      this.marker?.setPosition(c);
      this.placeChange.emit({ ...c, address: 'Mi ubicación' });
    });
  }

  ngOnDestroy() {
    this.placeListener?.remove();
  }
}
