/// <reference types="google.maps" />
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

declare global {
  interface Window { google?: typeof google; }
}

@Injectable({ providedIn: 'root' })
export class GmapsLoaderService {
  private loading?: Promise<typeof google>;

  load(): Promise<typeof google> {
    if (window.google?.maps) return Promise.resolve(window.google);
    if (this.loading) return this.loading;

    const key = environment.googleMapsApiKey; 
    this.loading = new Promise((resolve, reject) => {
      const cb = 'initGMaps_' + Date.now();
      (window as any)[cb] = () => resolve(window.google!);

      const s = document.createElement('script');
      s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&v=weekly&callback=${cb}`;
      s.async = true;
      s.onerror = () => reject(new Error('No se pudo cargar Google Maps'));
      document.head.appendChild(s);
    });

    return this.loading;
  }
}
