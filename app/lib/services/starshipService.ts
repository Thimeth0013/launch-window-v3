// app/lib/services/starshipService.ts
//
// Wraps GET /2.3.0/dashboard/starship/. The response is cached server-side
// in MongoDB (singleton `StarshipDashboard` doc, separate collection). The
// service refetches from TSD only when the cached doc is missing or older
// than STARSHIP_REFRESH_TTL_MS. Starship-related data doesn't change
// minute-to-minute, so a 30-min TTL keeps the dashboard fresh without
// dominating the 15-call/hour TSD budget.

import axios from 'axios';
import connectDB from '../db/mongodb';
import StarshipDashboard from '../db/models/StarshipDashboard';

const STARSHIP_DASHBOARD_URL = 'https://ll.thespacedevs.com/2.3.0/dashboard/starship/';
const STARSHIP_REFRESH_TTL_MS = 30 * 60 * 1000;

export interface StarshipUpdate {
  id: number;
  profile_image?: string;
  comment: string;
  info_url?: string;
  created_by: string;
  created_on: string;
}

export interface StarshipStream {
  title: string;
  description?: string;
  image?: string;
  url: string;
}

export interface StarshipVehicle {
  id: number;
  url?: string;
  flight_proven?: boolean;
  serial_number?: string;
  is_placeholder?: boolean;
  status?: { id?: number; name?: string };
  image?: { image_url?: string; thumbnail_url?: string };
  details?: string;
  successful_landings?: number;
  attempted_landings?: number;
  flights?: number;
  last_launch_date?: string;
  first_launch_date?: string;
  fastest_turnaround?: string;
  launcher_config?: {
    id?: number;
    name?: string;
    full_name?: string;
    variant?: string;
  };
}

export interface StarshipOrbiter {
  id: number;
  url?: string;
  name?: string;
  serial_number?: string;
  is_placeholder?: boolean;
  image?: { image_url?: string; thumbnail_url?: string };
  in_space?: boolean;
  time_in_space?: string;
  time_docked?: string;
  flights_count?: number;
  mission_ends_count?: number;
  status?: { id?: number; name?: string };
  description?: string;
  spacecraft_config?: { id?: number; name?: string };
  fastest_turnaround?: string;
}

export interface StarshipDashboardPayload {
  response_mode?: string;
  updates: StarshipUpdate[];
  live_streams: StarshipStream[];
  road_closures: any[];
  notices: any[];
  vehicles: StarshipVehicle[];
  orbiters: StarshipOrbiter[];
  upcoming: { launches: any[]; events: any[] };
  previous: { launches: any[]; events: any[] };
  lastFetchedAt?: Date;
}

// Strip the Mongoose-internal fields off a lean doc before handing it to a
// page so we don't accidentally serialise ObjectIds / __v.
function clean(doc: any): StarshipDashboardPayload | null {
  if (!doc) return null;
  const { _id, __v, createdAt, updatedAt, dashboardId, ...rest } = doc;
  return rest as StarshipDashboardPayload;
}

// Pulls a fresh dashboard from TSD and upserts the singleton cache doc.
// Returns the freshly-stored payload, or `null` if the upstream call fails
// (the page can still fall back to whatever's already in the cache).
async function fetchAndStoreStarshipDashboard(): Promise<StarshipDashboardPayload | null> {
  console.log('📡 [STARSHIP_SYNC] Fetching dashboard from TSD...');
  try {
    const res = await axios.get(STARSHIP_DASHBOARD_URL, {
      headers: { Accept: 'application/json' },
      timeout: 30000,
    });
    const data = res.data;
    if (!data) return null;

    const stored = await StarshipDashboard.findOneAndUpdate(
      { dashboardId: 'CURRENT_STARSHIP' },
      {
        ...data,
        dashboardId: 'CURRENT_STARSHIP',
        lastFetchedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    console.log('✅ [STARSHIP_SYNC] Dashboard cached');
    return clean(stored);
  } catch (err: any) {
    console.warn(`⚠️  [STARSHIP_SYNC] Fetch failed: ${err?.message || 'unknown'}`);
    return null;
  }
}

// Read the dashboard via the Mongo cache. Refetch from TSD only if the cache
// is missing or older than the TTL. Falls back to the cached doc on fetch
// failure so the page never goes blank just because TSD is down.
export async function getStarshipDashboard(): Promise<StarshipDashboardPayload | null> {
  try {
    await connectDB();
  } catch (err: any) {
    console.warn(`⚠️  [STARSHIP] DB connect failed: ${err?.message || 'unknown'}`);
    return null;
  }

  const cached: any = await StarshipDashboard.findOne({ dashboardId: 'CURRENT_STARSHIP' })
    .lean();

  const now = Date.now();
  const ageMs = cached?.lastFetchedAt
    ? now - new Date(cached.lastFetchedAt).getTime()
    : Infinity;

  if (cached && ageMs < STARSHIP_REFRESH_TTL_MS) {
    return clean(cached);
  }

  console.log(
    `🌌 [STARSHIP] Refresh needed (cached age: ${
      cached ? Math.round(ageMs / 60000) + 'min' : 'none'
    }, ttl: ${Math.round(STARSHIP_REFRESH_TTL_MS / 60000)}min)`
  );

  const fresh = await fetchAndStoreStarshipDashboard();
  return fresh || clean(cached);
}
