/*import { Router } from 'express';
//import type { Request, Response } from 'express';

export const osmRouter = Router();

const BASE = 'https://nominatim.openstreetmap.org';
const HEADERS: Record<string, string> = {
  'User-Agent': 'FempApp/1.0 (contacto: luisoguti09@gmail.com)',
  'Accept-Language': 'es',
};

// GET /api/osm/search?q=...
osmRouter.get('/search', async (req: Request, res: Response) => {
  const q = String(req.query.q ?? '').trim();
  if (!q) return res.json([]);

  const params = new URLSearchParams({
    q,
    format: 'json',
    addressdetails: '0',
    limit: '7',
    email: 'luisoguti09@gmail.com',
  });

  try {
    const r = await fetch(`${BASE}/search?${params}`, { headers: HEADERS });
    if (!r.ok) return res.status(r.status).json([]);
    res.json(await r.json());
  } catch {
    res.status(500).json([]);
  }
});

// GET /api/osm/reverse?lat=-32...&lon=-68...
osmRouter.get('/reverse', async (req: Request, res: Response) => {
  const lat = String(req.query.lat ?? '');
  const lon = String(req.query.lon ?? '');
  const params = new URLSearchParams({
    lat, lon,
    format: 'json',
    zoom: '18',
    email: 'luisoguti09@gmail.com',
  });

  try {
    const r = await fetch(`${BASE}/reverse?${params}`, { headers: HEADERS });
    if (!r.ok) return res.status(r.status).json({});
    res.json(await r.json());
  } catch {
    res.status(500).json({});
  }
});
*/