import { Injectable } from '@angular/core';

export interface OsmSearchResult {
  display_name: string;
  lat: string;
  lon: string;
  osm_id: number;
}

@Injectable({ providedIn: 'root' })
export class OsmService {
  private base = 'https://nominatim.openstreetmap.org';

  
  private ident = { email: 'luisoguti09@gmail.com' }; 

  async search(q: string): Promise<OsmSearchResult[]> {
    const url = new URL(this.base + '/search');
    url.search = new URLSearchParams({
      q,
      format: 'json',
      addressdetails: '0',
      limit: '7',
      ...this.ident
    }).toString();
    const res = await fetch(url.toString(), { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return [];
    return await res.json();
  }

  async reverse(lat: number, lon: number): Promise<string> {
    const url = new URL(this.base + '/reverse');
    url.search = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      format: 'json',
      zoom: '18',
      ...this.ident
    }).toString();
    const res = await fetch(url.toString(), { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return '';
    const j = await res.json();
    return j?.display_name ?? '';
  }
}
