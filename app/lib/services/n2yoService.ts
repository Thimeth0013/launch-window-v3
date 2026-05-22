import axios from 'axios';
import https from 'node:https';
import connectDB from '../db/mongodb';
import SatellitePositions, { ISatelliteSample } from '../db/models/SatellitePositions';

const n2yoHttpsAgent = new https.Agent({ keepAlive: true });

const N2YO_BASE = 'https://api.n2yo.com/rest/v1/satellite';
const SYNC_TTL_MS = 3.5 * 60 * 1000; // Refetch every 3.5 minutes
const WINDOW_DURATION_SEC = 300;     // N2YO max is 300 seconds (5 minutes)
const STALE_TAIL_MS = 60 * 1000;     // Consider stale if window ends in < 1 min
const RETRY_DELAYS_MS = [1000, 2000];

export interface SatelliteConfig {
  id: string; // N2YO uses NORAD IDs
  name: string;
  sampleStride: number;
}

export const SATELLITE_CONFIGS: SatelliteConfig[] = [
  // --- The Originals (Low Earth Orbit) ---
  { id: '25544', name: 'ISS (Zarya)', sampleStride: 5 },
  { id: '20580', name: 'Hubble Space Telescope', sampleStride: 5 },
  { id: '48274', name: 'Tiangong (CSS)', sampleStride: 5 },

  // --- The Polar Sweepers (Earth Observation) ---
  { id: '39084', name: 'Landsat 8 (Imaging)', sampleStride: 5 },
  { id: '33591', name: 'NOAA-19 (Weather)', sampleStride: 5 },
  { id: '25994', name: 'Terra (EOS Flagship)', sampleStride: 5 },

  // --- The Mid-Earth Orbiters (Navigation) ---
  { id: '43873', name: 'GPS III-1 (Vespucci)', sampleStride: 5 },
  { id: '36585', name: 'Galileo FM1 (EU Nav)', sampleStride: 5 },

  // --- The Deep Space Swingers (Highly Elliptical) ---
  { id: '25867', name: 'Chandra X-Ray Observatory', sampleStride: 5 },

  // --- Historic Relics ---
  { id: '324', name: 'Vanguard 1 (Oldest Debris)', sampleStride: 5 },
];

const CONFIG_BY_ID = new Map(SATELLITE_CONFIGS.map((c) => [c.id, c]));

// Mathematical conversion: Geodetic (Lat, Lon, Alt) to ECEF (X, Y, Z)
// Uses the WGS-84 ellipsoid standard
function geodeticToECEF(lat: number, lon: number, altKm: number) {
  const a = 6378.137; // WGS-84 semi-major axis in km
  const eSq = 0.00669437999014; // WGS-84 first eccentricity squared
  
  const latRad = lat * (Math.PI / 180);
  const lonRad = lon * (Math.PI / 180);
  
  const N = a / Math.sqrt(1 - eSq * Math.pow(Math.sin(latRad), 2));
  
  const x = (N + altKm) * Math.cos(latRad) * Math.cos(lonRad);
  const y = (N + altKm) * Math.cos(latRad) * Math.sin(lonRad);
  const z = (N * (1 - eSq) + altKm) * Math.sin(latRad);
  
  return { x, y, z };
}

async function fetchN2yoLocations(id: string) {
  const apiKey = process.env.N2YO_API_KEY;
  if (!apiKey) throw new Error('N2YO_API_KEY environment variable is missing');

  // Observer Lat/Lon/Alt is set to 0/0/0 because we only care about absolute Geodetic coords
  const url = `${N2YO_BASE}/positions/${id}/0/0/0/${WINDOW_DURATION_SEC}/`;
  const response = await axios.get(url, {
    params: { apiKey },
    timeout: 10000,
    httpsAgent: n2yoHttpsAgent,
  });

  if (!response.data || !response.data.positions) {
    throw new Error('Invalid response from N2YO API');
  }

  return response.data.positions;
}

async function fetchWithRetry(id: string) {
  let lastErr: any;
  for (let attempt = 1; attempt <= RETRY_DELAYS_MS.length + 1; attempt++) {
    try {
      return await fetchN2yoLocations(id);
    } catch (err: any) {
      lastErr = err;
      const status = err?.response?.status;
      if (status && status >= 400 && status < 500) break; // Client error (e.g., bad API key)
      if (attempt <= RETRY_DELAYS_MS.length) {
        const delay = RETRY_DELAYS_MS[attempt - 1];
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastErr;
}

async function findStaleSatellites(now: Date): Promise<SatelliteConfig[]> {
  const docs = await SatellitePositions.find({
    id: { $in: SATELLITE_CONFIGS.map((c) => c.id) },
  }).select('id lastFetched windowEnd').lean();
  
  const docById = new Map(docs.map((d: any) => [d.id, d]));

  return SATELLITE_CONFIGS.filter((cfg) => {
    const doc = docById.get(cfg.id);
    if (!doc) return true;
    const ageOk = now.getTime() - new Date(doc.lastFetched).getTime() <= SYNC_TTL_MS;
    const tailOk = new Date(doc.windowEnd).getTime() - now.getTime() > STALE_TAIL_MS;
    return !(ageOk && tailOk);
  });
}

export const ensureFreshSatellites = async () => {
  await connectDB();
  const now = new Date();
  const stale = await findStaleSatellites(now);
  if (stale.length === 0) return;

  console.log(`🛰️  [N2YO_SYNC] Refreshing ${stale.length} satellite(s)`);

  for (const cfg of stale) {
    try {
      const positions = await fetchWithRetry(cfg.id);
      
      const out: ISatelliteSample[] = [];
      for (let i = 0; i < positions.length; i += cfg.sampleStride) {
        const p = positions[i];
        const date = new Date(p.timestamp * 1000); // N2YO returns UNIX epoch in seconds
        const { x, y, z } = geodeticToECEF(p.satlatitude, p.satlongitude, p.sataltitude);
        
        out.push({
          t: date,
          x, y, z,
          lat: p.satlatitude,
          lon: p.satlongitude,
          radial: p.sataltitude,
        });
      }

      const start = out[0].t;
      const end = out[out.length - 1].t;

      await SatellitePositions.updateOne(
        { id: cfg.id },
        {
          $set: {
            name: cfg.name,
            coordinateSystem: 'GEO',
            windowStart: start,
            windowEnd: end,
            samples: out,
            lastFetched: now,
            lastError: null,
          },
        },
        { upsert: true }
      );
    } catch (error: any) {
      console.warn(`💥 [N2YO_SYNC] Failed ${cfg.id}: ${error?.message || 'unknown'}`);
      await SatellitePositions.updateOne(
        { id: cfg.id },
        {
          $set: {
            lastFetched: now,
            lastError: error?.code || error?.message || 'fetch failed',
          },
          $setOnInsert: {
            name: cfg.name,
            coordinateSystem: 'GEO',
            windowStart: now,
            windowEnd: now,
            samples: [],
          },
        },
        { upsert: true }
      );
    }
  }
};

export const getSatellitePositions = async (ids?: string[]) => {
  await connectDB();
  const filter = ids?.length ? { id: { $in: ids } } : { id: { $in: SATELLITE_CONFIGS.map((c) => c.id) } };
  const docs = await SatellitePositions.find(filter).select('-_id -__v').lean();

  const now = Date.now();
  return docs.map((doc: any) => ({
    ...doc,
    stale: doc.lastError != null || (doc.windowEnd && new Date(doc.windowEnd).getTime() < now),
    displayName: CONFIG_BY_ID.get(doc.id)?.name ?? doc.name,
  }));
};